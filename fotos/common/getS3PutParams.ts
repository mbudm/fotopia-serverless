import { PutObjectRequest } from "aws-sdk/clients/s3";
import getS3Bucket from "./getS3Bucket";

export function getS3PutParams(data: any, Key: string): PutObjectRequest {
  const Bucket = getS3Bucket();
  return {
    Body: JSON.stringify(data),
    Bucket,
    ContentType: "application/json",
    Key,
  };
}
