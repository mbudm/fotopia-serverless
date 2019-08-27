import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
import { createIndexAdjustment } from "./createIndexAdjustment";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";
import { getIncorrectIndexUpdates } from "./getIncorrectIndexUpdates";

export default function deleteTests(setupData, api) {

  const retryStrategy = [500, 1000, 2000, 5000];
  let existingIndexes: IIndex;

  test("get existing indexes", (t) => {
    api
      .get(setupData.apiUrl, "/indexes")
      .then((responseBody: IIndex) => {
        t.ok(responseBody, "Indexes retrieved");
        existingIndexes = responseBody;
        t.end();
      })
      .catch(formatError);
  });

  let imageOne: IImage;

  test("query image one by unique tag", (t) => {
    const query: IQueryBody = {
      criteria: {
        people: [],
        tags: [setupData.uniqueTag],
      },
      from: setupData.startTime,
      to: Date.now(),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.length, 1);
        imageOne = responseBody[0];
        t.end();
      })
      .catch(formatError);
  });

  test("delete imageOne", (t) => {
    const apiPath = getEndpointPath(imageOne);
    api.del(setupData.apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.username, setupData.username);
        t.equal(responseBody.id, imageOne.id);
        t.end();
      })
      .catch(formatError);
  });

  let imagesWithFourPeople: IImage[];
  test("query image w four people by querying all", (t) => {
    const query: IQueryBody = {
      criteria: {
        people: [],
        tags: [],
      },
      from: setupData.startTime,
      to: Date.now(),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.length, 1);
        imagesWithFourPeople = responseBody.filter((img) => img.img_key === setupData.records[1].img_key);
        t.end();
      })
      .catch(formatError);
  });

  test("delete all images w 4 people", (t) => {
    if (Array.isArray(imagesWithFourPeople) && imagesWithFourPeople.length > 0) {
      Promise.all(imagesWithFourPeople.map((img) => {
        const apiPath = getEndpointPath(img);
        return api.del(setupData.apiUrl, apiPath);
      }))
        .then((responseBodies) => {
          t.equal(responseBodies.length, imagesWithFourPeople.length, "resolved promises same length as images");
          t.end();
        })
        .catch(formatError);
    } else {
      t.end();
    }
  });

  test("query all should return no results", (t) => {
    const query: IQueryBody = {
      criteria: {
        people: [],
        tags: [],
      },
      from: setupData.startTime,
      to: Date.now(),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        const resultAsString = Array.isArray(responseBody) ? "" : responseBody;
        t.ok(resultAsString.includes("No items found"));
        t.end();
      })
      .catch(formatError);
  });

  test("get people should return no results with the test image ids", (t) => {
    const imageIds = [imageOne.id].concat(imagesWithFourPeople.map((i) => i.id));
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        const peopleWithDeletedImageIds = responseBody.filter((p) => {
          const facesWithDeletedImageId = p.faces.filter(
            (f) => f.ExternalImageId && imageIds.includes(f.ExternalImageId),
          );
          return facesWithDeletedImageId.length > 0;
        });
        t.equal(
          peopleWithDeletedImageIds.length,
          0,
          `all deleted images (${imageIds.toString()}) have been removed from people`,
        );
        t.end();
      })
      .catch(formatError);
  });

  test("createIndexAdjustment should show correct minus vales", (t) => {
    const testArr = ["bob", "amelia", "amelia"];
    const result = createIndexAdjustment(testArr);

    t.equal(result.bob, -1, "minus 1 for bob");
    t.equal(result.amelia, -2, "minus 2 for amelia");
    t.end();
  });

  const getItemsInImages = (key: string, imgArr: IImage[]): string[] => {
    return imgArr.reduce((accum, img) => accum.concat(img[key]), [] as string[]);
  };

  test("getItemsInImages should collate key and not dedupe", (t) => {
    const testImageArr: IImage[] = [{
      birthtime: 123,
      group: "blue",
      id: "abc",
      img_key: "one.jpg",
      meta: {
        height: 200,
        width: 300,
      },
      people: ["bob", "amelia"],
      tags: ["car", "sun"],
      userIdentityId: "f23",
      username: "fred",
    }, {
      birthtime: 456,
      group: "blue",
      id: "def",
      img_key: "one.jpg",
      meta: {
        height: 200,
        width: 300,
      },
      people: ["cynthia", "amelia"],
      tags: ["car", "people"],
      userIdentityId: "f23",
      username: "fred",
    }];
    const peopleResult = getItemsInImages("people", testImageArr);
    const tagsResult = getItemsInImages("tags", testImageArr);

    t.deepEqual(peopleResult, ["bob", "amelia", "cynthia", "amelia"], "concatenated the people");
    t.deepEqual(tagsResult, ["car", "sun", "car", "people"], "concatenated the tags");
    t.end();
  });

  test("get indexes should return an index object with 0 counts for ppl and tags matching test data", (t) => {
    const allImages: IImage[] = [imageOne].concat(imagesWithFourPeople);
    const testImagesPeople = getItemsInImages("people", allImages);
    const testImagesTags = getItemsInImages("tags", allImages);
    const indexAdjustments = {
      people: createIndexAdjustment(testImagesPeople),
      tags: createIndexAdjustment(testImagesTags),
    };

    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/indexes"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IIndex) => {
      const incorrectUpdates = getIncorrectIndexUpdates(indexAdjustments, existingIndexes, responseBody);

      if (incorrectUpdates.tags.length + incorrectUpdates.people.length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index has ${
            incorrectUpdates.tags.length
          } incorrectly adjusted tags and ${
            incorrectUpdates.people.length
          } incorrectly adjusted people after ${retryCount} retries.`);
          t.end();
        }
      } else {
        t.equal(
          incorrectUpdates.tags.length,
          0,
          `all tags adjustments are correct (incorrect: ${
            incorrectUpdates.tags.length
          }). Checked ${Object.keys(indexAdjustments.tags).length} adjustments`,
        );
        t.equal(
          incorrectUpdates.people.length,
          0,
          `all people adjustments are correct (incorrect: ${
            incorrectUpdates.people.length
          }). Checked ${Object.keys(indexAdjustments.people).length} adjustments`,
        );
        t.end();
      }
    };
    const retry = () => {
      retryableTest.fn.apply(this, retryableTest.args)
        .then(retryableTestThen)
        .catch(formatError);
    };

    retry();

  });
}
