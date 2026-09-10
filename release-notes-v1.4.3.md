# DeepSeek Harness Desktop v1.4.3

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.5-rc.1`**（官方 latest，2026-09-10 发布）。

---

## ⚠️ 升级前请注意（破坏性变更）

- **会话数据格式升级至 V3**：旧日志会通过版本迁移生成新日志并**保留原文件**，但**升级后不支持降级读取**。如需回退到旧版本使用会话，请先用当前版本导出。
- 插件/custom 开发者需注意：`Session` 生命周期 API、Inbox API、Web 插件面板 API、persona 配置结构均有调整。

---

## 🆕 本版本新增

### 桌面端改进
- **更新通道支持自定义 URL（generic）**：`updater.config.json` 的 `provider` 现支持设为 `generic` 并配合 `url` 字段，将自动更新托管切换到任意可直链访问的国内对象存储/CDN（七牛、腾讯云 COS、阿里云 OSS 等），解决 GitHub 国内访问不稳定的问题

### 内置 dsh v0.1.5-rc.1 更新（摘要）
**新增功能**
- **DeepSeek 模型适配器新增 `DeepSeek-V41-Flash`（`deepseek-flash`）**：支持文本、图片及会话历史中的系统提示词更新；新会话默认使用该模型
- **Web 支持上传任意类型文件**：文件与图片可在同一预览区混排，后台上传支持进度、取消与会话切换续显
- **可继续对话的子代理**：支持消息排队、编辑、删除、单条或全部 Steer 与停止
- **Web 右侧 Sidebar 增强**：多标签、分栏、全屏，支持 Markdown、代码、HTML、PDF 和图片预览
- **系统提示词动态修改**：可在不破坏 KV Cache 的前提下修改
- **网络代理支持**：所有出站请求遵循 `HTTP_PROXY`、`HTTPS_PROXY`、`ALL_PROXY`、`NO_PROXY`
- **Web 顶栏「在应用中打开」**：可用已安装的编辑器、IDE、终端或文件管理器打开 Workspace
- 模型探测增强：支持自定义提供商的 `models` 对象与 Anthropic 原生模型列表

**体验优化**
- 会话内可直接显示顶层与嵌套 `read_image` 的图片结果、回复中引用的本地图片路径
- Skill 选择器支持模糊搜索；内置斜杠命令说明支持中文并随界面语言更新
- Windows 上的本地非终端子进程不再弹出控制台窗口
- 改善长会话打开、恢复与持续对话的卡顿，降低内存占用
- PTC 模式下支持展开查看命令及其输出

**问题修复（节选）**
- 修复 DeepSeek 流式工具调用续传分片用空值覆盖调用 ID 或名称的问题
- 修复 Web 断线后无法自动恢复的问题
- 修复发送消息或调整窗口后聊天不再自动滚动到底部的问题
- 修复 Windows 盘符根目录 Workspace 的路径分隔符、标题与绝对路径校验
- 修复 Windows Web 界面原生文件夹选择器可能在其他窗口后方打开的问题
- 修复模型目录变化后失效的 pi-ai 配置导致整个模型设置入口消失的问题
- 拒绝不含正文或附件的空消息，保留仅发送图片或文件的能力

完整变更：https://github.com/deepseek-ai/deepseek-harness/compare/dsh-v0.1.2-rc.1...dsh-v0.1.5-rc.1

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.3.exe`（约 148 MB）
- 校验：可核对安装包 SHA-512 与 `latest.yml` 中一致
- 首次启动需要初始化运行时（约 1 分钟），请耐心等待

## ⬆️ 自动更新

- 系统托盘或「关于」窗口的 **检查更新** 可手动触发
- 旧版本（v1.4.2 及更早）启动后会自动检查并收到 v1.4.3 更新提示

---

MIT © DeepSeek Harness Desktop contributors
