
import { safeLength } from "./create";
import { getExistingPeople } from "./faces";
import { PEOPLE_KEY } from "./lib/constants";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";

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
    const existingPeople = await getExistingPeople(s3, bucket, key);
    logger(context, startTime, getLogFields(existingPeople));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
