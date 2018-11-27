import 'isomorphic-fetch';

import AWS from 'aws-sdk';
import Amplify from 'aws-amplify';

// Amplify.Logger.LOG_LEVEL = 'DEBUG';

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

    const tempPassword = '@This1sChanged';

    const params = {
      UserPoolId: config.UserPoolId,
      Username: username,
      DesiredDeliveryMediums: [
        'EMAIL',
      ],
      ForceAliasCreation: true,
      MessageAction: 'SUPPRESS',
      TemporaryPassword: tempPassword,
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
        Amplify.Auth.signIn(username, tempPassword)
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
    Amplify.Auth.signIn(process.env.TEST_USER_NAME, process.env.TEST_USER_PWD)
      .then(resolve)
      .catch(reject);
  });
}
export function getIdentityId(response) {
  return Amplify.Auth.currentUserCredentials()
    .then(res => ({
      userIdentityId: res.params.IdentityId,
      ...response,
    }));
}

export function checkUserExists(config) {
  const username = process.env.TEST_USER_NAME;
  const cognitoISP = new AWS.CognitoIdentityServiceProvider({
    region: config.Region,
  });
  return cognitoISP.listUsers({
    UserPoolId: config.UserPoolId,
    Filter: `username = "${username}"`,
  }).promise();
}

export default function auth(config) {
  return checkUserExists(config)
    .then((response) => {
      console.log('checkUserExists', response);
      return response.Users.length === 1 ?
        authenticateExistingUser(config) :
        authenticateNewUser(config);
    })
    .then(getIdentityId)
    .catch((err) => {
      console.log('check user err', err);
    });
}
