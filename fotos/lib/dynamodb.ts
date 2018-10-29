import * as AWS from "aws-sdk";

let options = {};

// connect to local DB if running offline
if (process.env.IS_OFFLINE) {
  options = {
    endpoint: "http://localhost:8000",
    region: "localhost",
  };
}

const client = new AWS.DynamoDB.DocumentClient(options);

export default client;
