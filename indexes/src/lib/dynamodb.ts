import * as AWS from "aws-sdk";

const options = {};

const client = new AWS.DynamoDB.DocumentClient(options);

export default client;
