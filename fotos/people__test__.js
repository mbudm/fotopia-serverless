import test from 'tape';
import * as people from './people';

test('getUpdatedPeople', (t) => {
  const existingPeople = [{
    name: '', id: 'c8523640-9a12-11e8-a9e0-cb0dc753a59b', userIdentityId: 'fakeid', thumbnail: 'tester/one-thumbnail.jpg', faces: [{ FaceId: 'c7febf10-9a12-11e8-a9e0-cb0dc753a59b', ExternalImageId: 'c7de65d0-9a12-11e8-a9e0-cb0dc753a59b' }],
  }, {
    name: '', id: 'c8ba6df0-9a12-11e8-a9e0-cb0dc753a59b', userIdentityId: 'fakeid', thumbnail: 'tester/two-thumbnail.jpg', faces: [{ FaceId: 'c885c960-9a12-11e8-a9e0-cb0dc753a59b', ExternalImageId: 'c8852d20-9a12-11e8-a9e0-cb0dc753a59b' }],
  }];
  const data = { name: 'Jacinta Dias' };
  const pathParams = { id: 'c8523640-9a12-11e8-a9e0-cb0dc753a59b' };
  const result = people.getUpdatedPeople(existingPeople, data, pathParams);
  t.ok(Array.isArray(result), 'people array');
  t.equal(result[0].name, data.name, 'name updated');
  t.end();
});
