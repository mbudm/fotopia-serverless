import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
import { createIndexAdjustment } from "./createIndexAdjustment";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function deleteAllTests(setupData, api) {
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

  test("delete all images", (t) => {
    if (Array.isArray(images) && images.length > 0) {
      Promise.all(images.map((img) => {
        const apiPath = getEndpointPath(img);
        return api.del(setupData.apiUrl, apiPath);
      }))
        .then((responseBodies) => {
          t.equal(responseBodies.length, images.length, "resolved promises same length as images");
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
      from: 0,
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

  test("get people should return no results with the deleted image ids", (t) => {
    // const peopleToCheck = images.reduce((accum, img) =>
    //   Array.isArray(img.people) ? accum.concat(img.people) : accum,
    // [] as string[]);
    const imageIds =  images.map((img) => img.id);
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        const peopleWithDeletedImageIds = responseBody.filter((p) => {
          return p.faces.filter((f) => f.ExternalImageId &&
            imageIds.includes(f.ExternalImageId));
        });
        t.equal(
          peopleWithDeletedImageIds.length,
          0,
          "all deleted images have been removed from people",
        );
        t.end();
      })
      .catch(formatError);
  });

  test("get indexes should return an index object with adjusted counts matching deleted images", (t) => {
    const testImagesPeople = images.reduce((accum, img) => accum.concat(img.people!), [] as string[]);
    const testImagesTags = images.reduce((accum, img) => accum.concat(img.tags!), [] as string[]);

    const indexAdjustments = {
      people: createIndexAdjustment(testImagesPeople),
      tags: createIndexAdjustment(testImagesTags),
    };
    api
      .get(setupData.apiUrl, "/indexes")
      .then((responseBody: IIndex) => {
        const incorrectAdjustmentTags = Object.keys(indexAdjustments.tags)
          .filter((tag) => responseBody.tags[tag] !==  existingIndexes.tags[tag] + indexAdjustments.tags[tag]);
        t.equal(
          incorrectAdjustmentTags.length,
          0,
          `all tags adjustments are correct. Checked ${Object.keys(indexAdjustments.tags).length} adjustments`,
        );
        const incorrectAdjustmentPeople = Object.keys(indexAdjustments.people)
          .filter((p) => responseBody.people[p] !==  existingIndexes.people[p] + indexAdjustments.people[p]);
        t.equal(
          incorrectAdjustmentPeople.length,
          0,
          `all people adjustments are correct. Checked ${Object.keys(indexAdjustments.people).length} adjustments`,
        );
        t.end();
      })
      .catch(formatError);
  });
}
