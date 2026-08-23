# DeepSeek Harness Desktop v1.4.0

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.1-rc.2`**（官方 2026-08-21 发布），同步官方 rc.2 全部更新。

---

## 🆕 本版本新增

### 官方 dsh v0.1.1-rc.2 更新（同步打包）
**体验优化**
- DeepSeek 适配器优先通过 Files API 上传图像，并可复用已上传文件
- 优化图像预处理流程：根据模型要求自动缩放并转换为合适格式

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.0.exe`（约 148 MB）
- 校验：可核对安装包 SHA-512 与 `latest.yml` 中一致
- 安装后从桌面/开始菜单打开「DeepSeek Harness」，首次使用在 **Settings → Models** 填入 DeepSeek API Key

## ⬆️ 自动更新

- 系统托盘 **检查更新** 可手动触发
- 旧版本（v1.1.0 / v1.2.0 / v1.3.0）启动后会自动检查并收到 v1.4.0 更新提示

---
MIT © DeepSeek Harness Desktop contributors
