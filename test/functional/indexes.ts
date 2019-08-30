import * as test from "tape";
import {
  IImage, IIndex, IQueryBody,
} from "../../fotos/types";
import { createIndexChangeTable, MODES } from "./createIndexChangeTable";
import formatError from "./formatError";

export default function indexesTests(setupData, api) {

  const retryStrategy = [500, 1000, 2000, 5000];

  let testImages: IImage[];
  test("query images to get testimages", (t) => {
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
        t.equal(responseBody.length >= 2, true, "at least two images in env");
        testImages = responseBody.filter((img) => img.img_key === setupData.records[1].img_key ||
          img.img_key === setupData.records[0].img_key );
        t.equal(testImages.length >= 2, true, `at least two test images - actual: ${testImages.length}`);
        t.end();
      })
      .catch(formatError);
  });

  test("get indexes, should have at least tags and people of test images", (t) => {
    // need to replace this with baseline index that we grab before tests start
    const existingIndexes = {
      people: {},
      tags: {},
    };

    let retryCount = 0;
    const retryableTest = {
      args: [setupData.apiUrl, "/indexes"],
      fn: api.get,
    };
    const retryableTestThen = (responseBody: IIndex) => {
      const changes = createIndexChangeTable(MODES.ADD, testImages, existingIndexes, responseBody);
      if (changes.valid.people.length + changes.valid.tags.length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index has ${
            changes.valid.tags.length
          } incorrectly adjusted tags and ${
            changes.valid.people.length
          } incorrectly adjusted people after ${retryCount} retries. Fail details: \n${
            JSON.stringify(changes.valid, null, 2)
          }`);
          t.end();
        }
      } else {
        t.equal(
          changes.valid.tags.length,
          0,
          `all tags adjustments are correct (incorrect: ${
            changes.valid.tags.length
          })`,
        );
        t.equal(
          changes.valid.people.length,
          0,
          `all people adjustments are correct (incorrect: ${
            changes.valid.people.length
          }).`,
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
