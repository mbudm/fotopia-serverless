## AWS CLI - helpful cmds

The rekognition CLI seems to default to your local region, so if you are using say us-east-1 you need to flag it:
`aws rekognition list-collections --region us-east-1`

# mono idea

packages
/common
 types libs and anything from common that isn't tied to a specific lambda
/indexes
 crud for indexes (tags/people)
 2 lambdas and a db
/fotos
 crud for photos
 many lambdas
 1 db
 1 s3 bucket
/thumbs
 image processing work
 2 lambdas
 - resize
 - crop area
 1 s3 bucket
/rekognition
 listens to fotos db updates
 gets rekognitions data
 works out people
 updates people indexes and tag indexes

// update/add index
sls invoke -f indexesUpdate -s alpha --data '{"body":"{\"indexUpdate\":{\"tags\":{\"butterfly\":1}}}'

//get 
sls invoke -f indexes -s alpha 


// reset the indexes table
aws dynamodb delete-item --table-name fotopia-web-app-alpha-indexes --key '{"id":{"S":"tags"}}' --region us-east-1
aws dynamodb delete-item --table-name fotopia-web-app-alpha-indexes --key '{"id":{"S":"people"}}' --region us-east-1
