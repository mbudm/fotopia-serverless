import { PutObjectRequest } from "aws-sdk/clients/s3";

export function getS3PutParams(indexData, Bucket, Key): PutObjectRequest {
  return {
    Body: JSON.stringify(indexData),
    Bucket,
    ContentType: "application/json",
    Key,
  };
}
