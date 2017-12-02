
import uuid from 'uuid';
import dynamodb from './lib/dynamodb';
import { success, failure } from "./lib/responses";

export const createItem = (event, context, callback) => {
  const timestamp = new Date().getTime();
  const data = JSON.parse(event.body);
  if (typeof data.birthtime !== 'string') {
    callback(null, failure('No birthtime - this is required.'));
    return;
  }

  // go create s3 objects here... or do in another lambda and chain to this?

  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      userid: data.userid,
      id: uuid.v1(),
      birthtime: new Date(data.birthtime).getTime(),
      tags: data.tags,
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
      callback(null, failure('Couldn\'t create the foto item.'));
      return;
    }

    callback(null, success(params.Item));
  });
};
