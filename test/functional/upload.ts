import * as fs from "fs";
import * as test from "tape";
import { ISetupData } from "../types";
import formatError from "./formatError";

export default function uploadTests(setupData: ISetupData, upload: any) {

  test("upload image one", (t) => {
    const object = fs.createReadStream(setupData.images[0].path);
    upload(setupData.images[0].key, object, {
      contentType: "image/jpeg",
    })
      .then((responseBody: any) => {
        t.ok(responseBody.ETag, "put object responsehas an ETag");
        t.end();
      })
      .catch(formatError);
  });

  test("upload image with four ppl", (t) => {
    const object = fs.createReadStream(setupData.images[1].path);
    upload(setupData.images[1].key, object, {
      contentType: "image/jpeg",
    })
      .then((responseBody: any) => {
        t.ok(responseBody.ETag, "put object responsehas an ETag");
        t.end();
      })
      .catch(formatError);
  });
}
