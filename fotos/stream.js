
export default async function indexRecords(event, context, callback) {
  try {
    console.log(event, context, callback);
  } catch (err) {
    console.error(err);
  }
}
