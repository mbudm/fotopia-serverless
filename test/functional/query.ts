import * as test from "tape";
import { IImage, IQueryBody, IQueryResponse, IQueryDBResponseItem } from "../../fotos/types";
import formatError from "./formatError";
import { FUNC_TEST_PREFIX } from "./constants";

export default function queryTests(setupData, api) {

  const CLIENT_ID = `${FUNC_TEST_PREFIX} - query.ts`
  let imageWithFourPeople: IQueryDBResponseItem | undefined;

  test("query all", (t) => {
    t.plan(2);

    const query: IQueryBody = {
      clientId: CLIENT_ID,
      criteria: {
        people: [],
        tags: [],
      },
      from: setupData.startTime,
      to: Date.now(),
      username: setupData.username,
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody: IQueryResponse) => {
        t.ok(responseBody.items.find((rec) => rec.img_key === setupData.records[0].img_key), "image one found");
        imageWithFourPeople = responseBody.items.find((rec) => rec.img_key === setupData.records[1].img_key);
        t.ok(imageWithFourPeople, "image with four people found");
      })
      .catch(formatError);
  });

  test("query by tag only", (t) => {
    t.plan(3);

    const query: IQueryBody  = {
      clientId: CLIENT_ID,
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
      .then((responseBody: IQueryResponse) => {
        t.equal(responseBody.items.length, 1);
        t.ok(responseBody.items.find((rec) => rec.img_key === setupData.images[0].key), "image one found");
        t.notOk(responseBody.items.find((rec) => rec.img_key === setupData.images[1].key), "image w four people not found");
      })
      .catch(formatError);
  });

}
