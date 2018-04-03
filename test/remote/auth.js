import dotEnv from 'dotenv';
import 'isomorphic-fetch';

import AWS from 'aws-sdk';
import Amplify from 'aws-amplify';

dotEnv.config();


function configureAmplify(config) {
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
}
function authenticateNewUser(config) {
  return new Promise((resolve, reject) => {
    const cognitoISP = new AWS.CognitoIdentityServiceProvider({
      region: config.Region,
    });

    const username = process.env.TEST_USER_NAME;

    const params = {
      UserPoolId: config.UserPoolId,
      Username: username,
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
        configureAmplify(config);
        Amplify.Auth.signIn(username, process.env.TEST_USER_TEMP_PWD)
          .then(user => Amplify.Auth.completeNewPassword(user, process.env.TEST_USER_PWD))
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

function authenticateExistingUser(config) {
  return new Promise((resolve, reject) => {
    configureAmplify(config);
    Amplify.Auth.signIn(process.env.TEST_EXISTING_USER, process.env.TEST_EXISTING_USER_PWD)
      .then(resolve)
      .catch(reject);
  });
}

export default function auth(config) {
  return process.env.TEST_EXISTING_USER ?
    authenticateExistingUser(config) :
    authenticateNewUser(config);
}
