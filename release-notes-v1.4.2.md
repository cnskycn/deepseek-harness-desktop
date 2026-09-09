# DeepSeek Harness Desktop v1.4.2

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.2-rc.1`**（官方 latest 稳定候选，2026-09-03 发布），同步官方自 `v0.1.1-rc.2` 以来的全部更新。

---

## 🆕 本版本新增

### 桌面端改进
- **托盘新增「在浏览器打开 Web UI」**：新版本 dsh 对 Web 界面启用了 token 鉴权，直接访问 `http://127.0.0.1:3080` 会提示 authentication required；现在通过托盘菜单即可用带凭证的地址在默认浏览器打开 Web UI
- **托盘新增「复制 Web 访问地址」**：将带凭证的完整地址复制到剪贴板（Windows 弹气泡提示），可粘贴到其他浏览器使用
- **修复托盘图标**：修复安装后系统托盘图标未更新为新品牌图标的问题——托盘、桌面快捷方式、开始菜单、安装包现已全部统一为「蓝色鲸鱼」图标
- 托盘菜单「关于 / 版本」更名为「关于」

### 内置 dsh v0.1.2-rc.1 更新（摘要，自 v0.1.1-rc.2 汇总）
**新增功能（17 项，节选）**
- 会话流默认折叠过程内容与 System prompt；正文宽度可拖拽调整
- 回答末尾显示 token 用量与耗时，可展开查看精确统计
- 完整历史的回合导航，可预览并跳转未载入的轮次
- 子代理模型选择：Agent 自主选择或调用方指定提供方/模型/推理力度；支持 Claude Code、Codex 配置模型
- ACP 补齐标准会话控制、模型设置、MCP、权限和取消能力
- 实验性 Inspector 工具与 Web Preview
- 连接状态显示，支持自动重试与立即重连
- 父 Agent 与可持续子代理通过 `send_message` 双向通信

**问题修复（18 项，节选）**
- 修复 Windows 目录选择器截断含「开」等特定编码字符路径的问题
- 修复会话运行中追加/排队图片无法正确回显与投递的问题
- 修复命令菜单打开时 `Tab` 补全斜杠命令的问题
- 修复 Node.js 24.0–24.11.1 上启动可能失败的问题
- 网关定期发送 WebSocket 心跳，避免空闲连接中断

**重要变更**
- Web 界面访问启用一次性 token 认证（见上方托盘新功能）
- 默认启用公网 WebFetch（内置 SSRF 防护）
- 移除可选的 SQLite Session 持久化后端（已有内容不会删除，需用旧版本导出）
- Code Mode 更名为 PTC Mode

完整变更：https://github.com/deepseek-ai/deepseek-harness/compare/dsh-v0.1.1-rc.2...dsh-v0.1.2-rc.1

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.2.exe`（约 148 MB）
- 校验：可核对安装包 SHA-512 与 `latest.yml` 中一致
- 首次启动需要初始化运行时（约 1 分钟），请耐心等待

## ⬆️ 自动更新

- 系统托盘或「关于」窗口的 **检查更新** 可手动触发
- 旧版本（v1.4.1 及更早）启动后会自动检查并收到 v1.4.2 更新提示

---

MIT © DeepSeek Harness Desktop contributors
