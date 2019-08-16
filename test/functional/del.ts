import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
import { createIndexAdjustment } from "./createIndexAdjustment";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function deleteTests(setupData, api) {

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

  test("createIndexAdjustment should show correct minus vales", (t) => {
    const testArr = ["bob", "amelia", "amelia"];
    const result = createIndexAdjustment(testArr);

    t.equal(result.bob, -1, "minus 1 for bob");
    t.equal(result.amelia, -2, "minus 2 for amelia");
    t.end();
  });

  test("get indexes should return an index object with 0 counts for ppl and tags matching test data", (t) => {
    const testImagesPeople = imageOne.people!.concat(
      imagesWithFourPeople.reduce((accum, img) => accum.concat(img.people!), [] as string[]),
    );
    const testImagesTags = imageOne.tags!.concat(
      imagesWithFourPeople.reduce((accum, img) => accum.concat(img.tags!), [] as string[]),
    );
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
