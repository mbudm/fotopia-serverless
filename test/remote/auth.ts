import "isomorphic-fetch";

import Amplify from "aws-amplify";
import * as AWS from "aws-sdk";
import { CognitoIdentityServiceProvider } from "aws-sdk";

// Amplify.Logger.LOG_LEVEL = "DEBUG";

function configureAmplify(config: any) {
  Amplify.configure({
    API: {
      endpoints: [
        {
          endpoint: config.ServiceEndpoint,
          name: "fotos",
          region: config.Region,
        },
      ],
    },
    Auth: {
      identityPoolId: config.IdentityPoolId,
      region: config.Region,
      userPoolId: config.UserPoolId,
      userPoolWebClientId: config.UserPoolClientId,
    },
    Storage: {
      bucket: config.Bucket,
      identityPoolId: config.IdentityPoolId,
      level: "protected",
      region: config.Region,
    },
  });
}
function authenticateNewUser(config: any) {
  return new Promise((resolve, reject) => {
    const cognitoISP = new CognitoIdentityServiceProvider({
      region: config.Region,
    });

    const username: string = process.env.TEST_USER_NAME || "";

    const tempPassword = "@This1sChanged";

    const params = {
      DesiredDeliveryMediums: [
        "EMAIL",
      ],
      ForceAliasCreation: true,
      MessageAction: "SUPPRESS",
      TemporaryPassword: tempPassword,
      UserAttributes: [
        {
          Name: "email",
          Value: process.env.TEST_USER_EMAIL,
        },
      ],
      UserPoolId: config.UserPoolId,
      Username: username,
    };
    cognitoISP.adminCreateUser(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        // tslint:disable-next-line:no-console
        console.log(JSON.stringify(data, null, 2));
        configureAmplify(config);
        Amplify.Auth.signIn(username, tempPassword)
          .then((user: string) => Amplify.Auth.completeNewPassword(user, process.env.TEST_USER_PWD))
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

function authenticateExistingUser(config: any) {
  return new Promise((resolve, reject) => {
    configureAmplify(config);
    Amplify.Auth.signIn(process.env.TEST_USER_NAME, process.env.TEST_USER_PWD)
      .then(resolve)
      .catch(reject);
  });
}
export function getIdentityId(response: any) {
  return Amplify.Auth.currentUserCredentials()
    .then((res: any) => {
      // forcibly assign the cognito credentials to aws-sdk
      // storage doesnt pick up the creds from auth, probably because amplify isnt designed for node.js
      // and competing aws-sdk dependencies may mean storage looks in the wrong
      // aws-sdk lib version and reverts to tthe creds in the bash profile
      // at least thats my best explanation so far.
      AWS.config.credentials = res;
      return {
        userIdentityId: res.params.IdentityId,
        ...response,
      };
    });
}

export function checkUserExists(config: any) {
  const username = process.env.TEST_USER_NAME;
  const cognitoISP = new CognitoIdentityServiceProvider({
    region: config.Region,
  });
  return cognitoISP.listUsers({
    Filter: `username = "${username}"`,
    UserPoolId: config.UserPoolId,
  }).promise();
}

export default function auth(config: any) {
  return checkUserExists(config)
    .then((response) => {
      // tslint:disable-next-line:no-console
      console.log("checkUserExists", response);
      return response!.Users!.length === 1 ?
        authenticateExistingUser(config) :
        authenticateNewUser(config);
    })
    .then(getIdentityId)
    .catch((err) => {
      // tslint:disable-next-line:no-console
      console.error("check user err", err);
    });
}
