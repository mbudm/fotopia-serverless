export function getS3Params(Bucket: string | undefined, Key: string | undefined) {
  return {
    Bucket,
    Key,
  };
}
