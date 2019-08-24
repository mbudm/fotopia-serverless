import { S3 } from "aws-sdk";

export default function createS3Client(): S3 {
  const options = {};

  return new S3(options);
}
