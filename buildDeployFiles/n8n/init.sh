#!/bin/sh

echo "=== Running init.sh ==="

for file in /workflows/*.json; do
  echo "Importing: $file"
  n8n import:workflow --input="$file"
done

exec n8n