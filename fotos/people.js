
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import { PEOPLE_KEY } from './lib/constants';
import logger from './lib/logger';
import { getExistingPeople } from './faces';
import { safeLength } from './create';

export function getLogFields(existingPeople) {
  return {
    peopleCount: safeLength(existingPeople),
  };
}
export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  try {
    const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
    logger(context, startTime, getLogFields(existingPeople));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
