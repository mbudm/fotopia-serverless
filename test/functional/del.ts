import * as test from "tape";
import { IImage, IIndex, IPerson, IQueryBody } from "../../fotos/types";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function deleteTests(setupData, api) {
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
    t.plan(2);
    const apiPath = getEndpointPath(imageOne);
    api.del(setupData.apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.username, setupData.username);
        t.equal(responseBody.id, imageOne.id);
      })
      .catch(formatError);
  });

  let imageWithFourPeople;
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
        imageWithFourPeople = responseBody[0];
        t.end();
      })
      .catch(formatError);
  });

  test("delete image w 4 people", (t) => {
    t.plan(2);
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.del(setupData.apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.username, setupData.username);
        t.equal(responseBody.id, imageWithFourPeople.id);
      })
      .catch(formatError);
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
