import  dynamodb from './lib/dynamodb';

export const getItem = (event, context, callback) => {

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      userid: event.pathParameters.userid, //needs a global secondary index that lets you query by id
      birthtime: event.pathParameters.birthtime * 1
    },
  };

  // fetch foto from the database
  dynamodb.get(params, (error, result) => {
    console.log('yo! get response', result);
    // handle potential errors
    if (error) {
      console.error(error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the foto item.',
      });
      return;
    }

    const body =  result.Item ? JSON.stringify(result.Item) : `No item found for ${event.pathParameters.id}`;

    // create a response
    const response = {
      statusCode: 200,
      body
    };
    callback(null, response);
  });
};
