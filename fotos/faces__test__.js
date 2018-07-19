import test from 'tape';

import * as faces from './faces';

const records = {};
const existingPeople = {};

test('getPeopleForFaces', (t) => {
  const assert = {};
  const result = faces.getPeopleForFaces(records, existingPeople);
  t.deepEqual(result, assert);
  t.end();
});

test('getUpdatedPeople', (t) => {
  const peopleForTheseFaces = faces.getPeopleForFaces(records, existingPeople);
  const assert = {};
  const result = faces.getUpdatedPeople(existingPeople, peopleForTheseFaces);
  t.deepEqual(result, assert);
  t.end();
});

test('getRecordFields', (t) => {
  const assert = {};
  const result = faces.getRecordFields(records);
  t.deepEqual(result, assert);
  t.end();
});
