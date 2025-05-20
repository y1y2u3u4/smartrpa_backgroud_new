# 任务执行器设计与实现

SmartRPA Background Service 项目中的任务执行器采用面向对象的设计模式，通过继承和多态实现不同类型任务的执行逻辑。本文档详细介绍任务执行器的设计原理和实现方式。

## 任务执行器基础架构

### 基类: Task

`Task` 是所有任务执行器的基类，提供了基础的任务属性和方法：

```javascript
export class Task {
    constructor(type, element, value, sortedData_new, task_name, cityname) {
        this.type = type;          // 任务类型
        this.element = element;    // 操作元素
        this.value = value;        // 任务值
        this.sortedData_new = sortedData_new;  // 任务数据
        this.task_name = task_name;    // 任务名称
        this.cityname = cityname;      // 城市名称
        this.status = 'pending';       // 任务状态
        this.result = null;            // 任务结果
    }
    
    // 抽象方法，子类必须实现
    async execute(page) {
        throw new Error("Method 'execute()' must be implemented.");
    }
}
```

## 任务执行器类型

系统实现了多种任务执行器，每种都专注于特定类型的操作：

### 1. ClickTask (点击任务)

处理页面元素的点击操作，支持多种元素选择方式和点击后的行为处理。

```javascript
export class ClickTask extends Task {
    constructor(element, browser) {
        super('click', element);
        this.browser = browser;  // 浏览器实例
    }
    
    async execute(page) {
        // 实现点击逻辑
        // ...
    }
}
```

### 2. InputTask (输入任务)

处理表单输入操作，支持各种输入控件的文本输入。

```javascript
export class InputTask extends Task {
    constructor(element, value, sortedData_new) {
        super('input', element, value, sortedData_new);
    }
    
    async execute(page) {
        // 实现输入逻辑
        // ...
    }
}
```

### 3. OutputTask (输出任务)

处理数据提取和输出操作，从页面中获取所需数据并进行结构化处理。

```javascript
export class OutputTask extends Task {
    constructor(element, value, sortedData_new, task_name, cityname) {
        super('output', element, value, sortedData_new, task_name, cityname);
        this.data = null;  // 存储提取的数据
    }
    
    async execute(page) {
        // 实现数据提取逻辑
        // ...
    }
}
```

### 4. KeydownTask (按键任务)

处理键盘按键事件，模拟用户键盘输入。

```javascript
export class KeydownTask extends Task {
    constructor(element, value) {
        super('keydown', element, value);
    }
    
    async execute(page) {
        // 实现按键逻辑
        // ...
    }
}
```

### 5. NavigationTask (导航任务)

处理页面导航操作，如跳转到指定URL。

```javascript
export class NavigationTask extends Task {
    constructor(element, value) {
        super('navigation', element, value);
    }
    
    async execute(page) {
        // 实现导航逻辑
        // ...
    }
}
```

### 6. ScrollTask (滚动任务)

处理页面滚动操作，支持不同的滚动方式和条件。

```javascript
export class ScrollTask extends Task {
    constructor(element, value) {
        super('scroll', element, value);
    }
    
    async execute(page) {
        // 实现滚动逻辑
        // ...
    }
}
```

## 特定网站的任务执行器

系统针对不同网站实现了特定的任务执行器，每个执行器都包含了该网站特有的交互和数据提取逻辑：

1. **OZON相关**: `taskExecutor_OZON.js`, `taskExecutor_OZON_003.js`, `taskExecutor_OZON_SKU.js`等
2. **电商平台**: `taskExecutor_ama_dianpu.js`, `taskExecutor_waimai_meituan.js`, `taskExecutor_waimai_jingdong.js`等
3. **社交媒体**: `taskExecutor_xiaohongshu.js`, `taskExecutor_douyin.js`等
4. **生活服务**: `taskExecutor_dianping.js`, `taskExecutor_nvzhuang.js`等

## 任务执行流程

1. **任务实例化**: 根据任务配置创建相应的任务执行器实例
2. **执行准备**: 设置必要的参数和环境
3. **执行任务**: 调用execute()方法执行实际操作
4. **处理结果**: 处理执行结果，包括成功和错误情况
5. **返回数据**: 返回结构化的数据结果

## 扩展和定制

要添加新的任务执行器，只需：

1. 继承`Task`基类
2. 实现`execute()`方法
3. 根据需要添加特定功能

例如，添加一个新的任务类型：

```javascript
export class CustomTask extends Task {
    constructor(element, value, sortedData_new, task_name, cityname) {
        super('custom', element, value, sortedData_new, task_name, cityname);
        // 自定义属性
        this.customProperty = null;
    }
    
    async execute(page) {
        // 自定义执行逻辑
        // ...
        return result;
    }
}
```

## 最佳实践

1. **错误处理**: 在任务执行过程中实现全面的错误处理
2. **日志记录**: 记录任务执行的关键步骤和结果
3. **性能优化**: 避免不必要的DOM操作和长时间运行
4. **元素选择**: 使用稳定且唯一的选择器
5. **超时控制**: 为每个操作实现合适的超时机制