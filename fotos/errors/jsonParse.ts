export class JSONParseError extends Error {
  public code: string;
  public raw: string;
  constructor(e, context) {
    super(e);
    this.raw = e;
    this.code = e.code;
    this.message = `JSONParseError: ${e.message} context: ${context}`;
    Error.captureStackTrace(this, JSONParseError);
  }
}
