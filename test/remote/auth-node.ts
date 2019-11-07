import "isomorphic-fetch";

import * as AmazonCognitoIdentity from "amazon-cognito-identity-js";
import * as AWS from "aws-sdk";
import { CognitoIdentityServiceProvider } from "aws-sdk";

function authenticateExistingUser(config: any) {
  return new Promise((resolve, reject) => {
    const authenticationData = {
      Password : process.env.TEST_USER_PWD || "",
      Username : process.env.TEST_USER_NAME || "",
    };
    const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(authenticationData);
    const poolData = {
      ClientId : config.UserPoolClientId,
      UserPoolId : config.UserPoolId,
    };
    const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);
    const userData = {
        Pool : userPool,
        Username : authenticationData.Username,
    };
    const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userData);
    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess(result) {
        const accessToken = result.getAccessToken().getJwtToken();

        /* Use the idToken for Logins Map when Federating User Pools
        with identity pools or when passing through an Authorization
        Header to an API Gateway Authorizer*/
        const idToken = result.getIdToken().getJwtToken();
        resolve({
          accessToken,
          idToken,
        });
      },
      onFailure(err) {
        reject(err);
      },
    });
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
      return authenticateExistingUser(config);
    })
    .catch((err) => {
      // tslint:disable-next-line:no-console
      console.error("check user err", err);
    });
}
