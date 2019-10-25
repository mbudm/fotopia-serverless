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
