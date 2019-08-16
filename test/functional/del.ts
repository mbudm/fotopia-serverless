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

  test("get indexes should return an index object with 0 counts for ppl and tags matching test data", (t) => {
    api
      .get(setupData.apiUrl, "/indexes")
      .then((responseBody: IIndex) => {
        const nonZeroTags = Object.keys(responseBody.tags).filter((tag) => responseBody.tags[tag] !== 0);
        t.equal(
          nonZeroTags,
          0,
          "all tags are 0 counts",
        );
        const nonZeroPeople = Object.keys(responseBody.people).filter((p) => responseBody.people[p] !== 0);
        t.equal(
          nonZeroPeople,
          0,
          "all ppl are 0 counts",
        );
        t.end();
      })
      .catch(formatError);
  });
}
