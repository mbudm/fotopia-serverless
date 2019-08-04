import path from 'path';
import getConfig from './getConfig';
import formatError from './formatError';

export default function setupTests(auth) {
  const setupData = {
    uniqueTag: `_${Math.random().toString(36).substr(2, 9)}`,
  };
  return getConfig()
    .then((config) => {
      setupData.apiUrl = config.ServiceEndpoint;
      return auth(config);
    })
    .then((signedIn) => {
      // eslint-disable-next-line prefer-destructuring
      setupData.username = signedIn.username;
      setupData.images = [{
        path: path.resolve(__dirname, '../mock/one.jpg'),
        key: `${setupData.username}/one.jpg`,
      }, {
        path: path.resolve(__dirname, '../mock/four_people.jpg'),
        key: `${setupData.username}/four_people.jpg`,
      }, {
        path: path.resolve(__dirname, '../mock/two.jpeg'), // throwaway image used just to hack storage to get creds
        key: `${setupData.username}/two.jpg`,
      }];
      setupData.records = [{
        username: setupData.username,
        userIdentityId: signedIn.userIdentityId,
        birthtime: '2012-06-28T00:55:11.000Z',
        tags: ['blue', 'red', setupData.uniqueTag],
      }, {
        username: setupData.username,
        userIdentityId: signedIn.userIdentityId,
        birthtime: '2014-11-14T08:22:03.000Z',
        tags: ['xlabs', 'Melbourne University'],
      }];
      return setupData;
    })
    .catch(formatError);
}
