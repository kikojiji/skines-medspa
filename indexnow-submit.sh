#!/bin/bash
# IndexNow submission script for skines.ca
# Run this after deploying changes to submit updated URLs.
#
# Usage:
#   ./indexnow-submit.sh                   — submits all pages
#   ./indexnow-submit.sh head-spa laser    — submits specific pages by slug

KEY="2fd7a0b13667478a77790ff0c725e28d"
HOST="skines.ca"
KEY_LOCATION="https://skines.ca/${KEY}.txt"

ALL_URLS=$(cat <<'URLS'
[
  "https://skines.ca/",
  "https://skines.ca/head-spa",
  "https://skines.ca/facial",
  "https://skines.ca/laser",
  "https://skines.ca/reviews",
  "https://skines.ca/cartes-cadeaux",
  "https://skines.ca/visit-us",
  "https://skines.ca/your-visit",
  "https://skines.ca/parking",
  "https://skines.ca/insurance",
  "https://skines.ca/tirage"
]
URLS
)

if [ $# -gt 0 ]; then
  # Build URL list from arguments
  URL_LIST="["
  for slug in "$@"; do
    URL_LIST+="\"https://skines.ca/${slug}\","
  done
  URL_LIST="${URL_LIST%,}]"
else
  URL_LIST="$ALL_URLS"
fi

PAYLOAD=$(cat <<EOF
{
  "host": "${HOST}",
  "key": "${KEY}",
  "keyLocation": "${KEY_LOCATION}",
  "urlList": ${URL_LIST}
}
EOF
)

echo "Submitting to IndexNow (Bing)..."
curl -s -o /tmp/indexnow-response.json -w "HTTP %{http_code}" \
  -X POST "https://api.indexnow.org/indexnow" \
  -H "Content-Type: application/json; charset=utf-8" \
  -d "$PAYLOAD"

echo ""
echo "Response:"
cat /tmp/indexnow-response.json 2>/dev/null || echo "(empty body — HTTP 200/202 means accepted)"
echo ""
