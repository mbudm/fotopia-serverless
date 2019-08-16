import * as test from "tape";
import * as query from "./query";
import { IQueryBody, IQueryResponse } from "./types";

const requestBody: IQueryBody = {
  criteria: {
    people: ["Lucy", "Ahmed"],
    tags: ["flowers", "trees"],
  },
  from: 345,
  to: 678,
  username: "saloni",
};

test("hasCriteria - no arg", (t) => {
  const result = query.hasCriteria();
  t.equal(result, false);
  t.end();
});

test("hasCriteria - no arrays", (t) => {
  const result = query.hasCriteria({});
  t.equal(result, false);
  t.end();
});

test("hasCriteria - empty arrays", (t) => {
  const result = query.hasCriteria({
    someOtherCriteria: [],
    tags: [],
  });
  t.equal(result, false);
  t.end();
});

test("hasCriteria - one empty array", (t) => {
  const result = query.hasCriteria({
    people: [],
    someOtherCriteria: [],
    tags: ["a tag"],
  });
  t.equal(result, true);
  t.end();
});

test("hasCriteria - no empty arrays", (t) => {
  const result = query.hasCriteria({
    people: ["some geezer"],
    someOtherCriteria: ["a thing", "another thing"],
    tags: ["a tag"],
  });
  t.equal(result, true);
  t.end();
});

test("getResponseBody - no results from db", (t) => {
  const result = query.getResponseBody({ Items: [] }, requestBody);
  const resultAsString = Array.isArray(result) ? "" : result;
  t.ok(resultAsString.includes("No items found"));
  t.end();
});

test("getResponseBody - items after filter", (t) => {
  const requestBodyNoCriteria: IQueryBody = {
    ...requestBody,
    criteria: {
      people: [],
      tags: [],
    },
  };
  const result = query.getResponseBody({
    Items: [{
      people: ["Lucy", "Bob"],
      tags: [],
    },
    {
      people: ["Ahmed"],
      tags: ["trees"],
    }],
  }, requestBodyNoCriteria);

  t.ok(Array.isArray(result));
  t.equal(result.length, 2);
  t.end();
});

test("getResponseBody - no items after filter", (t) => {
  const result = query.getResponseBody({
    Items: [{
      people: [],
      tags: ["Castle", "Countryside"],
    }],
  }, requestBody);
  const resultAsString = Array.isArray(result) ? "" : result;
  t.ok(resultAsString.includes("No items found"));
  t.end();
});

test("getResponseBody - items after filter", (t) => {
  const result = query.getResponseBody({
    Items: [{
      people: ["Lucy", "Bob"],
      tags: [],
    },
    {
      people: ["Ahmed"],
      tags: ["trees"],
    }],
  }, requestBody);
  t.equal(result.length, 2);
  t.end();
});

test("getResponseBody - items after single criteria filter", (t) => {
  const requestBodySingleCriteria: IQueryBody = {
    ...requestBody,
    criteria: {
      people: ["Lucy"],
      tags: [],
    },
  };
  const result = query.getResponseBody({
    Items: [{
      people: ["Lucy", "Bob"],
      tags: [],
    },
    {
      people: ["Ahmed"],
      tags: ["trees"],
    }],
  }, requestBodySingleCriteria);
  const resultAsArray = Array.isArray(result) ? result : [];
  t.equal(resultAsArray.length, 1);
  t.ok(resultAsArray![0].people!.includes("Lucy"));
  t.end();
});

const baseQueryResponse: IQueryResponse = {
  birthtime: 0,
  id: "yadda",
  img_key: "blah.jpg",
  img_thumb_key: "blah_thumb.jpg",
  meta: {
    height: 100,
    width: 100,
  },
  people: ["Lucy", "Bob"],
  tags: [],
  userIdentityId: "ho hum",
  username: "blah",
};

test("filterItemsByCriteria", (t) => {
  const items: IQueryResponse[] = [{
    ...baseQueryResponse,
    people: ["Lucy", "Bob"],
    tags: [],
  },
  {
    ...baseQueryResponse,
    people: [],
    tags: ["trees"],
  }];
  const result = query.filterItemsByCriteria(items, requestBody);
  t.equal(result.length, 2);
  t.end();
});

test("filterByCriteria", (t) => {
  const item: IQueryResponse = {
    ...baseQueryResponse,
    people: ["Lucy", "Bob"],
    tags: [],
  };
  const result = query.filterByCriteria(item, "people", requestBody!.criteria!.people);
  t.ok(result);
  t.end();
});

test("getDynamoDbParams", (t) => {
  process.env.DYNAMODB_TABLE = "TABLE";
  try {
    const params = query.getDynamoDbParams(requestBody);
    t.equal(params.ExpressionAttributeValues[":username"], requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
