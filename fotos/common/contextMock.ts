import { Context } from "aws-lambda";

const emptyFn = () => (true);

const contextMock: Context = {
  awsRequestId: "yo",
  callbackWaitsForEmptyEventLoop: true,
  done: emptyFn,
  fail: emptyFn,
  functionName: "blah",
  functionVersion: "gdgd",
  getRemainingTimeInMillis: () => 200,
  invokedFunctionArn: "blergh",
  logGroupName: "abc",
  logStreamName: "xyz",
  memoryLimitInMB: "2",
  succeed: emptyFn,
};
export default contextMock;
