import "isomorphic-fetch";

import * as AmazonCognitoIdentity from "amazon-cognito-identity-js";
import * as AWS from "aws-sdk";
import { CognitoIdentityCredentials, CognitoIdentityServiceProvider } from "aws-sdk";

function authenticateUser(config: any, username?: string, password?: string) {
  return new Promise((resolve, reject) => {
    const authenticationData = {
      Password : password || "",
      Username : username || "",
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
        resolve(result);
      },
      onFailure(err) {
        reject(err);
      },
    });
  });
}

function authenticateExistingUser(config: any) {
  return authenticateUser(config, process.env.TEST_USER_NAME, process.env.TEST_USER_PWD)
    .then((result: any) => {
      const accessToken = result.getAccessToken().getJwtToken();
      /* Use the idToken for Logins Map when Federating User Pools
      with identity pools or when passing through an Authorization
      Header to an API Gateway Authorizer*/
      const idToken = result.getIdToken().getJwtToken();
      return {
        accessToken,
        idToken,
      };
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
    cognitoISP.adminCreateUser(params, (err, d) => {
      if (err) {
        reject(err);
      } else {
        const setPwParams = {
          Password:  process.env.TEST_USER_PWD || "",
          Permanent: true,
          UserPoolId: config.UserPoolId,
          Username: username,
        };
        return new Promise((setPwResolve, setPwReject) => {
            cognitoISP.adminSetUserPassword(setPwParams, (e, data) => {
              if (e) {
                setPwReject(e);
              } else {
                setPwResolve(data);
              }
            });
          })
          .then((response: any) => {
            return resolve(authenticateUser(config, username, setPwParams.Password));
          })
          .catch(reject);
      }
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
    const cognitoCreds: CognitoIdentityCredentials = AWS.config.credentials as CognitoIdentityCredentials;
    return {
      bucket: config.Bucket,
      credentials: {
        accessKeyId: AWS.config.credentials!.accessKeyId,
        secretAccessKey: AWS.config.credentials!.secretAccessKey,
        sessionToken: AWS.config.credentials!.sessionToken,
      },
      userIdentityId: cognitoCreds.identityId,
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
  }).promise()
  .catch((e) => {
    // tslint:disable-next-line:no-console
    console.log(e);
    return e;
  });
}
function getAWSCredentialsFromProfile(){
  return new Promise((resolve, reject) => {
    AWS.config.getCredentials((err) => {
      if (err) {
        reject(err);
      } else {
        resolve(AWS.config.credentials);
      }
    });
  });
}

export default function auth(config: any) {
  return getAWSCredentialsFromProfile()
    .then(() => checkUserExists(config))
    .then((response) => {
      return response!.Users!.length === 1 ?
        authenticateExistingUser(config) :
        authenticateNewUser(config);
    })
    .then(() => getCurrentUser(config))
    .then(getUserToken)
    .then((userToken) => getAwsCredentials(config, userToken))
    .catch((err) => {
      // tslint:disable-next-line:no-console
      console.error("check user err", err);
    });
}
