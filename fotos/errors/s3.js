export class GetObjectError extends Error {
  constructor(e, key, bucket) {
    super(e);
    this.raw = e;
    this.code = e.code;
    this.message = `GetObjectError: ${e.message} key: ${key}, bucket: ${bucket}`;
    Error.captureStackTrace(this, GetObjectError);
  }
}

export class PutObjectError extends Error {
  constructor(e, key, bucket) {
    super(...e);
    this.raw = e;
    this.code = e.code;
    this.message = `PutObjectError: ${e.message} key: ${key}, bucket: ${bucket}`;
    Error.captureStackTrace(this, PutObjectError);
  }
}
