const getS3BucketGenerated = (): string => {
  if (process.env.S3_BUCKET_GENERATED) {
    return process.env.S3_BUCKET_GENERATED;
  } else {
    throw new Error("No S3_BUCKET_GENERATED env variable set");
  }
};
export default getS3BucketGenerated;
