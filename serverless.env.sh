#!/bin/sh

FILE="serverless.env.yml"

export $(egrep -v '^#' .env | xargs)

echo "dev:" > $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_DEV" >> $FILE
echo "  USE_CUSTOM_DOMAIN: $USE_CUSTOM_DOMAIN_DEV" >> $FILE
echo "prod:" >> $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_PROD" >> $FILE
echo "  USE_CUSTOM_DOMAIN: $USE_CUSTOM_DOMAIN_PROD" >> $FILE
echo "alpha:" >> $FILE
echo "  CUSTOM_DOMAIN: $CUSTOM_DOMAIN_ALPHA" >> $FILE
echo "  USE_CUSTOM_DOMAIN: $USE_CUSTOM_DOMAIN_ALPHA" >> $FILE
echo "FOTOPIA_GROUP: $FOTOPIA_GROUP" >> $FILE
echo "NAME_SPACE: $NAME_SPACE" >> $FILE
