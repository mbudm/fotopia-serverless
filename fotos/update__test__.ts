import * as test from "tape";
import * as uuid from "uuid";
import { IUpdateBody } from "./types";
import * as update from "./update";

const requestParams = {
  id: uuid.v1(),
  username: "pedro",
};
const requestBody: IUpdateBody = {
  people: ["Bob"],
};

test("getDynamoDbParams", (t) => {
  process.env.DYNAMODB_TABLE = "TABLE";
  try {
    const params = update.getDynamoDbParams(requestParams, requestBody);
    t.deepEqual(params.Key.username, requestParams.username);
    t.equal(params.UpdateExpression, "SET #people = :people, updatedAt = :updatedAt");
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
