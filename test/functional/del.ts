import * as test from "tape";
import { IImage, IQueryBody } from "../../fotos/types";
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
}
