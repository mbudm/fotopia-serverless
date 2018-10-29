import * as test from "tape";
import * as s3 from "./getObject";

class ErrorWithCode extends Error {
  public code: string;
  constructor(e, code) {
    super(e);
    this.code = code;
    Error.captureStackTrace(this, ErrorWithCode);
  }
}

test("GetObjectError", (t) => {
  const bucket = "s3Bucket";
  const key = "s3Key";
  const errorCode = "S3NativeCode";
  const e = new ErrorWithCode("S3 native error", errorCode);
  try {
    throw new s3.GetObjectError(e, key, bucket);
  } catch (err) {
    t.equal(err.code, errorCode);
    t.equal(err.message, "GetObjectError: S3 native error key: s3Key, bucket: s3Bucket");
    t.end();
  }
});
