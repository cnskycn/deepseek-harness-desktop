# DeepSeek Harness Desktop v1.4.4

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.5-rc.1`**（官方 latest）。

---

## 🆕 本版本新增

### 🇨🇳 国内更新通道（重点）
- **自动更新改用 CNB 国内节点（主通道）**：更新检查与安装包下载均从 `cnb.cool`（腾讯云 CDN）拉取，解决 GitHub 在国内访问不稳定导致的「检查更新失败 / 下载龟速」问题
- **GitHub 自动兜底（备用通道）**：CNB 通道不可用时自动回退到 GitHub Releases，双源保证更新链路可用
- **代码双托管**：仓库同步托管在 GitHub 与 CNB
  - GitHub：https://github.com/cnskycn/deepseek-harness-desktop
  - CNB：https://cnb.cool/cnskycn/deepseek-harness-desktop

### 国内下载地址（推荐）
```
https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/DeepSeek-Harness-Setup-1.4.4.exe
```

### 桌面端其他改进
- 托盘菜单：显示主界面 / 在浏览器打开 Web UI / 复制 Web 访问地址 / 检查更新 / 关于 / 退出
- 「关于」窗口可查看应用版本、内置 dsh 版本、更新通道，并手动检查更新（带进度条，无更新也有明确提示）
- 统一「蓝色鲸鱼」品牌图标（快捷方式 / 开始菜单 / 托盘 / 安装包）
- 启动不再自动打开浏览器（仅为不自动拉起系统浏览器，Web 服务始终在 `127.0.0.1:3080` 正常提供）

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.4.exe`（约 148.8 MB）
- 校验：可核对安装包 SHA-512 与 `latest.yml` 中一致
- 首次启动需要初始化运行时（约 1 分钟），请耐心等待

## ⬆️ 自动更新

- 主通道：`https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/`（国内 CDN）
- 备用通道：GitHub Releases（主通道不可用时自动回退）
- 系统托盘或「关于」窗口的 **检查更新** 可手动触发

---

Apache-2.0 © DeepSeek Harness Desktop contributors
