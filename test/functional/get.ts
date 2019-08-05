import * as test from "tape";
import { IImage, IQueryBody } from "../../fotos/types";
import { ISetupData } from "../types";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function getTests(setupData: ISetupData, api: any) {
  let imageWithFourPeople: IImage | undefined;
  test("query all to get an id", (t) => {
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

  test("get an item", (t) => {
    t.plan(1);
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.get(setupData.apiUrl, apiPath)
      .then((responseBody: IImage) => {
        t.equal(responseBody.id, imageWithFourPeople!.id);
      })
      .catch(formatError);
  });
}
