<div align="center">

# DeepSeek Harness Desktop

把 [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness) 的 Web UI 封装为 **Windows 桌面应用（dsh desktop shell）**，一键安装、双击即用。

> 万物皆「插件」——DeepSeek Harness 里桌面本身也是一种**插件形态**。本项目即 dsh 的 Windows 桌面外壳（desktop shell / desktop app wrapper）。
> 独立的社区开源项目，与 DeepSeek 不存在隶属、合作、授权或背书关系。

![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078d6)
![dsh](https://img.shields.io/badge/dsh-0.1.7--rc.1-4b6bff)
![Node](https://img.shields.io/badge/node-%3E%3D22.19-339933)
![License](https://img.shields.io/badge/license-Apache--2.0-green)
![dsh-plugin](https://img.shields.io/badge/dsh--plugin-desktop%20shell-8a5bff)

</div>

## 🧭 兼容性与适用范围

供插件注册表与使用者核对（版本相关，随 dsh 预览版演进需复核）：

| 项目 | 说明 |
|---|---|
| 类型 | Desktop shell（桌面外壳），非 Cordis 运行时插件；不通过 `dsh plugin add` 安装 |
| 宿主 dsh 版本 | `@deepseek-ai/dsh@0.1.7-rc.1`（**随安装包内置、版本固定**，无需用户自备） |
| 支持的 profile | `web`（桌面窗口内运行 dsh Web UI） |
| 平台 | Windows x64（Windows 10 / 11） |
| 运行时 | 内置 portable Node.js ≥ 22.19（含 `node:zlib` zstd），无需系统安装 Node |
| 网络服务 | 仅监听本机 `127.0.0.1:3080`；不对外暴露端口 |
| 外部服务 | 用户自行配置的模型提供方（如 DeepSeek API）、MCP 服务器；本项目不内置任何第三方凭据 |
| 权限 | 不请求管理员权限（`perMachine` 安装时由安装器按需提升）；沙箱/审批/权限沿用 dsh 自身机制 |
| 自动更新 | electron-updater **双通道**：主 = CNB 国内 CDN（`generic`），备 = GitHub Releases（主通道失败自动回退）；另支持 Gitee 通道 |

> ⚠️ 上游 dsh 处于 developer preview，API 可能变更；本项目的兼容性表述**与 `1.4.8` / `dsh 0.1.7-rc.1` 版本绑定**。

## ✨ 特性

- 🚀 **一键安装**：NSIS 单文件安装包，自动创建桌面/开始菜单快捷方式
- 🖥️ **原生桌面窗口**：不再需要手动开浏览器访问 `127.0.0.1:3080`
- 📦 **内置 Node.js 运行时**：安装包内置 portable Node.js（不含 npm），开箱即用，无需系统安装 Node，无 UAC
- 🛡️ **干净的服务管理**：每次启动全新 dsh 实例，退出应用自动回收进程，杜绝残留实例冲突
- 🌐 **内置完整 dsh**：安装包包含 `@deepseek-ai/dsh` 全部依赖，无需自行安装 Harness
- 🔔 **托盘菜单**：显示主界面、在浏览器打开 Web UI、复制 Web 访问地址、检查更新、关于、退出
- 🎨 **统一品牌图标**：桌面快捷方式 / 开始菜单 / 系统托盘 / 安装包统一图标
- 🔄 **多通道自动更新**：GitHub Releases（默认）/ generic 自定义 URL（国内对象存储、CDN）/ Gitee

## 📦 使用

1. 下载最新安装包（**国内推荐 CNB 节点，速度快**）：

  [![Download CNB](https://img.shields.io/badge/download-CNB%20%E5%9B%BD%E5%86%85%E8%8A%82%E7%82%B9-success?style=for-the-badge&logo=windows)](https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/DeepSeek-Harness-Setup-1.4.8.exe)
  [![Download GitHub](https://img.shields.io/badge/download-GitHub-blue?style=for-the-badge&logo=github)](https://github.com/cnskycn/deepseek-harness-desktop/releases/download/v1.4.8/DeepSeek-Harness-Setup-1.4.8.exe)

  | 通道 | 地址 | 说明 |
  |---|---|---|
  | **CNB（推荐）** | `https://cnb.cool/cnskycn/deepseek-harness-desktop/-/releases/download/latest/DeepSeek-Harness-Setup-1.4.4.exe` | 腾讯云 CDN，国内直连；`latest` 路径始终指向最新版 |
  | GitHub | `https://github.com/cnskycn/deepseek-harness-desktop/releases` | 海外/备用 |

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
A: 约 148MB。包含内置 portable Node.js + `@deepseek-ai/dsh` 全部依赖（已剔除 PDB 调试符号、类型声明、源地图、文档等约 1.2 万个冗余文件），保证离线开箱即用。

**Q: 为什么用浏览器打开 `127.0.0.1:3080` 提示 authentication required？**
A: dsh 0.1.2 起对 Web 界面启用了链接内一次性 token 鉴权，裸访问端口会被拒绝。请使用托盘菜单的「**在浏览器打开 Web UI**」或「**复制 Web 访问地址**」，它们携带有效凭证。

## 📄 许可

Apache-2.0 © DeepSeek Harness Desktop contributors

## 🙏 致谢

- [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) — DeepSeek Harness 本体
- [electron](https://www.electronjs.org/) / [electron-builder](https://www.electron.build/)
