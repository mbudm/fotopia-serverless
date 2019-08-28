import * as test from "tape";
import {
  IImage, IIndex, IQueryBody,
} from "../../fotos/types";
import { createIndexAdd } from "./createIndexAdjustment";
import formatError from "./formatError";
import { getIncorrectIndexUpdates } from "./getIncorrectIndexUpdates";
import { getItemsInImages } from "./getItemsInImages";

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
    const testImagesPeople = getItemsInImages("people", testImages);
    const testImagesTags = getItemsInImages("tags", testImages);
    const indexAdjustments = {
      people: createIndexAdd(testImagesPeople),
      tags: createIndexAdd(testImagesTags),
    };
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
      const incorrectUpdates = getIncorrectIndexUpdates(indexAdjustments, existingIndexes, responseBody);

      if (incorrectUpdates.tags.length + incorrectUpdates.people.length > 0) {
        if (retryCount < retryStrategy.length) {
          setTimeout(() => {
            retryCount++;
            t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
            retry();
          }, retryStrategy[retryCount]);
        } else {
          t.fail(`Failed - index has ${
            incorrectUpdates.tags.length
          } incorrectly adjusted tags and ${
            incorrectUpdates.people.length
          } incorrectly adjusted people after ${retryCount} retries.`);
          t.end();
        }
      } else {
        t.equal(
          incorrectUpdates.tags.length,
          0,
          `all tags adjustments are correct (incorrect: ${
            incorrectUpdates.tags.length
          }). Checked ${Object.keys(indexAdjustments.tags).length} adjustments`,
        );
        t.equal(
          incorrectUpdates.people.length,
          0,
          `all people adjustments are correct (incorrect: ${
            incorrectUpdates.people.length
          }). Checked ${Object.keys(indexAdjustments.people).length} adjustments`,
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
