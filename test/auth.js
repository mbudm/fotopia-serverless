import dotEnv from 'dotenv';
import 'isomorphic-fetch';

import AWS from 'aws-sdk';
import { AuthenticationDetails, CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';
// import Amplify from 'aws-amplify';
import uuid from 'uuid';

dotEnv.config();

function createTestUserSignInAndGetCredentials(config) {
  return new Promise((resolve, reject) => {
    const cognitoISP = new AWS.CognitoIdentityServiceProvider({
      region: config.Region,
    });

    const username = uuid.v1();

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
        // console.log(JSON.stringify(data, null, 2));
        const authenticationData = {
          Username: username,
          Password: process.env.TEST_USER_TEMP_PWD,
        };
        const authenticationDetails = new AuthenticationDetails(authenticationData);
        const poolData = {
          UserPoolId: config.UserPoolId,
          ClientId: config.UserPoolClientId,
        };
        const userPool = new CognitoUserPool(poolData);
        const userData = {
          Username: username,
          Pool: userPool,
        };
        const cognitoUser = new CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess(session) {
            // now do AWS.CognitoIdentityCredentials
            // like https://github.com/aws/aws-amplify/blob/master/packages/aws-amplify/src/Auth/Auth.ts#L1108
            AWS.config.region = config.Region;

            // Configure the credentials provider to use your identity pool
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({
              IdentityPoolId: config.IdentityPoolId,
            });

            // Make the call to obtain credentials
            AWS.config.credentials.get(() => {
              resolve({
                username,
                cognitoUser,
                credentials: {
                  accessKeyId: AWS.config.credentials.accessKeyId,
                  secretAccessKey: AWS.config.credentials.secretAccessKey,
                  sessionToken: AWS.config.credentials.sessionToken,
                },
                email: process.env.TEST_USER_EMAIL,
                pwd: process.env.TEST_USER_PWD,
                session,
                config,
              });
            });
          },
          onFailure(e) {
            reject(e);
          },
          newPasswordRequired() {
            cognitoUser.completeNewPasswordChallenge(process.env.TEST_USER_PWD, null, this);
          },
        });
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
