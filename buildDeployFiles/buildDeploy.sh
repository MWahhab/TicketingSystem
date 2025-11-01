#!/bin/bash

DOCKER_REPO="deampuleadd"

if [ ! -d "node_modules" ] || [ ! -d "vendor" ]; then
    echo "Warning: Either the 'node_modules' or 'vendor' directory is missing."
    read -p "Are you sure you want to continue? (y/n): " continue_anyway
    if [ "$continue_anyway" != "y" ]; then
        echo "Operation cancelled by user."
        exit 1
    fi
fi

read -p "Are your node_modules and vendor folders 100% up to date? (y/n): " confirmation
if [ "$confirmation" != "y" ]; then
    echo "Please update your dependencies before proceeding."
    exit 1
fi

read -p "Enter the image tag (e.g., 'latest' or '1.2.3'): " IMAGE_TAG
if [ -z "$IMAGE_TAG" ]; then
    echo "Image tag cannot be empty. Aborting."
    exit 1
fi

if ! docker login; then
    echo "Failed to login to Docker Hub. Please check your credentials."
    exit 1
fi

build_and_push() {
    local image_name=$1
    local is_critical=$2
    local build_flag=""

    read -p "Do you want to build and push the '$image_name' image? (y/n): " build_choice
    if [ "$build_choice" != "y" ]; then
        echo "Skipping '$image_name' image."
        return
    fi

    read -p "Build '$image_name' with --no-cache? (y/n): " cache_choice
    if [ "$cache_choice" == "y" ]; then
        build_flag="--no-cache"
    fi

    local full_tag="$DOCKER_REPO/$image_name:$IMAGE_TAG"
    local dockerfile_path="buildDeployFiles/$image_name/Dockerfile"

    echo "----------------------------------------------------"
    echo "Building $image_name..."
    echo "Command: docker build $build_flag -t \"$full_tag\" --platform linux/arm64 -f \"$dockerfile_path\" ."
    echo "----------------------------------------------------"

    if ! docker build $build_flag -t "$full_tag" --platform linux/arm64 -f "$dockerfile_path" .; then
        echo "ERROR: Failed to build the '$image_name' image."
        if [ "$is_critical" = true ]; then
            exit 1
        fi
        return
    fi

    echo "Pushing $image_name..."
    if ! docker push "$full_tag"; then
        echo "ERROR: Failed to push the '$image_name' image."
        if [ "$is_critical" = true ]; then
            exit 1
        fi
        return
    fi

    echo "'$image_name' image pushed successfully as $full_tag."
}

build_and_push "base" true

declare -a images=("app" "node" "n8n")
for image in "${images[@]}"; do
    build_and_push "$image" false
done

echo "=========================================="
echo "Build and push process completed."
echo "All selected images have been processed with tag '$IMAGE_TAG'."
echo "=========================================="