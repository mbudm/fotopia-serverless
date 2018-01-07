'use strict';
const AWS = require('aws-sdk');
const glob = require('glob');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types')

const messagePrefix = 'S3 Local Sync';

class ServerlessS3LocalSync {
  constructor(serverless, options) {
    this.serverless = serverless;
    this.options = options;
    this.s3Sync = this.serverless.service.custom.s3Sync;
    this.servicePath = this.serverless.service.serverless.config.servicePath;


    this.commands = {
      's3-local-sync': {
        usage: 'Syncs files from a local dir to \'s3 buckets\' created by the serverless-s3-local plugin',
        lifecycleEvents: [
          'sync',
        ],
        options: {
          port: {
            usage:
              'Specify the port you are using for local s3 buckets',
            required: false,
            shortcut: 'p',
          },
        },
      },
    };

    this.hooks = {
      'before:s3-local-sync:sync': this.beforeSync.bind(this),
      's3-local-sync:sync': this.sync.bind(this),
      'before:offline:start:init': this.sync.bind(this),
      'before:offline:start': this.sync.bind(this),
      'before:offline:start:end': this.afterSync.bind(this),
      'after:s3-local-sync:sync': this.afterSync.bind(this),
    };

    const port = this.options.port || 5000;
    this.client = new AWS.S3({
      s3ForcePathStyle: true,
      endpoint: new AWS.Endpoint(`http://localhost:${port}`),
    });
  }

  beforeSync() {
    this.serverless.cli.log(`beforeSync `);
  }

  sync() {
    if (!Array.isArray(this.s3Sync)) {
      cli.consoleLog(`${messagePrefix} s3Sync is not an array`, this.s3Sync);
      return Promise.resolve();
    }
    const servicePath = this.servicePath;
    const client = this.client;
    const cli = this.serverless.cli;
    cli.log(`sync using port: ${this.options.port} + ${servicePath}`);

    const promises = this.s3Sync.map((s) => {
      let bucketPrefix = '';
      if (!s.hasOwnProperty('bucketPrefix')) {
        bucketPrefix = s.bucketPrefix;
      }
      if (!s.bucketName || !s.localDir) {
        throw 'Invalid custom.s3Sync';
      }

      const localDirGlob = path.relative(process.cwd(), s.localDir) +'/**/*';
      cli.consoleLog(`${messagePrefix} Searching for files with pattern ${localDirGlob} to sync to bucket ${s.bucketName}.`)
      return getFileList(localDirGlob)
          .then(fileList => {
            cli.consoleLog(`${messagePrefix} Files found: ${JSON.stringify(fileList)}`);
            return uploadFiles(fileList, s.bucketName, s.localDir, client, cli)
          });
    });

    return Promise.all(promises)
      .then(() => {
        cli.printDot();
        cli.consoleLog('');
        cli.consoleLog(`${messagePrefix} Synced.`);
      });
  }

  afterSync() {
    this.serverless.cli.log(`afterSync `);
  }

}

function getFileList(pattern = '**/*', opts = null) {
  return new Promise((resolve, reject) => {
    glob(pattern, opts, (er, files) => {
      if (er) {
        reject(er);
      } else {
        resolve(files);
      }
    });
  });
}

function uploadFiles(fileList, bucketName, localDir, client, cli){
  return Promise.all(fileList.map(file => uploadFile(file, bucketName, localDir, client, cli)))
}

function uploadFile(filePath, bucketName, localDir, client, cli){
  return new Promise((resolve, reject) => {
    const params = {
      Key: cleanFilePathOfLocalDir(filePath, localDir),
      Bucket: bucketName,
      Body: fs.createReadStream(filePath),
      ContentType: mime.lookup(filePath),
    };
    cli.consoleLog(`${messagePrefix} Uploading.. ${JSON.stringify(params)}`);
    client.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve('done');
      }
    });
  })
}

function cleanFilePathOfLocalDir(filePath, localDir){
  return filePath.slice(localDir.length).replace(/^(\/)/,'');
}


module.exports = ServerlessS3LocalSync;
