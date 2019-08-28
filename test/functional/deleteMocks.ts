import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
import { createIndexSubtract } from "./createIndexAdjustment";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";
import { getIncorrectIndexUpdates } from "./getIncorrectIndexUpdates";

export default function deleteAllTestData(setupData, api) {

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
  test("delete all test images", (t) => {
    const setupDataImgKeys = setupData.records.map((rec) => rec.img_key);
    deleteImages = Array.isArray(images) ? images.filter((img) => {
      return setupDataImgKeys.includes(img.img_key);
    }) : [] ;

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
          t.fail(`Failed - people w deleted img ids: ${peopleWithDeletedImageIds.length} after ${retryCount} retries`);
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
          `all tags adjustments are correct (found ${
            incorrectUpdates.tags.length}
          ). Checked ${Object.keys(indexAdjustments.tags).length} adjustments`,
        );

        t.equal(
          incorrectUpdates.people.length,
          0,
          `all people adjustments are correct(found ${
            incorrectUpdates.people.length}
          ). Checked ${Object.keys(indexAdjustments.people).length} adjustments`,
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
