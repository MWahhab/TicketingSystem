#!/bin/bash

DOCKER_REPO="mrnaga619"

read -p "Enter image tag: " IMAGE_TAG

if [ -z "$IMAGE_TAG" ]; then
    echo "Image tag cannot be empty."
    exit 1
fi

if ! docker login; then
    echo "Failed to login to Docker Hub."
    exit 1
fi

echo "Building and pushing the base image..."
BASE_IMAGE_TAG="$DOCKER_REPO/base:$IMAGE_TAG"
if ! docker build --no-cache -t "$BASE_IMAGE_TAG" --platform linux/arm64 -f buildDeployFiles/base/Dockerfile .; then
    echo "Failed to build the base image."
    exit 1
fi
if ! docker push "$BASE_IMAGE_TAG"; then
    echo "Failed to push the base image."
    exit 1
fi
echo "Base image pushed successfully."

declare -a images=("app" "node" "n8n")

build_and_push() {
    local image=$1
    local full_tag="$DOCKER_REPO/$image:$IMAGE_TAG"

    echo "Building and pushing $image..."
    if docker build --no-cache -t "$full_tag" --platform linux/arm64 -f "buildDeployFiles/$image/Dockerfile" .; then
        docker push "$full_tag"
        echo "$image pushed successfully."
    else
        echo "Failed to build or push $image."
    fi
}

for image in "${images[@]}"
do
    build_and_push "$image"
done

echo "All selected images pushed with tag $IMAGE_TAG."