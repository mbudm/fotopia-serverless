import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
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
    api
      .get(setupData.apiUrl, "/people")
      .then((responseBody: IPerson[]) => {
        t.equal(
          responseBody.length,
          0,
          "all people have been removed",
        );
        t.end();
      })
      .catch(formatError);
  });

  test("get indexes should return an index object with 0 counts for ppl and tags matching test data", (t) => {

    api
      .get(setupData.apiUrl, "/indexes")
      .then((responseBody: IIndex) => {
        const nonZeroTags = Object.keys(responseBody.tags).filter((tag) => responseBody.tags[tag] !== 0);
        t.equal(
          nonZeroTags.length,
          0,
          "all tags are 0 counts",
        );
        const nonZeroPeople = Object.keys(responseBody.people).filter((p) => responseBody.people[p] !== 0);
        t.equal(
          nonZeroPeople.length,
          0,
          "all ppl are 0 counts",
        );
        t.end();
      })
      .catch(formatError);
  });
}
