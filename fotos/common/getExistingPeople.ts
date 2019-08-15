import { JSONParseError } from "../errors/jsonParse";
import { IPerson } from "../types";
import { getS3Params } from "./getS3Params";

export function getExistingPeople(s3, Bucket, Key): Promise<IPerson[]> {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      try {
        const s3Body = JSON.parse(s3Object.Body.toString());
        return s3Body;
      } catch (e) {
        throw new JSONParseError(e, "getExistingPeople");
      }
    })
    .catch((e) => {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        // tslint:disable-next-line:no-console
        console.log("No object found / AccessDenied - assuming empty people list");
        return [];
      }
      // tslint:disable-next-line:no-console
      console.log("Another error with get people object", e);
      throw e;
    });
}
