import * as test from "tape";

import {
  IImage,
  IIndex,
  IIndexDictionary,
  IIndexUpdate,
  IPerson,
  IQueryBody,
} from "../../fotos/types";
import { createIndexSubtract } from "./createIndexAdjustment";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function deleteAllNotJustTestData(setupData, api) {

  const retryStrategy = [500, 1000, 2000, 5000];
  let images: IImage[];

  test("query all to get all images", (t) => {
    const query: IQueryBody = {
      criteria: {
        people: [],
        tags: [],
      },
      from: 0,
      to: Date.now(),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody: IImage[]) => {
        if (Array.isArray(responseBody)) {
          t.ok(Array.isArray(responseBody), "query response is an array");
          t.ok(responseBody, `queried all and found ${responseBody.length} images`);
          images = responseBody;
          t.end();
        } else {
          t.notOk(Array.isArray(responseBody), "query response is a string - no results");
          images = [];
          t.end();
        }
      })
      .catch(formatError);
  });
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

  let existingPeople: IPerson[];
  test("get existing people", (t) => {
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        t.ok(responseBody, "Existing people retrieved");
        existingPeople = responseBody;
        t.end();
      })
      .catch(formatError);
  });

  let deleteImages: IImage[];
  test("delete all images in the env!!!", (t) => {
    deleteImages = images;

    if (deleteImages.length > 0) {
      Promise.all(deleteImages.map((img) => {
        const apiPath = getEndpointPath(img);
        return api.del(setupData.apiUrl, apiPath);
      }))
        .then((responseBodies) => {
          t.equal(
            responseBodies.length,
            deleteImages.length,
            `resolved promises same length as delete images (${deleteImages.length})`);
          t.end();
        })
        .catch(formatError);
    } else {
      t.end();
    }
  });

  test("query all should return no results matching test data", (t) => {
    const query: IQueryBody = {
      criteria: {
        people: [],
        tags: [],
      },
      from: 0,
      to: Date.now(),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        if (Array.isArray(responseBody)) {
          const matchingResults = responseBody.filter((img) => {
            return setupData.records.includes((rec) => rec.img_key === img.img_key);
          });
          t.equal(matchingResults.length, 0, "No results match test images");
        } else {
          const resultAsString = Array.isArray(responseBody) ? "" : responseBody;
          t.ok(resultAsString.includes("No items found"));
        }
        t.end();
      })
      .catch(formatError);
  });

  test("get people should return no results with the deleted test image ids", (t) => {
    const imageIds =  deleteImages.map((img) => img.id);
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
          t.fail(`Failed - people with deleted image ids: ${
            peopleWithDeletedImageIds.length
          }  after ${retryCount} retries. Deleted images ids: ${
            imageIds.toString()
          }, people with deleted images:  ${
            peopleWithDeletedImageIds.map((p) => p.id).toString()
          }.`);
          t.end();
        }
      } else {
        t.equal(
          peopleWithDeletedImageIds.length,
          0,
          `all deleted images (${
            imageIds.toString()
          }) have been removed from people ${
            responseBody.length
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

  test("get indexes should return an index object with adjusted counts matching deleted test images", (t) => {
    const testImagesPeople = deleteImages.reduce((accum, img) => accum.concat(img.people!), [] as string[]);
    const testImagesTags = deleteImages.reduce((accum, img) => accum.concat(img.tags!), [] as string[]);

    const indexAdjustments = {
      people: createIndexSubtract(testImagesPeople),
      tags: createIndexSubtract(testImagesTags),
    };

    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/indexes"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IIndex) => {
      const incorrectAdjustmentTags = Object.keys(indexAdjustments.tags)
          .filter((tag) => responseBody.tags[tag] !==  existingIndexes.tags[tag] + indexAdjustments.tags[tag]);
      const incorrectAdjustmentPeople = Object.keys(indexAdjustments.people)
        .filter((p) => responseBody.people[p] !==  existingIndexes.people[p] + indexAdjustments.people[p]);

      if (incorrectAdjustmentTags.length > 0 || incorrectAdjustmentPeople.length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index with incorrect adjustments for tags: ${
            incorrectAdjustmentTags.length
          } and people: ${
            incorrectAdjustmentPeople.length
          }after ${retryCount} retries.`);
          t.end();
        }
      } else {
        t.equal(
          incorrectAdjustmentTags.length,
          0,
          `all tags adjustments are correct. Checked ${Object.keys(indexAdjustments.tags).length} adjustments`,
        );
        t.equal(
          incorrectAdjustmentPeople.length,
          0,
          `all people adjustments are correct. Checked ${Object.keys(indexAdjustments.people).length} adjustments`,
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

  test("Update people to be an empty array", (t) => {
    const people: IPerson[] = [];
    const body = {
      people,
    };
    api
      .put(setupData.apiUrl, "/people/update", {
        body,
      })
      .then((responseBody) => {
        t.ok(responseBody, "people updated to [] ok");
        t.end();
      })
      .catch(formatError);
  });

  const getIndexUpdate = (indexDictionary: IIndexDictionary) => {
    const indexUpdate = {};
    Object.keys(indexDictionary).forEach((key) => {
      indexUpdate[key] = -indexDictionary[key];
    });
    return indexUpdate;
  };

  test("Update indexes to be an empty IIndex", (t) => {
    const indexUpdate: IIndexUpdate = {
      people: getIndexUpdate(existingIndexes.people),
      tags: getIndexUpdate(existingIndexes.tags),
    };
    const body = {
      indexUpdate,
    };
    api
      .put(setupData.apiUrl, "/indexes/update", {
        body,
      })
      .then((responseBody) => {
        t.ok(responseBody, `index updated to empty obj ok - updateObj: ${JSON.stringify(indexUpdate)}`);
        t.end();
      })
      .catch(formatError);
  });

  test("get indexes, check it is actually reset", (t) => {
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/indexes"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IIndex) => {
      if (Object.keys(responseBody.tags).length > 0 || Object.keys(responseBody.people).length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index has ${
            Object.keys(responseBody.tags).length
          } tags and ${
            Object.keys(responseBody.people).length
          } people after ${retryCount} retries`);
          t.end();
        }
      } else {
        t.equal(
          Object.keys(responseBody.tags).length,
          0,
          `tags length of ${Object.keys(responseBody.tags).length} - tags from two images`,
        );
        t.equal(
          Object.keys(responseBody.people).length,
          0,
          `people length of ${
            Object.keys(responseBody.people).length
          } - at least each person from image one and image with 4 people`,
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
