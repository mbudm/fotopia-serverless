
import { success, failure } from './lib/responses';

export default async function uploadedItem(event, context, callback) {
  console.log('uploaded triggered', event);
  try {
    return callback(null, success(event.body));
  } catch (err) {
    return callback(null, failure(err));
  }
}

