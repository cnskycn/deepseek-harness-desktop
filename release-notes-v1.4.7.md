# DeepSeek Harness Desktop v1.4.7

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.7-rc.1`**（官方 npm `next` 通道最新，2026-09-23 发布）。

---

## ⚡ 启动速度大幅提升（本版重点）

| 场景 | 上一版 1.4.6（dsh 0.1.6-alpha.1） | 本版 1.4.7（dsh 0.1.7-rc.1） |
|---|---|---|
| 冷启动 | 19.2 s | **8.3 s** |
| 热启动 | 15.1 s | **7.9 s** |

从最终**打包产物**实测：**9.1 s** 完成就绪（`127.0.0.1:3080` 开始监听）。

### 提速来源

**1. 上游 dsh 自身优化（主要贡献）**

0.1.7 系列改进了从进程启动到 Web 服务就绪的全链路（会话初始化、模块加载、长会话加载开销等）。

**2. 桌面端启动流程优化（本项目）**

- **内置 Node 检测带缓存**：原实现每次启动都要 spawn **两次**子进程探测版本与 zstd 能力（Windows 上每次 100–500 ms，杀毒软件实时扫描下更久）；现改为**单次探测 + 结果落盘缓存**（以「路径 + 大小 + mtime」为缓存键），命中时零子进程开销
- **并行化**：Node 检测与「3080 端口占用探测」互不依赖，由串行改为 **`Promise.all` 并行**
- **就绪探测更灵敏**：轮询间隔由固定 500 ms 调整为「已拿到带 token 地址后 120 ms / 未拿到时 300 ms」，界面切换更跟手
- **非关键初始化延后**：系统托盘创建与自动更新初始化移到窗口与 dsh 启动之后（`setImmediate`），不再抢占首屏
- **V8 编译缓存**：为 dsh 进程设置 `NODE_COMPILE_CACHE`（配合 `NODE_NO_WARNINGS` 抑制启动期告警输出）

---

## 🆕 内置 dsh v0.1.7-rc.1 更新（摘要）

### 新增功能

- **侧边栏预览 Office 文档**：Word、Excel、PowerPoint、CSV、TSV；Excel 支持工作表、单元格、公式与复制
- **插件管理页**：支持安装、配置、启停和运行时卸载；安装源可选官方 / 国内镜像 / 自定义（首次安装自动选择可访问的源）
- **会话归档管理**：支持置顶、筛选、恢复，并在归档运行中会话时确认受影响的任务
- **Web 侧边栏终端**：多标签、Shell 选择、刷新后恢复
- **会话文件改动审阅**：差异支持逐行 / 左右分栏 / 高亮 / 同步滚动 / 悬停预览
- **MCP**：支持发现和读取资源、使用 URI 模板；MCP SDK 升级至官方 v2（协议协商、工具分页）
- **Headless**：支持从标准输入接收任务、`--session-id` 继续会话、`--json` 逐行输出运行事件
- **远端工作区**：扩展文件、命令及 PTC 工具，通过 SSH 使用远端工作区
- **实验性**：Playwright MCP / Chrome DevTools MCP / Stagehand 浏览器后端、Computer Use（Cua Driver MCP 或原生驱动）、Auto review 模式
- **实验性语音转写**：首次使用自动准备本地模型，可选 Hugging Face 与 HF-Mirror 下载源
- 侧边栏浏览器模式访问指定 URL、侧边栏打开 Subagent 会话、Agent Team 面板
- 聊天中的本地图片可直接查看和放大

### 体验优化

- 图片、PDF 和 Office 预览使用统一缩放控件，保留每个标签页的缩放比例
- 长命令和工作流可转入后台运行，任务面板显示实时输出，完成后继续唤醒所属会话
- **全新安装首次启动时自动创建默认工作区和空白会话**，无需先选择文件夹
- 文件预览在回合结束后自动更新，并响应本地文件变化
- 改善长对话的初始化加载、轮次导航跳转与历史加载开销
- 为适配 DeepSeek V4.1，调整图片缩放和 Token 估算
- 模型页统一为「添加模型提供商」入口

---

## 📦 关于安装包体积

安装包约 **236 MB**（1.4.6 为 149.5 MB）。增量来自上游 0.1.7 为**新增的 Office 文档预览能力**引入的运行时：

| 组件 | 未压缩体积 | 用途 |
|---|---|---|
| `@deepseek-ai/libreoffice-kit-win32-x64` | ~325 MB | 侧边栏预览 Word / Excel / PowerPoint |
| `sherpa-onnx-win-x64` | ~22 MB | 实验性语音转写 |
| `@img/sharp-win32-x64` | ~18 MB | 图片处理 |

> 已实测确认：这些组件均为**按需加载**，不影响启动速度（移除 LibreOffice 后启动耗时无差异）。
> 如完全不需要 Office 文档预览，可告知，可另行提供移除该组件的精简版（预计约 110 MB）。

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.7.exe`（约 236 MB）
- 国内下载（推荐）：https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/DeepSeek-Harness-Setup-1.4.7.exe
- 首次启动或升级后需初始化运行时，通常 10–90 秒；启动页会显示等待进度

## ⬆️ 自动更新

- 主通道：CNB 国内 CDN（`https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/`）
- 备用通道：GitHub Releases（主通道不可用时自动回退）

## 📌 说明

- 上游 dsh 处于 developer preview，`0.1.7-rc.1` 属**候选发布版**；如遇异常可回退安装 v1.4.6（内置 `0.1.6-alpha.1`）
- 完整上游变更：https://github.com/deepseek-ai/deepseek-harness/releases/tag/dsh-v0.1.7-rc.1

---

Apache-2.0 © DeepSeek Harness Desktop Contributors
