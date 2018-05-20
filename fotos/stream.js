
export function addToIndex() {
  console.log('add to index');
}

export async function indexRecords(event, context, callback) {
  try {
    console.log(event, context, callback);
    // write to tags and people 'indexes'
  } catch (err) {
    console.error(err);
  }
}

/* example payload

{ Records:
   [ { eventID: '9250194633637e7cd1e10b89912d1d7d',
       eventName: 'INSERT',
       eventVersion: '1.1',
       eventSource: 'aws:dynamodb',
       awsRegion: 'us-east-1',
       dynamodb: [Object],
 */
