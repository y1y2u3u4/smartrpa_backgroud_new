#!/bin/bash

while true; do
  if ! pgrep -f "node.*task_manager_api.js" > /dev/null; then
    echo "$(date): 任务管理器已停止，正在重启..." >> restart.log
    nohup node --max-old-space-size=4096 task_manager_api.js > task_manager_api.log 2>&1 &
  fi
  sleep 60
done