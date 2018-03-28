require('dotenv').config();
require('es6-promise').polyfill();
require('isomorphic-fetch');

const AWS = require('aws-sdk');
const Amplify = require('aws-amplify').default;

const config = require('../output/config.json');
const uuid = require('uuid');

const uploadLocal = require('./uploadLocal');
const { postLocal, getLocal, delLocal } = require('./apiLocal');

const local = {
  auth() {
    return new Promise(resolve => resolve({
      username: uuid.v1(),
    }));
  },
  API: {
    post: postLocal,
    get: getLocal,
    del: delLocal,
  },
  Storage: {
    vault: {
      put: uploadLocal,
    },
  },
};

const remote = {
  auth() {
    return new Promise((resolve, reject) => {
      const cognitoISP = new AWS.CognitoIdentityServiceProvider({
        region: config.Region,
      });

      const userName = uuid.v1();

      const params = {
        UserPoolId: config.UserPoolId,
        Username: userName,
        DesiredDeliveryMediums: [
          'EMAIL',
        ],
        ForceAliasCreation: true,
        MessageAction: 'SUPPRESS',
        TemporaryPassword: process.env.TEST_USER_TEMP_PWD,
        UserAttributes: [
          {
            Name: 'email',
            Value: process.env.TEST_USER_EMAIL,
          },
        ],
      };
      cognitoISP.adminCreateUser(params, (err, data) => {
        if (err) {
          reject(err);
        } else {
          console.log(JSON.stringify(data, null, 2));
          Amplify.configure({
            Auth: {
              identityPoolId: config.IdentityPoolId,
              region: config.Region,
              userPoolId: config.UserPoolId,
              userPoolWebClientId: config.UserPoolClientId,
            },
            Storage: {
              region: config.Region,
              bucket: config.Bucket,
              identityPoolId: config.IdentityPoolId,
            },
            API: {
              endpoints: [
                {
                  name: 'fotos',
                  endpoint: config.ServiceEndpoint,
                  region: config.Region,
                },
              ],
            },
          });
          Amplify.Auth.signIn(userName, process.env.TEST_USER_TEMP_PWD)
            .then(user => Amplify.Auth.completeNewPassword(user, process.env.TEST_USER_PWD))
            .then(resolve)
            .catch(reject);
        }
      });
    });
  },
  API: Amplify.API,
  Storage: Amplify.Storage,
};

module.exports = process.env.IS_OFFLINE ? local : remote;
