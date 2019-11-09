import "isomorphic-fetch";

import * as AmazonCognitoIdentity from "amazon-cognito-identity-js";
import * as AWS from "aws-sdk";

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

function getCurrentUser(config) {
  const userPool = new  AmazonCognitoIdentity.CognitoUserPool({
    ClientId : config.UserPoolClientId,
    UserPoolId : config.UserPoolId,
  });
  return userPool.getCurrentUser();
}

function getUserToken(currentUser) {
  return new Promise((resolve, reject) => {
    currentUser.getSession((err, session) => {
      if (err) {
        reject(err);
        return;
      }
      // tslint:disable-next-line:no-console
      // console.log("getUserToken", session);

      resolve(session.getIdToken().getJwtToken());
    });
  });
}

function getAwsCredentials(config: any, userToken) {
  const authenticator = `cognito-idp.${config.Region}.amazonaws.com/${config.UserPoolId}`;

  AWS.config.update({ region: config.Region});
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: config.IdentityPoolId,
    Logins: {
      [authenticator]: userToken,
    },
  });

  // tslint:disable-next-line:no-string-literal
  return AWS.config.credentials["getPromise"]()
  .then(() => {
    return {
      accessKeyId: AWS.config.credentials!.accessKeyId,
      sessionToken: AWS.config.credentials!.sessionToken,
      secretAccessKey: AWS.config.credentials!.secretAccessKey,
    };
  });
}

export default function auth(config: any) {
  return authenticateExistingUser(config)
    .then(() => getCurrentUser(config))
    .then(getUserToken)
    .then((userToken) => getAwsCredentials(config, userToken))
    .catch((err) => {
      // tslint:disable-next-line:no-console
      console.error("check user err", err);
    });
}
