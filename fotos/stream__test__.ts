import { DynamoDBRecord } from "aws-lambda";
import * as test from "tape";
import { getZeroCount } from "./indexes";
import * as stream from "./stream";
import { IIndex } from "./types";

const records: DynamoDBRecord[] = [{
  dynamodb: {
    NewImage: {
      people: {
        L: [
          {
            S: "emma",
          },
          {
            S: "leona",
          },
          {
            S: "wilma",
          },
        ],
      },
      tags: {
        L: [
          {
            S: "yellow",
          },
          {
            S: "pink",
          },
        ],
      },
    },
  },
  eventName: "INSERT",
}, {
  dynamodb: {
    NewImage: {
      people: {
        L: [
          {
            S: "gaston",
          },
          {
            S: "ahmed",
          },
          {
            S: "leona",
          },
          {
            S: "wilma",
          },
        ],
      },
      tags: {
        L: [
          {
            S: "blue",
          },
          {
            S: "red",
          },
          {
            S: "pink",
          },
        ],
      },
    },
    OldImage: {
      people: {
        L: [
          {
            S: "gaston",
          },
          {
            S: "ahmed",
          },
          {
            S: "leona",
          },
        ],
      },
      tags: {
        L: [
          {
            S: "blue",
          },
          {
            S: "black",
          },
          {
            S: "red",
          },
        ],
      },
    },
  },
  eventName: "MODIFY",
}];

test("getIndexUpdates - adds all tags and people for inserted record ", (t) => {
  const result = stream.getIndexUpdates([records[0]]);
  t.deepEqual(result, {
    people: {
      emma: 1,
      leona: 1,
      wilma: 1,
    },
    tags: {
      pink: 1,
      yellow: 1,
    },
  });
  t.end();
});

test("getIndexUpdates - adds all new tags and people and removes old for modified record ", (t) => {
  const result = stream.getIndexUpdates([records[1]]);
  t.deepEqual(result, {
    people: {
      wilma: 1,
    },
    tags: {
      black: -1,
      pink: 1,
    },
  });
  t.end();
});

test("getIndexUpdates - handles both an insert and modify record", (t) => {
  const result = stream.getIndexUpdates(records);
  t.deepEqual(result, {
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
    tags: {
      black: -1,
      pink: 2,
      yellow: 1,
    },
  });
  t.end();
});

test("getZeroCount", (t) => {
  const existing: IIndex = {
    people: {
      "9ca94e30-c8c3-11e9-a794-7524c255cd6f": 1,
    },
    tags: {
      Accessories : 1,
      Accessory : 1,
      Apparel : 1,
      Clothing: 1,
      Coat: 1,
      Glasses: 1,
      Human: 1,
      Overcoat: 1,
      Person: 1,
      Suit: 1,
    },
  };
  const updated: IIndex = {
    people: {
      "9ca94e30-c8c3-11e9-a794-7524c255cd6f": 0,
    },
    tags: {
      Accessories : 0,
      Accessory : 0,
      Apparel : 0,
      Clothing: 0,
      Coat: 0,
      Glasses: 0,
      Human: 0,
      Overcoat: 0,
      Person: 0,
      Suit: 0,
    },
  };

  const resultExistingPeople = getZeroCount(existing.people);
  const resultExistingTags = getZeroCount(existing.tags);
  const resultUpdatedPeople = getZeroCount(updated.people);
  const resultUpdatedTags = getZeroCount(updated.tags);

  t.equal(resultExistingPeople, 0, `${resultExistingPeople} zero counts in existing people`);
  t.equal(resultExistingTags, 0, `${resultExistingTags}  zero counts in existing tags`);
  t.equal(resultUpdatedPeople, 1, `${resultUpdatedPeople}  zero counts in updated people`);
  t.equal(resultUpdatedTags, 10, `${resultUpdatedTags}  zero counts in updated tags`);
  t.end();
});
