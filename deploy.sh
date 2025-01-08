#!/bin/sh
DOCUMENT_ROOT=/var/www/sources

# Take site offline
echo "Taking site offline..."
touch $DOCUMENT_ROOT/maintenance.file

# Swap over the content
echo "Deploying content..."
mkdir -p $DOCUMENT_ROOT/Niconico
cp build/NiconicoIcon.png $DOCUMENT_ROOT/Niconico
cp build/NiconicoConfig.json $DOCUMENT_ROOT/Niconico
cp build/NiconicoScript.js $DOCUMENT_ROOT/Niconico
sh sign.sh $DOCUMENT_ROOT/Niconico/NiconicoScript.js $DOCUMENT_ROOT/Niconico/NiconicoConfig.json

# Notify Cloudflare to wipe the CDN cache
echo "Purging Cloudflare cache for zone $CLOUDFLARE_ZONE_ID..."
curl -X POST "https://api.cloudflare.com/client/v4/zones/$CLOUDFLARE_ZONE_ID/purge_cache" \
     -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
     -H "Content-Type: application/json" \
     --data '{"files":["https://plugins.grayjay.app/Niconico/NiconicoIcon.png", "https://plugins.grayjay.app/Niconico/NiconicoConfig.json", "https://plugins.grayjay.app/Niconico/NiconicoScript.js"]}'

# Take site back online
echo "Bringing site back online..."
rm $DOCUMENT_ROOT/maintenance.file
