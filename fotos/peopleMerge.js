import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import { PEOPLE_KEY } from './lib/constants';
import logger from './lib/logger';
import { getExistingPeople } from './faces';
import { safeLength } from './create';

export function mergePeopleObjects(data, existingPeople) {
  const mergedPeople = existingPeople
    .filter(person => data.includes(person.id))
    .map(person => ({ ...person, faces: [...person.faces] }));
  const mainPerson = mergedPeople
    .reduce((accum, person) => (accum.faces.length > person.faces.length ?
      accum : person), { faces: [] });
  mainPerson.faces = mergedPeople
    .reduce((accum, person) => {
      const uniqFaces = person.faces.filter(face => !accum.find(f => f.FaceId === face.FaceId));
      return accum.concat(uniqFaces);
    }, []);
  return mainPerson;
}
export function getDeletePeople(data, mergedPerson, existingPeople) {
  return data.filter(pid => pid !== mergedPerson.id)
    .map(pid2 => existingPeople.find(p => pid2 === p.id));
}
export async function getImagesWithDeletedPeople(deletePeople) {
  return deletePeople;
}
export async function updatedImages(imagesWithDeletedPeople, mergedPerson, deletePeople) {
  return {
    imagesWithDeletedPeople, mergedPerson, deletePeople,
  };
}
export function getUpdatedPeople(existingPeople, mergedPerson, deletePeople) {
  return existingPeople.filter(p => !deletePeople.find(dp => dp.id === p.id))
    .map(person => (mergedPerson.id === person.id ?
      mergedPerson :
      person));
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
    const deletePeople = getDeletePeople(data, mergedPerson, existingPeople);
    const imagesWithDeletedPeople = await getImagesWithDeletedPeople(deletePeople);
    const updatedImagesResponse =
      await updatedImages(imagesWithDeletedPeople, mergedPerson, deletePeople);
    const updatedPeople = getUpdatedPeople(existingPeople, mergedPerson, deletePeople);
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
