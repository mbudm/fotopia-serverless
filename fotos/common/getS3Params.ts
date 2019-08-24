import { GetObjectRequest } from "aws-sdk/clients/s3";

export function getS3Params(Bucket: string | undefined, Key: string | undefined): GetObjectRequest {
  if (Bucket && Key) {
    return {
      Bucket,
      Key,
    };
  } else {
    throw new Error(`Both S3 params not provided (bucket:${Bucket}, Key:${Key})`);
  }
}
