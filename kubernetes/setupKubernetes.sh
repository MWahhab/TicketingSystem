set -e

cleanup_resources() {
    echo "======================================================="
    echo "🔥 --recreate flag detected. Deleting existing resources..."
    echo "🔥 WARNING: This will delete any data in the volumes."
    echo "======================================================="
    echo ""

    echo "--- Deleting CronJobs ---"
    kubectl delete -f cronjobs/ --ignore-not-found=true
    echo "--- Deleting Ingress ---"
    kubectl delete -f ingress.yaml --ignore-not-found=true
    echo "--- Deleting Services ---"
    kubectl delete -f services/ --ignore-not-found=true
    echo "--- Deleting Deployments ---"
    kubectl delete -f deployments/ --ignore-not-found=true
    echo "--- Deleting StatefulSets ---"
    kubectl delete -f statefulsets/ --ignore-not-found=true
    echo "--- Deleting ConfigMaps ---"
    kubectl delete -f configMaps/ --ignore-not-found=true
    echo "--- Deleting SealedSecrets ---"
    kubectl delete -f sealedSecrets/ --ignore-not-found=true
    kubectl delete secret sealed-env-secret --ignore-not-found=true
    echo "--- Deleting PersistentVolumeClaims ---"
    kubectl delete -f persistentVolumeClaims/ --ignore-not-found=true
    
    echo "Waiting 5 seconds for volumes to detach..."
    sleep 5

    echo "--- Deleting PersistentVolumes ---"
    kubectl delete -f persistentVolumes/ --ignore-not-found=true

    echo ""
    echo "✅ Cleanup complete. Proceeding with deployment."
    echo "-------------------------------------------------------"
    echo ""
}


apply_files_in_dir() {
    local dir_path="$1"
    if [ ! -d "$dir_path" ]; then
        echo "Directory '$dir_path' not found, skipping."
        return
    fi

    echo "--- Applying files in $dir_path ---"
    kubectl apply -f "$dir_path"
    echo ""
}

if [[ "$1" == "--recreate" ]]; then
    cleanup_resources
fi

echo "🚀 Starting Kubernetes deployment..."

apply_files_in_dir "persistentVolumes"
apply_files_in_dir "persistentVolumeClaims"

apply_files_in_dir "sealedSecrets"
apply_files_in_dir "configMaps"

apply_files_in_dir "statefulsets"
apply_files_in_dir "deployments"

apply_files_in_dir "services"

echo "--- Applying Ingress ---"
if [ -f "ingress.yaml" ]; then
    kubectl apply -f "ingress.yaml"
    echo ""
else
    echo "ingress.yaml not found, skipping."
    echo ""
fi

apply_files_in_dir "cronjobs"


echo "-------------------------------------------------------"
echo "✅ All Kubernetes YAML files have been applied successfully."