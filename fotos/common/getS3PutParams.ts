import { PutObjectRequest } from "aws-sdk/clients/s3";

export function getS3PutParams(data, Bucket, Key): PutObjectRequest {
  return {
    Body: JSON.stringify(data),
    Bucket,
    ContentType: "application/json",
    Key,
  };
}
