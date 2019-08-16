import * as test from "tape";
import * as uuid from "uuid";
import * as get from "./get";
import { IImage } from "./types";

const request = {
  id: uuid.v1(),
  username: "ahmed",
};

test("getResponseBody w Item is request in IImage shape", (t) => {
  const result: IImage = get.getResponseBody({ Item: { ...request } });
  t.deepEqual(result, request);
  t.end();
});

test("getResponseBody w/o Item is undefined", (t) => {
  const result = get.getResponseBody({});
  t.equal(result, undefined );
  t.end();
});

test("getDynamoDbParams - has username ", (t) => {
  process.env.DYNAMODB_TABLE = "TABLE";
  try {
    const params = get.getDynamoDbParams(request);
    t.equal(params.Key.username, request.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
