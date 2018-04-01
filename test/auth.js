import dotEnv from 'dotenv';
import 'isomorphic-fetch';

import AWS from 'aws-sdk';
import Amplify from 'aws-amplify';
import uuid from 'uuid';

dotEnv.config();

function createTestUserSignInAndGetCredentials(config) {
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
        });
        Amplify.Auth.signIn(userName, process.env.TEST_USER_TEMP_PWD)
          .then(user => Amplify.Auth.completeNewPassword(user, process.env.TEST_USER_PWD))
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

export default function (config) {
  if (process.env.IS_OFFLINE) {
    return new Promise(resolve => resolve({ username: uuid.v1() }));
  }
  return createTestUserSignInAndGetCredentials(config);
}
