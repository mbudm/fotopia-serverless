const AWS = require('aws-sdk');
const fs = require('fs');

module.exports = function(pathToFile, bucket, key, s3Url){
  return new Promise((resolve, reject) => {
    const config = {
      s3ForcePathStyle: true
    }
    if(s3Url){
      config.endpoint = new AWS.Endpoint(s3Url);
    }

    const client = new AWS.S3(config)

    const params = {
      Key: key,
      Bucket: bucket,
      Body: fs.createReadStream(pathToFile),
      ContentType: "image/jpeg"
    }

    client.upload(params, function uploadCallback (err, data) {
      if(err){
        reject({params, err});
      }else{
        resolve(data);
      }
    });
  });
}
