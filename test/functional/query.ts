import * as test from "tape";
import { IImage, IQueryBody } from "../../fotos/types";
import formatError from "./formatError";

export default function queryTests(setupData, api) {
  let imageWithFourPeople: IImage | undefined;

  test("query all", (t) => {
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
        t.ok(responseBody.find((rec) => rec.img_key === setupData.records[0].img_key), "image one found");
        imageWithFourPeople = responseBody.find((rec) => rec.img_key === setupData.records[1].img_key);
        t.ok(imageWithFourPeople, "image with four people found");
      })
      .catch(formatError);
  });

  test("query by tag only", (t) => {
    t.plan(3);

    const query: IQueryBody  = {
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
        t.ok(responseBody.find((rec) => rec.img_key === setupData.images[0].key), "image one found");
        t.notOk(responseBody.find((rec) => rec.img_key === setupData.images[1].key), "image w four people not found");
      })
      .catch(formatError);
  });

  // Query by person tests removed as they require that new people are
  // created with the creation of the mock images. This involves an additon to the delete
  // lambda, removing faces from rekognition collection and from people records.
  // Cascading effects include:
  // - person removal if no faces left in that person
  // - removal of person in other images
  // - removal of face similarity in images face data...
}
