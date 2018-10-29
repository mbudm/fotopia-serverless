export class PutObjectError extends Error {
  public code: string;
  public raw: string;
  constructor(e, key, bucket) {
    super(...e);
    this.raw = e;
    this.code = e.code;
    this.message = `PutObjectError: ${e.message} key: ${key}, bucket: ${bucket}`;
    Error.captureStackTrace(this, PutObjectError);
  }
}
