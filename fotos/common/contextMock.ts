import { Context } from "aws-lambda";

const contextMock: Context = {
  awsRequestId: "yo",
  callbackWaitsForEmptyEventLoop: true,
  // tslint:disable-next-line:no-empty
  done: () => { },
  // tslint:disable-next-line:no-empty
  fail: () => { },
  functionName: "blah",
  functionVersion: "gdgd",
  getRemainingTimeInMillis: () => 200,
  invokedFunctionArn: "blergh",
  logGroupName: "abc",
  logStreamName: "xyz",
  memoryLimitInMB: 2,
  // tslint:disable-next-line:no-empty
  succeed: () => { },
};
export default contextMock;
