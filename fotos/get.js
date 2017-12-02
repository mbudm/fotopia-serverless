import  dynamodb from './dynamodb';

export const getItem = (event, context, callback) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: event.pathParameters.id,
    },
  };

  // fetch foto from the database
  dynamodb.get(params, (error, result) => {
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
