import * as test from "tape";
import * as uuid from "uuid";
import * as get from "./get";

const request = {
  id: uuid.v1(),
  username: "ahmed",
};

test("validateRequest", (t) => {
  try {
    const result = get.validateRequest(request);
    t.deepEqual(result, request);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test("getResponseBody w Item", (t) => {
  const result = get.getResponseBody({ Item: { ...request } }, request);
  t.deepEqual(result, request);
  t.end();
});

test("getResponseBody w/o Item", (t) => {
  const result = get.getResponseBody({}, request);
  t.ok(result.includes("No item found"));
  t.end();
});

test("get.getDynamoDbParams", (t) => {
  process.env.DYNAMODB_TABLE = "TABLE";
  try {
    const params = get.getDynamoDbParams(request);
    t.equal(params.Key.username, request.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
