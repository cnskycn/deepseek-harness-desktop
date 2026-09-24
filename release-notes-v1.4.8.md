# DeepSeek Harness Desktop v1.4.8

基于 Electron 封装 dsh 运行时，内置 Node.js，双击即可使用。

**本版本内置 `@deepseek-ai/dsh@v0.1.7-rc.1`**（与 v1.4.7 相同）。

这是一个**启动可靠性修复版**，建议所有 v1.4.7 用户升级。

---

## 🔧 修复：残留文件锁导致应用启动失败

### 症状（v1.4.7）

```
dsh: startup failed: 1 required plugin did not activate

Failed plugins (1):
  connection (required)
    Package: @deepseek-ai/dsh-client-connection
    Error: atomic-write: timed out waiting for the writer lock at
           C:\Users\<用户名>\.dsh\.credentials.yaml.lock

Plugins waiting for services (5):
  session-log-download  connection
  open-in-app           connection
  session-controller    fileUploads
  file-upload           connection
  ui-deliverables       connection, sessionController
```

界面卡在启动页，或窗口起来后空白无法使用。

### 根因

dsh 用**文件锁**保护 `.credentials.yaml`、profile 模块等共享资源。当上一次 dsh 实例是被**强制结束**的（关机 / 重启、任务管理器结束进程、进程崩溃、安装器覆盖安装时结束旧进程），锁文件不会被释放，残留在 `~/.dsh` 下。

下次启动时，必需的 `connection` 插件会卡在「等待写锁」直到超时，插件激活失败 → **整个应用启动失败**。而那一长串「Plugins waiting for services」只是依赖 `connection` 的插件在等待服务，属于连锁反应，不是独立故障。

### 修复内容

1. **启动自愈（核心）**
   在确认本机没有 dsh 正在运行（3080 无服务）后，**自动清理 `~/.dsh` 下的残留锁文件**，并把清理明细写入启动日志：

   ```
   [boot] 清理残留锁：C:\Users\<用户名>\.dsh\.credentials.yaml.lock
   [boot] 共清理 1 个残留锁文件
   ```

   即使上次是被强杀/断电，这次也能自行恢复，无需手动删文件。

2. **关闭更温和**
   应用退出时先向 dsh 发送**温和终止**（不带 `/F`），给它机会释放文件锁并落盘状态；1.8 秒后仍在运行才强制结束。

---

## 🚀 安装 / 校验

- 安装包：`DeepSeek-Harness-Setup-1.4.8.exe`（约 236 MB）
- 国内下载（推荐）：https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/DeepSeek-Harness-Setup-1.4.8.exe
- 首次启动或升级后需初始化运行时，通常 10–90 秒；启动页会显示等待进度

## ⬆️ 自动更新

- 主通道：CNB 国内 CDN（`https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/`）
- 备用通道：GitHub Releases（主通道不可用时自动回退）

## 📌 说明

- 内置 dsh 与 v1.4.7 相同（`0.1.7-rc.1`），本版本仅修复启动可靠性
- 若 v1.4.7 已能正常启动，升级到本版可获得「不再需要手动删锁」的自愈能力

---

Apache-2.0 © DeepSeek Harness Desktop Contributors
