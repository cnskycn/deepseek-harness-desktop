# DeepSeek Harness Desktop v1.4.6

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.6-alpha.1`**（官方 npm `alpha` 通道最新，2026-09-15 发布）。

---

## 🆕 内置 dsh v0.1.6-alpha.1 更新（摘要）

### 新增功能

- **Web 侧边栏新增终端**：支持多标签、Shell 选择、刷新后恢复
- **已归档会话列表**：设置中可查看和恢复已归档会话
- **MCP 增强**：支持发现和读取 MCP 资源、使用 URI 模板；内置 Profile 配置 MCP 服务器后可使用共享资源工具
- **Headless 增强**：支持从标准输入接收任务、`--session-id` 继续已有会话、`--json` 逐行输出运行事件
- **远端工作区**：扩展文件、命令及 PTC 工具，支持 DSH 在本地运行、通过 SSH 使用远端工作区
- **实验性 Browser Use**：包含 Playwright MCP、Chrome DevTools MCP 和 Stagehand 浏览器后端
- **实验性 Computer Use**：可通过 Cua Driver MCP 或原生驱动操作本机、获取截图
- **实验性 Auto review 模式**

### 体验优化

- 文件、Skill 引用及交付文件链接**默认由侧边栏预览**
- **为适配 DeepSeek V4.1**，调整图片缩放和 Token 估算，提高默认请求图片尺寸和编码质量
- **MCP 升级至官方 SDK v2**：支持协议协商、工具分页，以及未提供工具的服务器
- Node PTC 的 `run_code` 支持**按次设置超时**（默认 120 秒、最多 600 秒）
- 提升持久 Bash 处理大量历史输出时的效率
- Trajectory 支持展开和复制 JSON 字符串、查看 PTC 代码及调用结果
- 优化文件预览（保留文件树滚动位置，图片/PDF 随面板适配）
- 输入框加号菜单分组调整，统一斜杠菜单中英文命令展示
- 连接提示区分自动与手动重连、支持点击重试
- 支持在 Agent Presets 设置中关闭模式切换 UI
- 轮次运行超过一小时后，耗时按小时/分钟/秒显示
- 推理和压缩摘要展开后标题吸顶，不遮挡代码复制按钮

### 问题修复

- 修复会话最近更新排序，保留刷新后的手动顺序，新建空白会话置顶
- 修复按轮次分叉时带入后续输入和设置的问题
- 修复工具说明含双花括号时 PTC 提示词生成失败或文字被误替换
- 修复 Linux 子进程终止和清理时的等待及退出结果判定
- 可选插件启动失败不再影响其他可用插件；修复 Web 服务恢复后的模块路由注册
- 修复鼠标悬停或键盘聚焦短 Markdown 表格时页面位置跳动
- 文件编辑卡片按行展示改动和上下文，修正增删行数统计
- 子代理完成通知改为仅传递正文，修复推理块导致父会话 Messages 请求失败

---

## 🖥️ 桌面端改动

- 应用版本：`1.4.5` → `1.4.6`
- 内置 dsh：`0.1.5-rc.1` → **`0.1.6-alpha.1`**
- 桌面端功能保持不变（统一品牌图标、`--no-open` 不弹浏览器、检查更新进度提示、启动日志与残留服务自愈等）

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.6.exe`（约 149.5 MB）
- 国内下载（推荐）：https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/DeepSeek-Harness-Setup-1.4.6.exe
- 首次启动或升级后需初始化运行时，通常 30–90 秒；启动页会显示等待进度

## ⬆️ 自动更新

- 主通道：CNB 国内 CDN（`https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/`）
- 备用通道：GitHub Releases（主通道不可用时自动回退）

## 📌 说明

- 上游 dsh 处于 developer preview，`0.1.6-alpha.1` 属**预发布版**；如遇异常可回退安装 v1.4.5（内置 `0.1.5-rc.1`，官方 `latest`）
- 完整上游变更：https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.6-alpha.1

---

Apache-2.0 © DeepSeek Harness Desktop contributors
