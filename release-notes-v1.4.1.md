# DeepSeek Harness Desktop v1.4.1

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.2-alpha.4`**（官方 2026-09-01 发布，npm alpha 通道）。

---

## 🆕 本版本新增

### 桌面端改进
- **统一品牌图标**：全新「蓝色鲸鱼」多尺寸图标（16/32/48/64/128/256），桌面快捷方式、开始菜单、系统托盘、安装包全部统一
- **关于 / 设置窗口**：主界面顶栏 Session log 左侧新增「关于」按钮，右上角保留「?」兜底入口；窗口内可查看应用版本、内置 dsh 版本、更新通道，并可手动检查更新
- **检查更新体验**：点击「检查更新」立即显示动态进度条；检查完成**无论有无新版本都给出明确提示**（已修复之前无更新时静默无反馈的问题）；启动时的自动检查保持静默不打扰
- **不再自动打开浏览器**：启动后仅在应用窗口内展示，不再额外拉起系统浏览器
- **安装包体积优化**：精简运行时冗余（类型声明/源地图/文档/调试符号，约 12,000 个文件）+ 最高等级压缩，体积与上代持平甚至更小

### 内置 dsh v0.1.2-alpha.4 更新（同步打包）
**新增功能**
- 父 Agent 与可持续子 Agent 可通过 `send_message` 双向传递后续消息，取代单向 `report` 工具

**体验优化**
- 自定义模型发现复用 Profile 请求头；模型目录支持搜索和筛选
- 界面优化圆角、描边、轮次导航、投影效果
- 改善超长会话在流式回复、界面布局、导航预览场景的渲染开销

**其他变更**
- Python SDK、Headless、ACP 与自定义 Profile 默认提供 `web_fetch`
- Web PTC Mode 默认不再向模型提供通用 `workflow` 工具
- `Session.events` 被按需读取 API `seq`、`eventAt()` 和 `snapshotEvents()` 取代
- `SessionSeq` / `SessionLogOffset` 强类型区分

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.1.exe`（约 148 MB）
- 校验：可核对安装包 SHA-512 与 `latest.yml` 中一致
- 安装后从桌面/开始菜单打开「DeepSeek Harness」，首次使用在 **Settings → Models** 填入 DeepSeek API Key
- 首次启动需要初始化运行时（约 1 分钟），请耐心等待

## ⬆️ 自动更新

- 系统托盘或「关于」窗口的 **检查更新** 可手动触发
- 旧版本（v1.4.0 及更早）启动后会自动检查并收到 v1.4.1 更新提示

---

MIT © DeepSeek Harness Desktop contributors
