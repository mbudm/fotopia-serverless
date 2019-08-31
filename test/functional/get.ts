import * as test from "tape";
import { IImage, IQueryBody } from "../../fotos/types";
import { ISetupData } from "../types";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function getTests(setupData: ISetupData, api: any) {

  const retryStrategy = [300, 500, 1000, 2000, 5000];
  let imagesWithFourPeople: IImage[];
  let imagesWithOnePerson: IImage[];
  test("query all to get the test image ids", (t) => {
    t.plan(2);

    const query: IQueryBody = {
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
      .then((responseBody: IImage[]) => {
        imagesWithOnePerson = responseBody.filter((rec) => rec.img_key === setupData.records[0].img_key);
        t.ok(imagesWithOnePerson.length > 0, "image(s) with one  personfound");
        imagesWithFourPeople = responseBody.filter((rec) => rec.img_key === setupData.records[1].img_key);
        t.ok(imagesWithFourPeople.length > 0, "image(s) with four people found");
      })
      .catch(formatError);
  });

  test("get items, retry until the record has the correct people count - shows the event chain is completed", (t) => {
    const testImages = [...imagesWithOnePerson, ...imagesWithFourPeople];

    testImages.forEach((image, idx, arr) => {
      let retryCount = 0;
      const retryableTest = {
        args: [setupData.apiUrl, getEndpointPath(image)],
        fn: api.get,
      };
      const retryableTestThen = (responseBody: IImage) => {
        if (!responseBody.people || responseBody.people.length === 0) {
          if (retryCount < retryStrategy.length) {
            setTimeout(() => {
              retryCount++;
              t.comment(`Retry # ${retryCount} after ${retryStrategy[retryCount - 1]}ms`);
              retry();
            }, retryStrategy[retryCount]);
          } else {
            t.fail(`Failed - ${responseBody.img_key} people: ${responseBody.people} after ${retryCount} retries`);
            if (idx === arr.length - 1) {
              t.end();
            }
          }
        } else {
          const expectedLength = responseBody.img_key === imagesWithFourPeople[0].img_key ? 4 : 1;
          t.equal(
            responseBody.people.length,
            expectedLength,
            `image (${
              responseBody.img_key
            }) has people length of ${
              responseBody.people.length
            }`,
          );
          if (idx === arr.length - 1) {
            t.end();
          }
        }
      };
      const retry = () => {
        retryableTest.fn.apply(this, retryableTest.args)
          .then(retryableTestThen)
          .catch(formatError);
      };

      retry();
    });
  });
}
