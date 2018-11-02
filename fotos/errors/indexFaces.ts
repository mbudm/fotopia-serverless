export class IndexFacesError extends Error {
  public code: string;
  public raw: string;
  constructor(e, params) {
    super(...e);
    this.raw = e;
    this.code = e.code;
    this.message = `IndexFacesError: ${e.message}
    key: ${params.Image.S3Object.Name}, bucket: ${params.Image.S3Object.Bucket}`;
    Error.captureStackTrace(this, IndexFacesError);
  }
}
