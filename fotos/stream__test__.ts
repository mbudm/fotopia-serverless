import * as test from "tape";
import * as stream from "./stream";

const records = [{
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

test("parseIndexes - adds all tags and people for inserted record ", (t) => {
  const result = stream.parseIndexes([records[0]]);
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

test("parseIndexes - adds all new tags and people and removes old for modified record ", (t) => {
  const result = stream.parseIndexes([records[1]]);
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

test("parseIndexes - handles both an insert and modify record", (t) => {
  const result = stream.parseIndexes(records);
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

test("updateCounts - negative values", (t) => {
  const existing = {
    people: {
      barack: 1,
    },
    tags: {
      yellow: 2,
    },
  };
  const updates = {
    people: {
      barack: -1,
      fred: 2,
    },
    tags: {
      yellow: -2,
    },
  };
  const result = stream.updateCounts(existing, updates);
  t.deepEqual(result, {
    people: {
      barack: 0,
      fred: 2,
    },
    tags: {
      yellow: 0,
    },
  });

  t.end();
});

test("getUpdatedIndexes - no existing index", (t) => {
  const result = stream.getUpdatedIndexes({ error: true }, records);
  t.deepEqual(result, {
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
    tags: {
      black: 0,
      pink: 2,
      yellow: 1,
    },
  });
  t.end();
});

test("getUpdatedIndexes - modifies existing index with just tags", (t) => {
  const existing = {
    tags: {
      black: 4,
      green: 7,
      yellow: 1,
    },
  };
  const result = stream.getUpdatedIndexes(existing, records);
  t.deepEqual(result, {
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
    tags: {
      black: 3,
      green: 7,
      pink: 2,
      yellow: 2,
    },
  });
  t.end();
});

test("getUpdatedIndexes - modifies existing index with tags and people", (t) => {
  const existing = {
    people: {
      emma: 2,
      geoff: 3,
    },
    tags: {
      black: 4,
      yellow: 1,
    },
  };
  const result = stream.getUpdatedIndexes(existing, records);
  t.deepEqual(result, {
    people: {
      emma: 3,
      geoff: 3,
      leona: 1,
      wilma: 2,
    },
    tags: {
      black: 3,
      pink: 2,
      yellow: 2,
    },
  });
  t.end();
});
