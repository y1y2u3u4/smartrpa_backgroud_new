# SmartRPA 常见问题解答 (FAQ)

## 🤔 基础问题

### Q1: SmartRPA 是什么？
A: SmartRPA 是一个智能网页自动化平台，主要用于电商数据采集和网页自动化操作。它可以模拟人工浏览器操作，自动获取商品信息、价格、评价等数据。

### Q2: 支持哪些网站平台？
A: 目前支持：
- **电商**: OZON、Amazon、京东、淘宝
- **外卖**: 美团外卖、饿了么  
- **社交**: 小红书、抖音
- **生活**: 大众点评
- **其他**: 可扩展支持更多网站

### Q3: 需要什么技术基础？
A: 
- **使用者**: 了解基本的HTTP请求即可
- **开发者**: 需要 JavaScript/Node.js 基础
- **部署**: 了解Linux命令行操作

## 🚀 安装和启动

### Q4: 如何快速启动服务？
A:
```bash
# 1. 安装依赖
npm install

# 2. 启动主服务  
node server.js

# 3. 启动任务管理(新终端)
node task_manager_api.js
```

### Q5: 启动时提示端口被占用怎么办？
A:
```bash
# 查看端口占用
lsof -i :8082
lsof -i :8083

# 杀死占用进程
kill -9 PID号

# 或修改 server.js 中的 PORT 配置
```

### Q6: Docker 如何部署？
A:
```bash
# 构建镜像
docker build -t smartrpa .

# 运行容器
docker run -d -p 8082:8082 -p 8083:8083 smartrpa
```

## 📝 使用问题

### Q7: 如何提交第一个任务？
A:
```bash
curl -X POST http://localhost:8082/scrape \
  -H "Content-Type: application/json" \
  -d '{
    "taskId": "test001",
    "task_name": "OZON_data",
    "row": {"keyword": "手机"}
  }'
```

### Q8: 任务状态有哪些？
A:
- `accepted`: 已接受，准备执行
- `running`: 正在执行中
- `completed`: 执行完成
- `error`: 执行失败

### Q9: 如何查看任务进度？
A:
```bash
# 基本状态
curl "http://localhost:8082/task-status?id=任务ID"

# 详细进度
curl "http://localhost:8082/heartbeat?id=任务ID"
```

### Q10: 任务一直显示运行中怎么办？
A:
1. 检查 `server.log` 日志文件
2. 确认网络连接正常
3. 检查目标网站是否可访问
4. 使用取消任务API强制停止：
```bash
curl -X POST http://localhost:8082/cancel-task \
  -H "Content-Type: application/json" \
  -d '{"taskId": "任务ID"}'
```

## 🔧 配置问题

### Q11: Cookie 失效怎么处理？
A:
1. **自动更新**: 系统会尝试自动重新登录
2. **手动更新**: 修改对应的 `cookie_*.json` 文件
3. **重新获取**: 删除Cookie文件让系统重新登录

### Q12: AdsPower 浏览器如何配置？
A:
```json
{
  "adsPowerId": "10.128.0.3",  // AdsPower服务器IP
  "浏览器id": "browser001"     // 浏览器配置ID
}
```

### Q13: 如何设置AWS云存储？
A: 创建 `.env` 文件：
```env
AWS_ACCESS_KEY_ID=你的访问密钥
AWS_SECRET_ACCESS_KEY=你的秘密密钥  
AWS_REGION=ap-southeast-2
S3_BUCKET_NAME=你的存储桶名称
```

## 🛠️ 开发问题

### Q14: 如何添加新网站支持？
A:
1. 创建执行器文件：`modules/taskExecutor_newsite.js`
2. 继承基类并实现 `execute()` 方法
3. 在 `handler.js` 中注册新任务类型
4. 测试任务配置

### Q15: 任务配置格式是什么？
A:
```json
{
  "taskId": "唯一任务ID",
  "task_name": "任务类型",
  "sortedData": [
    {"type": "input", "element": {...}, "value": "输入值"},
    {"type": "click", "element": {...}},
    {"type": "output", "element": {...}}
  ],
  "row": {
    "keyword": "搜索关键词",
    "浏览器id": "browser001"
  }
}
```

### Q16: 如何自定义数据处理？
A: 创建自定义输出处理器：
```javascript
export class CustomOutputHandler {
  process(data) {
    // 自定义处理逻辑
    return processedData;
  }
}
```

## 🐛 故障排除

### Q17: 常见错误及解决方法

#### 网络超时
- 检查网络连接
- 增加超时时间配置
- 使用代理服务器

#### 元素定位失败  
- 检查CSS选择器是否正确
- 确认页面是否已加载完成
- 更新页面结构适配代码

#### 内存不足
- 增加服务器内存配置
- 减少并发任务数量
- 优化代码内存使用

#### Cookie过期
- 检查登录状态
- 更新Cookie文件
- 重新获取认证信息

### Q18: 如何查看详细日志？
A:
```bash
# 实时查看主服务日志
tail -f server.log

# 查看任务管理日志
tail -f nohup.out

# 查看特定任务日志
grep "任务ID" server.log
```

### Q19: 性能优化建议
A:
1. **合理设置并发数**: 根据服务器性能调整
2. **使用Cookie缓存**: 避免重复登录
3. **优化选择器**: 使用高效的CSS选择器
4. **定期清理**: 清理临时文件和日志

## 📊 监控和维护

### Q20: 如何监控服务状态？
A:
```bash
# 检查服务进程
ps aux | grep node

# 检查端口监听
netstat -tlnp | grep :8082

# 查看服务状态
curl http://localhost:8082/heartbeat
```

### Q21: 定期维护任务
A:
1. **日志轮转**: 定期清理或压缩日志文件
2. **Cookie更新**: 定期检查和更新登录凭证
3. **监控告警**: 设置服务异常告警
4. **性能优化**: 监控资源使用情况

## 🔒 安全问题

### Q22: 如何保护敏感信息？
A:
1. **使用环境变量**: 不在代码中硬编码密钥
2. **权限控制**: 限制文件访问权限
3. **网络安全**: 使用防火墙和VPN
4. **定期更新**: 及时更新依赖库

### Q23: 反爬虫如何应对？
A:
1. **使用代理**: 轮换IP地址
2. **延迟控制**: 设置合理的请求间隔
3. **浏览器指纹**: 使用AdsPower等工具
4. **User-Agent轮换**: 模拟不同浏览器

## 📞 获取帮助

### Q24: 在哪里可以获得支持？
A:
- 📖 查看项目文档：`README.md`、`项目说明.md`
- 🔧 查看配置示例：`config/` 目录
- 📝 参考任务示例：`test_*.json` 文件
- 🐛 提交问题：GitHub Issues
- 💬 技术交流：项目讨论区

---

*如果这份FAQ没有解决你的问题，请查看 [详细项目说明](./项目说明.md) 或提交Issue。*