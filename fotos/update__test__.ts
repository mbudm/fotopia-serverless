import * as test from "tape";
import * as uuid from "uuid";
import * as update from "./update";

const requestParams = {
  id: uuid.v1(),
  username: "pedro",
};
const requestBody = {
  meta: {
    location: "Peru",
  },
  people: ["Bob"],
};

test("validateBody", (t) => {
  try {
    const result = update.validateBody(requestBody);
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test("getDynamoDbParams", (t) => {
  process.env.DYNAMODB_TABLE = "TABLE";
  try {
    const params = update.getDynamoDbParams(requestParams, requestBody);
    t.deepEqual(params.Key.username, requestParams.username);
    t.equal(params.UpdateExpression, "SET #meta = :meta, #people = :people, updatedAt = :updatedAt");
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
