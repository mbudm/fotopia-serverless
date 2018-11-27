import { IPerson } from "../types";
import { getS3Params } from "./getS3Params";

export function getExistingPeople(s3, Bucket, Key): Promise<IPerson[]> {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      return JSON.parse(s3Object.Body.toString());
    })
    .catch((e) => {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        // tslint:disable-next-line:no-console
        console.log("No object found / AccessDenied - assuming empty people list");
        return [];
      }
      // tslint:disable-next-line:no-console
      console.log("Another error with get people object", e);
      return { error: e, s3Params };
    });
}
