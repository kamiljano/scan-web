#! /bin/bash

set -e

eval $(minikube docker-env)

docker build -t scanweb:latest -t localhost:5000/scanweb .

echo "Docker image built. Pushing to registry..."

docker push localhost:5000/scanweb

echo "Successfully deployed container to Kubernetes cluster."