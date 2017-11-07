# fotopia-web-app

## Once chaos is tamed..
Ideas for how to organise
- by people
	- some sort of recogniser lib - all photos of x
- by place
- by time


## hosted setup
- find images with people (good to get all unique faces found)
- seed the images with people in them 

## Ongoing use
- browse, by person, time
- add/edit metadata (if its correcting a name then kairos needs to be informed)
- add new photo


## Architecture
Database? or static file for metadata?
Hosting - S3 ~70Gb will be about $2 per month to host

cloudformation file
dynamodb
- image s3 ids & metadata

s3
- browsing photos
- searching by keyword
- adding metadata
- iphone - pwa?

lambda
- upload a photo and categorise via kairos
- save metadata for an image - write new category in kairos
- search db to generate tag/category views

rekognition vs kairos
elasticsearch (see searchable image example here https://aws.amazon.com/rekognition/)

smugmug / google photos
cost vs free and risky that will close down
plus - this is fun

cloudformation script for s3, lambda, ddb:
https://github.com/awslabs/aws-big-data-blog/tree/master/aws-blog-s3-index-with-lambda-ddb

serverless is way easier - these 4 examples combined?

https://github.com/serverless/examples/tree/master/aws-node-auth0-custom-authorizers-api

https://github.com/serverless/examples/tree/master/aws-node-fetch-file-and-store-in-s3

https://github.com/serverless/examples/tree/master/aws-node-rest-api-with-dynamodb

https://github.com/serverless/examples/tree/master/aws-node-rekognition-analysis-s3-image
