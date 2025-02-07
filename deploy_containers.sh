#!/bin/bash

# 定义基础命令
BASE_CMD="gcloud run deploy"
IMAGE="us-central1-docker.pkg.dev/civil-zodiac-422613-b7/cloud-run-source-deploy/test_1:latest"
COMMON_PARAMS="--timeout 3000s --cpu 1 --memory 2Gi --max-instances 5 --port 8081 --region us-central1 --set-env-vars ENVIRONMENT=cloud"

# 定义容器名称数组
CONTAINERS=("test1-container-001" "test1-container-002" "test1-container-003" "test1-container-004" "test1-container-005" "test1-container-006" "test1-container-007" "test1-container-008" "test1-container-009" "test1-container-010"
"test1-container-011" "test1-container-012" "test1-container-013" "test1-container-014" "test1-container-015" "test1-container-016" "test1-container-017" "test1-container-018" "test1-container-019" )

# 循环部署每个容器
for container in "${CONTAINERS[@]}"
do
    echo "正在部署 $container..."
    $BASE_CMD $container --image $IMAGE $COMMON_PARAMS
    echo "$container 部署完成"
    echo "----------------------------"
done

echo "所有容器部署完成！"

# chmod +x deploy_containers.sh
# ./deploy_containers.sh