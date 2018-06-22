import test from 'tape';
import * as stream from './stream';

const records = [{
  eventName: 'INSERT',
  dynamodb: {
    NewImage: {
      tags: {
        S: 'yellow,pink',
      },
      people: {
        S: 'emma,leona,wilma',
      },
    },
  },
}, {
  eventName: 'MODIFY',
  dynamodb: {
    OldImage: {
      tags: {
        L: [
          {
            S: 'blue',
          },
          {
            S: 'black',
          },
          {
            S: 'red',
          },
        ],
      },
      people: {
        L: [
          {
            S: 'gaston',
          },
          {
            S: 'ahmed',
          },
          {
            S: 'leona',
          },
        ],
      },
    },
    NewImage: {
      tags: {
        L: [
          {
            S: 'blue',
          },
          {
            S: 'red',
          },
          {
            S: 'pink',
          },
        ],
      },
      people: {
        L: [
          {
            S: 'gaston',
          },
          {
            S: 'ahmed',
          },
          {
            S: 'leona',
          },
          {
            S: 'wilma',
          },
        ],
      },
    },
  },
}];


test('parseIndexes - adds all tags and people for inserted record ', (t) => {
  const result = stream.parseIndexes([records[0]]);
  t.deepEqual(result, {
    tags: {
      yellow: 1,
      pink: 1,
    },
    people: {
      emma: 1,
      leona: 1,
      wilma: 1,
    },
  });
  t.end();
});

test('parseIndexes - adds all new tags and people and removes old for modified record ', (t) => {
  const result = stream.parseIndexes([records[1]]);
  t.deepEqual(result, {
    tags: {
      black: -1,
      pink: 1,
    },
    people: {
      wilma: 1,
    },
  });
  t.end();
});

test('parseIndexes - handles both an insert and modify record', (t) => {
  const result = stream.parseIndexes(records);
  t.deepEqual(result, {
    tags: {
      yellow: 1,
      pink: 2,
      black: -1,
    },
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
  });
  t.end();
});

test('updateCounts - negative values', (t) => {
  const existing = {
    tags: {
      yellow: 2,
    },
    people: {
      barack: 1,
    },
  };
  const updates = {
    tags: {
      yellow: -2,
    },
    people: {
      barack: -1,
      fred: 2,
    },
  };
  const result = stream.updateCounts(existing, updates);
  t.deepEqual(result, {
    tags: {
      yellow: 0,
    },
    people: {
      barack: 0,
      fred: 2,
    },
  });

  t.end();
});

test('getUpdatedIndexes - no existing index', (t) => {
  const result = stream.getUpdatedIndexes({ error: true }, records);
  t.deepEqual(result, {
    tags: {
      yellow: 1,
      pink: 2,
      black: 0,
    },
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
  });
  t.end();
});

test('getUpdatedIndexes - modifies existing index with just tags', (t) => {
  const existing = {
    tags: {
      green: 7,
      black: 4,
      yellow: 1,
    },
  };
  const result = stream.getUpdatedIndexes(existing, records);
  t.deepEqual(result, {
    tags: {
      green: 7,
      yellow: 2,
      pink: 2,
      black: 3,
    },
    people: {
      emma: 1,
      leona: 1,
      wilma: 2,
    },
  });
  t.end();
});

test('getUpdatedIndexes - modifies existing index with tags and people', (t) => {
  const existing = {
    tags: {
      black: 4,
      yellow: 1,
    },
    people: {
      geoff: 3,
      emma: 2,
    },
  };
  const result = stream.getUpdatedIndexes(existing, records);
  t.deepEqual(result, {
    tags: {
      yellow: 2,
      pink: 2,
      black: 3,
    },
    people: {
      emma: 3,
      leona: 1,
      wilma: 2,
      geoff: 3,
    },
  });
  t.end();
});
