export class DeleteRecordError extends Error {
  public code: string;
  public raw: string;
  constructor(e, ddbParams) {
    super(e);
    this.raw = e;
    this.code = e.code;
    const id = ddbParams && ddbParams.Key && ddbParams.Key.id;
    const username = ddbParams && ddbParams.Key && ddbParams.Key.username;
    const table = ddbParams && ddbParams.TableName;
    this.message = `DeleteRecordError: ${e.message} id: ${id}, username: ${username} table: ${table}`;
    Error.captureStackTrace(this, DeleteRecordError);
  }
}
