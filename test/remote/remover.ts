import { S3 } from "aws-sdk";
import { ISetupData } from "../types";

export default function init(setupData: ISetupData) {
  const client = new S3();
  const remover = (key: string) => {
    const params = {
      Bucket: setupData.bucket!,
      Key: `protected/${setupData.userIdentityId!}/${key}`,
    };
    return client.deleteObject(params).promise();
  };
  return remover;
}
