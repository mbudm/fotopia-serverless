import AWS from 'aws-sdk';

const client = process.env.IS_OFFLINE ? null : new AWS.Rekognition();

export default client;
