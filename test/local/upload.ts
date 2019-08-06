import createS3Client from "../../fotos/lib/s3";
import * as serverlessEnv from "../../serverlessEnv";

const serverlessEnvConfig = serverlessEnv.config();

export default function upload(key, object, options) {
  return new Promise((resolve, reject) => {
    const client = createS3Client();

    const params = {
      Body: object,
      Bucket: serverlessEnvConfig.LOCAL_TEST_BUCKET,
      Key: key,
      ...options,
    };

    client.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
