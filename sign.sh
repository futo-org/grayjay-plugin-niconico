#!/bin/sh

# Parameters
JS_FILE_PATH=$1
CONFIG_FILE_PATH=$2

# Decode and save the private key to a temporary file
echo "$SIGNING_PRIVATE_KEY" | base64 -d > tmp_private_key.pem

# Validate private key
if ! openssl rsa -check -noout -in tmp_private_key.pem > /dev/null 2>&1; then
  echo "Invalid private key."
  rm tmp_private_key.pem
  exit 1
fi

# Generate signature for the provided JS file
SIGNATURE=$(cat $JS_FILE_PATH | openssl dgst -sha512 -sign tmp_private_key.pem | base64 -w 0)
if [ $? -ne 0 ]; then
  echo "Failed to generate signature."
  rm tmp_private_key.pem
  exit 1
fi

# Extract public key from the temporary private key file
PUBLIC_KEY=$(openssl rsa -pubout -outform DER -in tmp_private_key.pem 2>/dev/null | openssl pkey -pubin -inform DER -outform PEM | tail -n +2 | head -n -1 | tr -d '\n')
if [ $? -ne 0 ]; then
  echo "Failed to extract public key."
  rm tmp_private_key.pem
  exit 1
fi

echo "SIGNATURE: $SIGNATURE"
echo "PUBLIC_KEY: $PUBLIC_KEY"

# Remove temporary key files
rm tmp_private_key.pem

# Update "scriptSignature" and "scriptPublicKey" fields in Config JSON
jq --arg signature "$SIGNATURE" --arg publicKey "$PUBLIC_KEY" '. + {scriptSignature: $signature, scriptPublicKey: $publicKey}' "$CONFIG_FILE_PATH" > temp_config.json
if [ $? -ne 0 ]; then
  echo "Failed to update JSON file."
  rm temp_config.json
  exit 1
fi

mv temp_config.json "$CONFIG_FILE_PATH"
if [ $? -ne 0 ]; then
  echo "Failed to replace the original JSON file."
  rm temp_config.json
  exit 1
fi

echo "JSON file updated successfully."
