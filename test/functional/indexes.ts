import * as test from "tape";
import {
  IIndex,
} from "../../fotos/types";
import formatError from "./formatError";

export default function indexesTests(setupData, api) {

  const retryStrategy = [500, 1000, 2000, 5000];

  test("get indexes, should have at least 5 people and 10 tags", (t) => {
    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/indexes"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IIndex) => {
      if (Object.keys(responseBody.tags).length < 10 || Object.keys(responseBody.people).length < 5) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index has ${
            Object.keys(responseBody.tags).length
          } tags and ${
            Object.keys(responseBody.people).length
          } people after ${retryCount} retries`);
          t.end();
        }
      } else {
        t.equal(
          Object.keys(responseBody.tags).length  >= 10,
          true,
          `tags length of ${Object.keys(responseBody.tags).length} - tags from two images`,
        );
        t.equal(
          Object.keys(responseBody.people).length  >= 5,
          true,
          `people length of ${
            Object.keys(responseBody.people).length
          } - at least each person from image one and image with 4 people`,
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
