import * as test from "tape";
import { ICreateBody } from "../../fotos/types";
import {
  ISetupData,
} from "../types";
import formatError from "./formatError";

export default function createTests(setupData: ISetupData, api: any) {
  test("create image one meta data", (t) => {
    t.plan(1);
    const body: ICreateBody = setupData.records[0];
    api.post(setupData.apiUrl, "/create", {
      body,
    })
      .then((responseBody: any) => {
        t.equal(
          responseBody.img_key, setupData.records[0].img_key,
          `image one key is ${responseBody.img_key} id is ${responseBody.id}`);
      })
      .catch(formatError);
  });

  test("create image with four people meta data", (t) => {
    t.plan(1);
    const body: ICreateBody = setupData.records[1];
    api.post(setupData.apiUrl, "/create", {
      body,
    })
      .then((responseBody: any) => {
        t.equal(responseBody.img_key, setupData.records[1].img_key);
      })
      .catch(formatError);
  });
}
