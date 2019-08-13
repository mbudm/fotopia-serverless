export class DeleteObjectError extends Error {
  public code: string;
  public raw: string;
  constructor(e, key, bucket) {
    super(e);
    this.raw = e;
    this.code = e.code;
    this.message = `DeleteObjectError: ${e.message} key: ${key}, bucket: ${bucket}`;
    Error.captureStackTrace(this, DeleteObjectError);
  }
}
