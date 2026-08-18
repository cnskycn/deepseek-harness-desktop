<div align="center">

# DeepSeek Harness Desktop

把 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Web UI 封装为 **Windows 桌面应用**，一键安装、双击即用。

![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078d6)
![dsh](https://img.shields.io/badge/dsh-0.1.0--rc.7-4b6bff)
![Node](https://img.shields.io/badge/node-%3E%3D22.19-339933)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

## ✨ 特性

- 🚀 **一键安装**：NSIS 单文件安装包，自动创建桌面/开始菜单快捷方式
- 🖥️ **原生桌面窗口**：不再需要手动开浏览器访问 `127.0.0.1:3080`
- 📦 **内置 Node.js 运行时**：安装包内置 portable Node.js（不含 npm），开箱即用，无需系统安装 Node，无 UAC
- 🛡️ **干净的服务管理**：每次启动全新 dsh 实例，退出应用自动回收进程，杜绝残留实例冲突
- 🌐 **内置完整 dsh**：安装包包含 `@deepseek-ai/dsh` 全部依赖，无需自行安装 Harness

## 📦 使用

1. 从 [Releases](https://github.com/cnskycn/deepseek-harness-desktop/releases) 下载最新安装包：

   [![Download](https://img.shields.io/badge/download-DeepSeek%20Harness%20v1.2.0-blue?style=for-the-badge&logo=windows)](https://github.com/cnskycn/deepseek-harness-desktop/releases/download/v1.2.0/DeepSeek.Harness-Setup-1.2.0.exe)

2. 运行安装包（安装后自动创建桌面/开始菜单快捷方式）
3. 打开「DeepSeek Harness」
4. 首次使用：**Settings → Models** 填入 DeepSeek API Key
5. 点击 **Choose workspace** 选择工作目录，开始使用

> **运行时**：安装包已内置 portable Node.js（≥22.19，支持 `node:zlib` 的 zstd），开箱即用。
> 内置 node 缺失时（极端情况）会自动回退检测系统 Node.js。

## 🛠️ 从源码构建

> 构建机需 Node.js + npm（仅用于构建，与最终安装包无关）。

```bash
npm install      # 安装 electron / electron-builder
npm run build    # 安装 dsh 依赖 + 打包 NSIS 安装包
```

产物输出到 `dist/`。分步命令：

```bash
npm run setup:runtime   # 安装 @deepseek-ai/dsh 到 resources/dsh
node scripts/prune-runtime.js   # 精简 runtime（删 PDB/类型/源地图冗余）
npm run dist            # 执行 electron-builder 打包
```

> 内置 portable Node.js 位于 `resources/node/win-x64/node.exe`，构建前需自行放置
> （可从 Node.js 官方 zip 版提取，或复制本机 `node.exe`，版本需 ≥22.19 且支持 zstd）。

构建机在中国大陆时，可设置国内镜像加速 electron 二进制下载：

```powershell
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
$env:ELECTRON_BUILDER_BINARIES_MIRROR="https://npmmirror.com/mirrors/electron-builder-binaries/"
```

## 📁 目录结构

```
deepseek-harness-desktop/
├── electron/
│   ├── main.js        # 主进程：检测 Node、拉起 dsh、打开窗口、回收进程
│   ├── preload.js     # 桥接：向页面推送服务日志
│   ├── loading.html   # 启动加载页
│   └── error.html     # 启动失败页
├── build/
│   └── installer.nsh  # NSIS：无需安装 Node，纯解压即用
├── scripts/
│   ├── setup-runtime.js  # 安装 @deepseek-ai/dsh 到 resources/dsh
│   ├── prune-runtime.js  # 精简 runtime（删 PDB/类型/源地图冗余）
│   └── build.js          # 一键构建（含精简步骤）
├── resources/
│   ├── dsh              # 构建时生成：dsh 及全部依赖
│   └── node/win-x64/    # 内置 portable node.exe
├── package.json       # electron-builder 配置
└── dist/              # 构建产物
```

## 🔧 架构说明

### Node.js 策略（内置 portable Node）

| 时机 | 机制 |
|------|------|
| 安装时 | 无额外步骤——安装包已含 portable node，纯解压 |
| 启动时 | 优先使用内置 node（校验版本 + zstd 能力）；缺失则回退检测系统 Node |
| 均不可用 | 弹窗引导：自动安装（winget）或打开 nodejs.org |

### 服务管理

- 应用**始终启动全新的 dsh 实例**，避免连接端口上残留的旧实例
- 若 3080 被占用，弹窗让用户选择「关闭占用进程并重启 / 直接连接 / 退出」
- 退出应用时 `taskkill /T /F` 回收整个进程树

## ❓ 常见问题

**Q: 双击安装包后桌面没有快捷方式？**
A: 若安装被 SmartScreen/杀软拦截会中断。请点「更多信息 → 仍要运行」后重装。

**Q: 启动时报 `failed to load bundle script`？**
A: 多为端口残留旧实例导致，已在新版本中修复。请关闭所有 DeepSeek Harness 进程后重启。

**Q: 安装包有多大？为什么那么大？**
A: 约 140MB。包含内置 portable Node.js + `@deepseek-ai/dsh` 全部依赖（已剔除 PDB 调试符号、类型声明、源地图等冗余），保证离线开箱即用。

## 📄 许可

MIT © DeepSeek Harness Desktop contributors

## 🙏 致谢

- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — DeepSeek Harness 本体
- [electron](https://www.electronjs.org/) / [electron-builder](https://www.electron.build/)
