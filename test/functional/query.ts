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

  test("query by tag and person", (t) => {
    t.plan(2);
    const query: IQueryBody = {
      criteria: {
        people: imageWithFourPeople!.people!,
        tags: ["yellow"],
      },
      from: setupData.startTime,
      to: Date.now(),
    };

    api.post(setupData.apiUrl, "/query", {
      body: query,
    })
      .then((responseBody) => {
        t.notOk(responseBody.find((rec) => rec.img_key === setupData.images[0].key), "image one not found");
        t.ok(responseBody.find((rec) => rec.img_key === imageWithFourPeople!.img_key), "image with four people found");
      })
      .catch(formatError);
  });

  test("query by tag only", (t) => {
    t.plan(3);

    const query = {
      criteria: {
        tags: [setupData.uniqueTag],
      },
      from: "2004-04-04",
      to: "2017-11-02",
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

  test("query by person only", (t) => {
    t.plan(1);

    const query: IQueryBody = {
      criteria: {
        people: imageWithFourPeople!.people!,
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
        t.equal(responseBody.length, 1);
        t.notOk(responseBody.find((rec) => rec.img_key === setupData.images[0].key), "image one not found");
        t.ok(responseBody.find((rec) => rec.img_key === imageWithFourPeople!.img_key), "image with four people found");
      })
      .catch(formatError);
  });
}
