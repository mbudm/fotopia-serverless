import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import { PEOPLE_KEY } from './lib/constants';
import logger from './lib/logger';
import { getExistingPeople } from './faces';
import { safeLength } from './create';

export function mergePeopleObjects(data) {
  return data;
}
export function getDeletePeople(data, mergedPerson) {
  return {
    data, mergedPerson,
  };
}
export async function getImagesWithDeletedPeople(deletePeople) {
  return deletePeople;
}
export async function updatedImages(imagesWithDeletedPeople, mergedPerson, deletePeople) {
  return {
    imagesWithDeletedPeople, mergedPerson, deletePeople,
  };
}
export function updatePeople(existingPeople, mergedPerson, deletePeople) {
  return {
    existingPeople, mergedPerson, deletePeople,
  };
}
export async function updatePeopleObject(updatedPeople) {
  return updatedPeople;
}

export function getLogFields({ existingPeople }) {
  return {
    peopleCount: safeLength(existingPeople),
  };
}
export async function mergePeople(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  const data = event.body ? JSON.parse(event.body) : null;
  try {
    const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
    const mergedPerson = mergePeopleObjects(data);
    const deletePeople = getDeletePeople(data, mergedPerson);
    const imagesWithDeletedPeople = await getImagesWithDeletedPeople(deletePeople);
    const updatedImagesResponse =
      await updatedImages(imagesWithDeletedPeople, mergedPerson, deletePeople);
    const updatedPeople = updatePeople(existingPeople, mergedPerson, deletePeople);
    const updatedPeopleResponse = updatePeopleObject(updatedPeople);
    logger(context, startTime, getLogFields({
      existingPeople,
      mergedPerson,
      deletePeople,
      imagesWithDeletedPeople,
      updatedImagesResponse,
      updatedPeople,
      updatedPeopleResponse,
    }));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
