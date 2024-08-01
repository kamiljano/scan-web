#! /bin/bash

set -e

doctl registry login

docker build --platform linux/amd64 -t scanweb:latest -t registry.digitalocean.com/scanweb/scanweb .

echo "Docker image built. Pushing to registry..."

docker push registry.digitalocean.com/scanweb/scanweb 

echo "Successfully deployed container to Digital Ocean cluster."