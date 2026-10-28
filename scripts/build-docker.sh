#!/bin/sh
set -eu

IMAGE_NAME=${IMAGE_NAME:-einsatzauftrag}
IMAGE_TAG=${IMAGE_TAG:-latest}

cd "$(dirname "$0")/.."
docker build --tag "${IMAGE_NAME}:${IMAGE_TAG}" --file Dockerfile .

printf 'Built image: %s:%s\n' "$IMAGE_NAME" "$IMAGE_TAG"
printf 'Run locally with: docker run --rm -p 8080:8080 %s:%s\n' "$IMAGE_NAME" "$IMAGE_TAG"
