import { S3 } from "aws-sdk";
import { ISetupData } from "../types";


export default function init(setupData: ISetupData) {
  const client = new S3();
  const uploader = (key: string, object: any, options: any) => {
    const params = {
      Body: object,
      Bucket: setupData.bucket!,
      Key: `protected/${setupData.userIdentityId!}/${key}`,
      ContentType: options.contentType,
    }
    return client.putObject(params).promise()
  }
  return uploader;
}
