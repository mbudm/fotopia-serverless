import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
import { FUNC_TEST_PREFIX } from "./constants";
import { createIndexSubtract } from "./createIndexAdjustment";
import { createIndexChangeTable, MODES } from "./createIndexChangeTable";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";
import { getItemsInImages } from "./getItemsInImages";

export default function deleteTests(setupData, api) {
  const CLIENT_ID = `${FUNC_TEST_PREFIX}- del.ts`;

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
      breakDateRestriction: true,
      clientId: CLIENT_ID,
      criteria: {
        people: [],
        tags: [setupData.uniqueTag],
      },
      from: 0,
      to: Date.now() + (1000 * 60 * 60),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.items.length, 1);
        imageOne = responseBody.items[0];
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
      breakDateRestriction: true,
      clientId: CLIENT_ID,
      criteria: {
        people: [],
        tags: [],
      },
      from: 0,
      to: Date.now() + (1000 * 60 * 60),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.items.length, 1);
        imagesWithFourPeople = responseBody.items.filter((img) => img.img_key === setupData.records[1].img_key);
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
      breakDateRestriction: true,
      clientId: CLIENT_ID,
      criteria: {
        people: [],
        tags: [],
      },
      from: 0,
      to: Date.now() + (1000 * 60 * 60),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.items.length, 0);
        t.end();
      })
      .catch(formatError);
  });

  test("get people should return no results with the test image ids", (t) => {
    // fails when there is another image with the person. the person is not
    // deleted and so a ref to the deleted image remains
    // so we should clean out the faces/images from the person record?
    // or just be smarter in the test and ignore the person if there are faces in other images
    // I prefer the former as dead data is going to muddy too many situations
    const imageIds = [imageOne.id].concat(imagesWithFourPeople.map((i) => i.id));

    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/people"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IPerson[]) => {
      const peopleWithDeletedImageIds = responseBody.filter((p) => {
        const facesWithDeletedImageId = p.faces.filter(
          (f) => f.ExternalImageId && imageIds.includes(f.ExternalImageId),
        );
        return facesWithDeletedImageId.length > 0;
      });
      if (peopleWithDeletedImageIds.length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - people w test img ids: ${peopleWithDeletedImageIds.length} after ${retryCount} retries`);
          t.end();
        }
      } else {
        t.equal(
          peopleWithDeletedImageIds.length,
          0,
          `all deleted images (${
            imageIds.toString()
          }) have been removed from people ${
            peopleWithDeletedImageIds.map((p) => p.id).toString()
          }`,
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

  test("createIndexSubtract should show correct minus vales", (t) => {
    const testArr = ["bob", "amelia", "amelia"];
    const result = createIndexSubtract(testArr);

    t.equal(result.bob, -1, "minus 1 for bob");
    t.equal(result.amelia, -2, "minus 2 for amelia");
    t.end();
  });

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

  test("get indexes, should not have tags and people of test images", (t) => {
    const testImages: IImage[] = [imageOne].concat(imagesWithFourPeople);
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/indexes"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IIndex) => {
      const changes = createIndexChangeTable(MODES.REMOVE, testImages, existingIndexes, responseBody);
      if (changes.valid.people.length + changes.valid.tags.length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index has ${
            changes.valid.tags.length
          } incorrectly adjusted tags and ${
            changes.valid.people.length
          } incorrectly adjusted people after ${retryCount} retries. Fail details: \n${
            JSON.stringify(changes.valid, null, 2)
          }`);
          t.end();
        }
      } else {
        t.equal(
          changes.valid.tags.length,
          0,
          `all tags adjustments are correct (incorrect: ${
            changes.valid.tags.length
          })`,
        );
        t.equal(
          changes.valid.people.length,
          0,
          `all people adjustments are correct (incorrect: ${
            changes.valid.people.length
          }).`,
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
