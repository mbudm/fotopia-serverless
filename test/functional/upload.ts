import * as fs from "fs";
import * as test from "tape";
import { ISetupData } from "../types";
import formatError from "./formatError";

export default function uploadTests(setupData: ISetupData, upload: any) {
  test("upload image two - don't create as this just forces storage to get creds... idk why", (t) => {
    t.plan(1);
    const object = fs.createReadStream(setupData.images[2].path);
    upload(setupData.images[2].key, object, {
      contentType: "image/jpeg",
    })
      .then((responseBody: any) => {
        t.equal(responseBody.key, setupData.images[2].key);
      })
      .catch(formatError);
  });

  test("upload image one", (t) => {
    t.plan(1);
    const object = fs.createReadStream(setupData.images[0].path);
    upload(setupData.images[0].key, object, {
      contentType: "image/jpeg",
    })
      .then((responseBody: any) => {
        t.equal(responseBody.key, setupData.images[0].key);
      })
      .catch(formatError);
  });

  test("upload image with four ppl", (t) => {
    t.plan(1);
    const object = fs.createReadStream(setupData.images[1].path);
    upload(setupData.images[1].key, object, {
      contentType: "image/jpeg",
    })
      .then((responseBody: any) => {
        t.equal(responseBody.key, setupData.images[1].key);
      })
      .catch(formatError);
  });
}
