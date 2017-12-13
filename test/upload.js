const AWS = require('aws-sdk');
const fs = require('fs');

module.exports = function(pathToFile, bucket, key){
  return new Promise((resolve, reject) => {
    const config = {
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint('http://localhost:5000')
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
        reject(err);
      }else{
        resolve(data);
      }
    });
  });
}
