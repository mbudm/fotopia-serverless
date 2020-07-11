import * as test from "tape";
import { IQueryBody, IQueryDBResponseItem, IQueryResponse } from "../../fotos/types";
import { FUNC_TEST_PREFIX } from "./constants";
import formatError from "./formatError";

export default function queryTests(setupData, api) {

  const CLIENT_ID = `${FUNC_TEST_PREFIX} - query.ts`;
  let imageWithFourPeople: IQueryDBResponseItem | undefined;

  const retryStrategy = [500, 1000, 2000, 5000, 10000];

  test("query all", (t) => {
    const query: IQueryBody = {
      breakDateRestriction: true,
      clientId: CLIENT_ID,
      criteria: {
        people: [],
        tags: [],
      },
      from: 0,
      to: Date.now(),
      username: setupData.username,
    };
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/query", {
        body: query,
      }],
      fn: api.post,
    };
    const retryableTestThen = (responseBody: IQueryResponse) => {
      const imageOne = responseBody.items.find((rec) => rec.img_key === setupData.records[0].img_key);
      imageWithFourPeople = responseBody.items.find((rec) => rec.img_key === setupData.records[1].img_key);

      if (!imageOne || !imageWithFourPeople) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - both test images are not queried after ${retryCount} retries - ${JSON.stringify(responseBody.items.map((item) => item.img_key), null, 2)}`);
          t.end();
        }
      } else {
        t.ok(responseBody.items.find((rec) => rec.img_key === setupData.records[0].img_key), "image one found");
        t.ok(imageWithFourPeople, "image with four people found");
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

  test("query by tag only", (t) => {
    t.plan(3);

    const query: IQueryBody  = {
      breakDateRestriction: true,
      clientId: CLIENT_ID,
      criteria: {
        people: [],
        tags: [setupData.uniqueTag],
      },
      from: 0,
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
