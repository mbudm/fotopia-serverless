'use strict';

const dynamodb = require('./dynamodb');

module.exports.query = (event, context, callback) => {

  const data = JSON.parse(event.body);

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    KeyConditionExpression: '#id = :id AND #birthtime BETWEEN :from AND :to',
    ExpressionAttributeNames: {
      "#birthtime":"birthtime",
      "#id":"id"
    },
    ExpressionAttributeValues: {
      ":from": new Date(data.from).getTime(),
      ":to": new Date(data.to).getTime()
    }
  };

  console.log('params: ',params);

  dynamodb.query(params, (error, result) => {

    // handle potential errors
    if (error) {
      console.error('err', error);
      callback(null, {
        statusCode: error.statusCode || 501,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Couldn\'t fetch the todo item.',
      });
      return;
    }

    // create a response
    const filteredtems = filterItemsByCriteria(result.Items, data);

    const response = {
      statusCode: 200,
      body: 'Yo!' + JSON.stringify(filteredItems),
    };
    callback(null, response);
  });
};

//export these for tests!
function filterItemsByCriteria(items, data){
  return items.filter((item) => {
    return Object.keys(data.criteria).every(criteriaKey => passesCriteria(item, criteriaKey, data.criteria[criteriaKey]));
  });
}

function filterByCriteria(item, criteriaKey, criteriaData){
  return criteriaData.every(criteriaDataItem => item[criteriaKey].contains(criteriaDataItem));
}
