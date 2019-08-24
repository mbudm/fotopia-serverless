const getS3Bucket = (): string => {
  if (process.env.S3_BUCKET) {
    return process.env.S3_BUCKET;
  } else {
    throw new Error("No S3_BUCKET env variable set");
  }
};
export default getS3Bucket;
