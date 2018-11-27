import * as test from "tape";
import * as deleteFns from "./delete";

const username = "billy-mae";
const request = {
  birthtime: 123,
  username,
};

test("getS3Params", (t) => {
  const result = deleteFns.getS3Params(JSON.stringify(request));
  t.deepEqual(result, request);
  t.end();
});

test("getInvokeGetParams", (t) => {
  const result = deleteFns.getInvokeGetParams(JSON.stringify(request));
  t.deepEqual(result, request);
  t.end();
});
