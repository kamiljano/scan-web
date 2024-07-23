#! /bin/bash

set -e

echo "Deploying container to Kubernetes cluster whose port 5000 is forwarded..."

kubectl -n scanweb port-forward service/docker-registry 5000:5000 > /dev/null &

PORT_FORWARD_PID=$!

echo "Port 5000 forwarded from Kubernetes cluster."

docker build -t scanweb:latest -t localhost:5000/scanweb .

echo "Docker image built. Pushing to registry..."

docker push localhost:5000/scanweb

echo "Docker image pushed to registry."

kill $PORT_FORWARD_PID

echo "Successfully deployed container to Kubernetes cluster."