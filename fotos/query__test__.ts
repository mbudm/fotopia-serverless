import * as test from "tape";
import * as query from "./query";
import { IQueryBody, IQueryDBResponseItem } from "./types";

const clientId = "unit test";

const requestBody: IQueryBody = {
  clientId,
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

test("hasCriteria - undefined", (t) => {
  const result = query.hasCriteria(undefined);
  t.equal(result, false);
  t.end();
});

test("hasCriteria - empty arrays", (t) => {
  const result = query.hasCriteria({
    people: [],
    tags: [],
  });
  t.equal(result, false);
  t.end();
});

test("hasCriteria - one empty array", (t) => {
  const result = query.hasCriteria({
    people: [],
    tags: ["a tag"],
  });
  t.equal(result, true);
  t.end();
});

test("hasCriteria - no empty arrays", (t) => {
  const result = query.hasCriteria({
    people: ["some geezer"],
    tags: ["a tag"],
  });
  t.equal(result, true);
  t.end();
});

test("getResponseBody - no results from db", (t) => {
  const result = query.getResponseBody({ Items: [] }, requestBody);
  t.equal(result.items.length, 0);
  t.ok(result.message.includes("No items found"));
  t.end();
});

test("getResponseBody - items after filter w no criteria", (t) => {
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

  t.equal(result.items.length, 2);
  t.end();
});

test("getResponseBody - no items after filter", (t) => {
  const result = query.getResponseBody({
    Items: [{
      people: [],
      tags: ["Castle", "Countryside"],
    }],
  }, requestBody);
  t.ok(result.message.includes("No items found"));
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
  t.equal(result.items.length, 2);
  t.equal(result.message, "2 items found, 2 returned");
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
  t.equal(result.items.length, 1);
  t.ok(result.items[0].people![0].includes("Lucy"));
  t.end();
});

const baseQueryResponseItem: IQueryDBResponseItem = {
  birthtime: "0",
  group: "blue-team",
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
  const items: IQueryDBResponseItem[] = [{
    ...baseQueryResponseItem,
    people: ["Lucy", "Bob"],
    tags: [],
  },
  {
    ...baseQueryResponseItem,
    people: [],
    tags: ["trees"],
  }];
  const result = query.filterItemsByCriteria(items, requestBody);
  t.equal(result.length, 2);
  t.end();
});

test("filterByCriteria", (t) => {
  const item: IQueryDBResponseItem = {
    ...baseQueryResponseItem,
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
    t.equal(params.ExpressionAttributeValues![":username"], requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test("calculateFromDate - no lastRetrieved date supplied", (t) => {
  const fromDate = query.calculateFromDate(requestBody);

  t.equal(fromDate, requestBody.from);
  t.end();
});

test("calculateFromDate - future lastRetrieved date supplied", (t) => {
  const lastRetrievedBirthtime = requestBody.from + Math.floor((requestBody.to - requestBody.from) / 2);
  const requestBodyWithLastRetrieved = {
    ...requestBody,
    lastRetrievedBirthtime,
  };

  const fromDate = query.calculateFromDate(requestBodyWithLastRetrieved);

  t.equal(fromDate, lastRetrievedBirthtime);
  t.end();
});

test("calculateFromDate - prior lastRetrieved date supplied", (t) => {
  const lastRetrievedBirthtime = requestBody.from - 10;
  const requestBodyWithLastRetrieved = {
    ...requestBody,
    lastRetrievedBirthtime,
  };

  const fromDate = query.calculateFromDate(requestBodyWithLastRetrieved);

  t.equal(fromDate, requestBody.from);
  t.end();
});

test("calculateToDate - to date is within allowed range", (t) => {
  const toDate = query.calculateToDate(requestBody);

  t.equal(toDate, requestBody.to);
  t.end();
});

test("calculateToDate - to date is > allowed range", (t) => {
  const outOfRangeToDate = requestBody.from + query.MAX_DATE_RANGE + 10;
  const requestBodyWithOutOfRangeToDate = {
    ...requestBody,
    to: outOfRangeToDate,
  };

  const toDate = query.calculateToDate(requestBodyWithOutOfRangeToDate);

  t.equal(toDate, requestBody.from + query.MAX_DATE_RANGE);
  t.end();
});

test("calculateToDate - to date is < from date", (t) => {
  const lessThanFromDate = requestBody.from - 10;
  const requestBodyWithOutOfRangeToDate = {
    ...requestBody,
    to: lessThanFromDate,
  };
  try {
    const toDate = query.calculateToDate(requestBodyWithOutOfRangeToDate);
  } catch (e) {
    t.equal(e.message, `'To' date is prior to 'from' date`);
    t.end();
  }
});

test("calculateToDate - to date is < lastRetrievedBirthtime", (t) => {
  const lastRetrievedBirthtime = requestBody.to + 10;
  const requestBodyWithOutOfRangeToDate = {
    ...requestBody,
    lastRetrievedBirthtime,
  };
  try {
    const toDate = query.calculateToDate(requestBodyWithOutOfRangeToDate);
  } catch (e) {
    t.equal(e.message, `'To' date is prior to 'from' date`);
    t.end();
  }
});
