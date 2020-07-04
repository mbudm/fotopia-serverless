import { PutObjectRequest } from "aws-sdk/clients/s3";
import getS3BucketGenerated from "./getS3BucketGenerated";

export function getS3PutParams(data: any, Key: string): PutObjectRequest {
  const Bucket = getS3BucketGenerated();
  return {
    Body: JSON.stringify(data),
    Bucket,
    ContentType: "application/json",
    Key,
  };
}
