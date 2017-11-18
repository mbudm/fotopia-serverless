'use strict';

const dynamodb = require('./dynamodb');

module.exports.query = (event, context, callback) => {

  const data = JSON.parse(event.body);
  // https://egkatzioura.com/2016/06/27/put-items-to-dynamodb-tables-using-node-js/
  // https://egkatzioura.com/2016/07/02/query-dynamodb-items-with-node-js/
  // https://github.com/gkatzioura/egkatzioura.wordpress.com/tree/master/DynamoDBTutorialNode
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: "TagsIndex",
    KeyConditionExpression: '#tags = :tags and #birthtime BETWEEN :from AND :to',
    ExpressionAttributeNames: {
      "#tags":"tags",
      "#birthtime":"birthtime"
    },
    ExpressionAttributeValues: {
      ':tags': data.tags,
      ":from": new Date(data.from).getTime(),
      ":to": new Date(data.to).getTime()
    }
  };

  console.log('--',event);

  // fetch all fotos from the database specified by query

  // TODO: a dynamo db query instead
  // http://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Query.html

  dynamodb.query(params, (error, result) => {

    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the todo item.',
      });
      return;
    }

    // create a response
    const response = {
      statusCode: 200,
      body: 'Yo!' + JSON.stringify(result.Items),
    };
    callback(null, response);
  });
};
