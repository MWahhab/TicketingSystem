set -e

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

BASE_PATH="$SCRIPT_DIR/base"
OVERLAY_PATH="$SCRIPT_DIR/overlays/prod"

RECREATE=false
if [[ "$1" == "--recreate" ]]; then
    RECREATE=true
elif [[ -n "$1" ]]; then
    echo "❌ Error: Unknown argument '$1'."
    echo "Usage: $0 [--recreate]"
    exit 1
fi

if [ ! -d "$OVERLAY_PATH" ]; then
    echo "❌ Error: The production overlay directory '$OVERLAY_PATH' was not found."
    exit 1
fi

cleanup_resources() {
    echo "======================================================="
    echo "🔥 --recreate flag detected. Deleting existing resources..."
    echo "🔥 WARNING: This will delete any data in the volumes if their reclaim policy is 'Delete'."
    echo "======================================================="
    echo ""

    echo "--- Deleting all resources from '$OVERLAY_PATH' in the default namespace (will not wait) ---"
    kubectl kustomize "$OVERLAY_PATH" | kubectl delete --wait=false -f - --ignore-not-found=true

    echo "Waiting 10 seconds for resources to begin termination..."
    sleep 10

    echo "--- Deleting PersistentVolumes defined in base ---"
    if [ -d "$BASE_PATH/persistentVolumes" ]; then
        kubectl kustomize "$BASE_PATH/persistentVolumes" | kubectl delete --wait=false -f - --ignore-not-found=true
    fi

    echo ""
    echo "✅ Cleanup commands sent. Proceeding with deployment."
    echo "-------------------------------------------------------"
    echo ""
}

if [[ "$RECREATE" == true ]]; then
    cleanup_resources
fi

echo "🚀 Starting Kubernetes deployment..."

echo "--- Applying Persistent Volumes and Claims from base ---"
kubectl apply -k "$BASE_PATH/persistentVolumes"
echo ""

echo "--- Applying Kustomize overlay to the default namespace ---"
kubectl kustomize "$OVERLAY_PATH" | kubectl apply -f -
echo ""

echo "-------------------------------------------------------"
echo "✅ Deployment complete."