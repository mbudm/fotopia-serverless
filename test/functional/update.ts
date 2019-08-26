import * as test from "tape";
import { IImage, IQueryBody } from "../../fotos/types";
import { ISetupData } from "../types";
import formatError from "./formatError";
import getEndpointPath from "./getEndpointPath";

export default function updateTests(setupData: ISetupData, api) {
  let imageWithFourPeople: IImage | undefined;

  // should remove this - no updates really doable from api as wipes out existing meta

  test("query all to get img with four people", (t) => {
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
        imageWithFourPeople = responseBody.find((rec) => rec.img_key === setupData.images[1].key);
        t.ok(imageWithFourPeople, "image with four people found");
        t.end();
      })
      .catch(formatError);
  });

  test("update imageWithFourPeople", (t) => {
    const updatedRecord = {
      meta: {
        newProperty: "squirrel",
      },
    };
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.put(setupData.apiUrl, apiPath, { body: updatedRecord })
      .then((responseBody) => {
        t.equal(responseBody.username, imageWithFourPeople!.username);
        t.equal(responseBody.id, imageWithFourPeople!.id);
        t.equal(responseBody.meta.newProperty, updatedRecord.meta.newProperty);
        t.end();
      })
      .catch(formatError);
  });

  test("get updated item", (t) => {
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.get(setupData.apiUrl, apiPath)
      .then((responseBody: IImage) => {
        t.equal(responseBody.id, imageWithFourPeople!.id);
        t.equal(responseBody.meta.newProperty, "squirrel", "updated data");
        t.ok(responseBody.meta.height, `meta height exists`);
        t.equal(
          responseBody.meta.height,
          imageWithFourPeople!.meta.height,
          `existing meta heigh ${responseBody.meta.height} unaffected`,
        );
        t.ok(responseBody.meta.width, `meta width exists`);
        t.equal(
          responseBody.meta.width,
          imageWithFourPeople!.meta.width,
          `existing meta width ${responseBody.meta.width} unaffected`,
        );
        t.ok(responseBody.tags!.includes(imageWithFourPeople!.tags![0]), "existing other props unaffected");
        t.end();
      })
      .catch(formatError);
  });
}
