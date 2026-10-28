#!/bin/sh
set -eu

IMAGE_NAME=${IMAGE_NAME:-r3ne/einsatzauftrag}
IMAGE_TAG=${IMAGE_TAG:-$(date +%Y%m%d)}

cd "$(dirname "$0")/.."
docker build \
	--tag "${IMAGE_NAME}:${IMAGE_TAG}" \
	--tag "${IMAGE_NAME}:latest" \
	--file Dockerfile .

printf 'Built image: %s:%s\n' "$IMAGE_NAME" "$IMAGE_TAG"
printf 'Run locally with: docker run --rm -p 8080:8080 %s:%s\n' "$IMAGE_NAME" "$IMAGE_TAG"

docker push "${IMAGE_NAME}:${IMAGE_TAG}"
docker push "${IMAGE_NAME}:latest"
