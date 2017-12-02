import dynamodb from './lib/dynamodb';

export const queryItems = (event, context, callback) => {

  const data = JSON.parse(event.body);

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    KeyConditionExpression: '#userid = :userid AND #birthtime BETWEEN :from AND :to',
    ExpressionAttributeNames: {
      "#userid":"userid",
      "#birthtime":"birthtime"
    },
    ExpressionAttributeValues: {
      ":userid": data.userid,
      ":from": new Date(data.from).getTime(),
      ":to": new Date(data.to).getTime()
    }
  };

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
    const filteredItems = filterItemsByCriteria(result.Items, data);

    const response = {
      statusCode: 200,
      body: JSON.stringify(filteredItems),
    };
    callback(null, response);
  });
};

//export these for tests!
export const filterItemsByCriteria = (items, data) =>{
  return items.filter((item) => {
    return Object.keys(data.criteria).every(criteriaKey => filterByCriteria(item, criteriaKey, data.criteria[criteriaKey]));
  });
}

export const filterByCriteria = (item, criteriaKey, criteriaData) => {
  return criteriaData.every(criteriaDataItem => item[criteriaKey].includes(criteriaDataItem));
}
