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
        t.ok(responseBody, `queried all and found ${responseBody.length} images`);
        images = responseBody;
        t.end();
      })
      .catch(formatError);
  });

  test("delete all images", (t) => {
    Promise.all(images.map((img) => {
      const apiPath = getEndpointPath(img);
      return api.del(setupData.apiUrl, apiPath);
    }))
      .then((responseBodies) => {
        t.equal(responseBodies.length, images.length, "resolved promises same length as images");
        t.end();
      })
      .catch(formatError);
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

  test("get people should return no results", (t) => {
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

  test("get indexes should return an empty index object", (t) => {
    const emptyIndex: IIndex = {
      people: {},
      tags: {},
    };

    api
      .get(setupData.apiUrl, "/indexes")
      .then((responseBody: IIndex) => {
        t.deepEqual(
          responseBody,
          emptyIndex,
          "all tags and people are removed",
        );
        t.end();
      })
      .catch(formatError);
  });
}
