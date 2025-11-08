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
    local push_image=false
    local full_tag="$DOCKER_REPO/$image_name:$IMAGE_TAG"
    local SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
    local PROJECT_ROOT=$(realpath "$SCRIPT_DIR/..")
    local dockerfile_path="$SCRIPT_DIR/$image_name/Dockerfile"


    echo "----------------------------------------------------"
    echo "Processing image: '$image_name'"
    echo "----------------------------------------------------"
    echo "Please choose an option:"
    echo "  1) Build with cache and PUSH to repository"
    echo "  2) Build with NO cache and PUSH to repository"
    echo "  3) Build with cache LOCALLY only"
    echo "  4) Build with NO cache LOCALLY only"
    echo "  5) Skip this image"
    read -p "Enter your choice (1-5): " choice

    case "$choice" in
        1) build_flag=""; push_image=true;;
        2) build_flag="--no-cache"; push_image=true;;
        3) build_flag=""; push_image=false;;
        4) build_flag="--no-cache"; push_image=false;;
        5) echo "Skipping '$image_name' image."; return;;
        *) echo "Invalid option. Skipping '$image_name'."; return;;
    esac

    if ! docker build $build_flag -t "$full_tag" --platform linux/arm64 -f "$dockerfile_path" "$PROJECT_ROOT"; then
        echo "ERROR: Failed to build the '$image_name' image."
        if [ "$is_critical" = true ]; then
            exit 1
        fi
        return
    fi
    echo "'$image_name' image built successfully."

    if [ "$push_image" = true ]; then
        echo "Pushing '$image_name'..."
        if ! docker push "$full_tag"; then
            echo "ERROR: Failed to push the '$image_name' image."
            if [ "$is_critical" = true ]; then
                exit 1
            fi
            return
        fi
        echo "'$image_name' image pushed successfully as $full_tag."
    else
        echo "'$image_name' was built locally and NOT pushed."
    fi
}

build_and_push "base" true

declare -a images=("app" "nginx" "n8n")
for image in "${images[@]}"; do
    build_and_push "$image" false
done

echo "=========================================="
echo "Build and push process completed."
echo "All selected images have been processed with tag '$IMAGE_TAG'."
echo "=========================================="
