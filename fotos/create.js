'use strict';

const uuid = require('uuid');
const dynamodb = require('./dynamodb');

module.exports.create = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  if (typeof data.birthtime !== 'string') {
    console.error('Validation Failed');
    callback(null, {
      statusCode: 400,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Couldn\'t create the foto item.',
    });
    return;
  }

  // go create s3 objects here... or do in another lambda and chain to this?

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      userid: data.userid,
      birthtime: new Date(data.birthtime).getTime(), // global secondary index
      tags: data.tags, // use scan w contains filter: https://stackoverflow.com/questions/30134701/amazon-dynamodb-query-for-items-whose-key-contains-a-substring
      people: data.people, // for rekognition categorisation
      image: data.image, // s3 object (image) url?
      meta: data.meta, // whatever metadata we've got for this item, or just store this as s3 object?
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  // write the foto to the database
  dynamodb.put(params, (error) => {
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t create the foto item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: JSON.stringify(params.Item),
    };
    callback(null, response);
  });
};
