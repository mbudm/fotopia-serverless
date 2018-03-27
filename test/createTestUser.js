require('dotenv').config();
require('es6-promise').polyfill();
require('isomorphic-fetch');

const AWS = require('aws-sdk');
const AmazonCognitoIdentity = require('amazon-cognito-identity-js');

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
          Name: 'email', /* required */
          Value: process.env.TEST_USER_EMAIL,
        },
        /* more items */
      ],
    };
    cognitoISP.adminCreateUser(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        console.log(JSON.stringify(data, null, 2));

        const authenticationData = {
          Username: userName,
          Password: process.env.TEST_USER_TEMP_PWD,
        };
        const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
        const poolData = {
          UserPoolId: config.UserPoolId,
          ClientId: config.UserPoolClientId,
        };
        const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
        const userData = {
          Username: userName,
          Pool: userPool,
        };
        const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
        cognitoUser.authenticateUser(authenticationDetails, {
          onSuccess(result) {
            resolve({
              user: {
                userid: userName,
                email: process.env.TEST_USER_EMAIL,
                pwd: process.env.TEST_USER_PWD,
              },
              tokens: result,
              config,
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
};
