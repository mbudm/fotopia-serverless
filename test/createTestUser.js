require('dotenv').config();
require('es6-promise').polyfill();
require('isomorphic-fetch');

const AWS = require('aws-sdk');
const Amplify = require('aws-amplify').default;

const config = require('../output/config.json');
const uuid = require('uuid');

module.exports = function createTestUser() {
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
            bucket: 'fotopia-web-app-prod',
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
};
