'use strict'

const { app, BrowserWindow, shell, dialog, Tray, Menu, nativeImage, ipcMain } = require('electron')
const { spawn, spawnSync } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')
const { autoUpdater } = require('electron-updater')
const GiteeProvider = require('./gitee-provider')

const DEFAULT_HOST = '127.0.0.1'
const DEFAULT_PORT = 3080
const STARTUP_TIMEOUT_MS = 180000
const MIN_NODE_VERSION = '22.19.0'

let serverProc = null
let mainWindow = null
let serverUrl = `http://${DEFAULT_HOST}:${DEFAULT_PORT}`
// 新版 dsh（0.1.2+）的 web 地址带一次性 token，必须等它输出后再连接，
// 否则用无 token 的地址访问会被拒绝。
let serverUrlResolved = false
let serverLogs = ''
let nodeCommand = 'node'
let tray = null
let checkingUpdate = false
/** 用户手动检查更新时的结果呈现方式：'dialog' | 'window' | null（null = 启动时的静默自动检查） */
let manualCheckRef = null
let manualSender = null

const isWin = process.platform === 'win32'

function trayIconPath() {
  const candidates = [
    path.join(__dirname, '..', 'build', 'icon.ico'),
    path.join(__dirname, 'tray-icon.png'),
    path.join(__dirname, 'tray-icon@2x.png'),
  ]
  return candidates.find((p) => fs.existsSync(p)) || null
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

/* ---------------- Node.js 检测 ---------------- */

function runCapture(cmd, args) {
  try {
    const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true })
    return {
      ok: r.status === 0,
      out: (r.stdout || '').trim(),
      err: (r.stderr || '').trim(),
    }
  } catch (e) {
    return { ok: false, out: '', err: String(e) }
  }
}

/**
 * 内置 portable Node.js 路径。打包后位于 resources/node/win-x64/node.exe，
 * 开发模式位于项目 resources/node/win-x64/node.exe。
 */
function bundledNodePath() {
  const resDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources')
  return path.join(resDir, 'node', 'win-x64', 'node.exe')
}

function findSystemNode() {
  // 1. 依赖 PATH
  const t = runCapture(isWin ? 'where' : 'which', ['node'])
  if (t.ok && t.out) {
    const first = t.out.split(/\r?\n/)[0].trim()
    if (first) return first
  }
  // 2. 常见安装位置
  const pf = process.env.ProgramFiles || 'C:\\Program Files'
  const pfx = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
  const localAppData = process.env.LOCALAPPDATA || ''
  const candidates = [
    path.join(pf, 'nodejs', 'node.exe'),
    path.join(pfx, 'nodejs', 'node.exe'),
    path.join(localAppData, 'Programs', 'nodejs', 'node.exe'),
    'C:\\Program Files\\nodejs\\node.exe',
    'C:\\Program Files (x86)\\nodejs\\node.exe',
  ]
  for (const c of candidates) {
    if (c && fs.existsSync(c)) return c
  }
  // 3. 注册表
  if (isWin) {
    for (const hive of ['HKLM', 'HKCU']) {
      const reg = runCapture('reg', ['query', hive + '\\SOFTWARE\\Node.js', '/v', 'InstallDir'])
      const m = reg.out.match(/REG_SZ\s+(.+)/)
      if (m) {
        const p = path.join(m[1].trim(), 'node.exe')
        if (fs.existsSync(p)) return p
      }
    }
  }
  return null
}

function nodeVersion(cmd) {
  const r = runCapture(cmd, ['-v'])
  const v = r.out.replace(/^v/, '').trim()
  return v || null
}

/**
 * dsh 依赖 node:zlib 的 zstd 能力（createZstdDecompress），
 * 该 API 于 Node 22.15+ / 24 提供。这里做实际能力检测，比版本号更可靠。
 */
function nodeHasZstd(cmd) {
  const r = runCapture(cmd, [
    '-e',
    'process.stdout.write(typeof require("node:zlib").createZstdDecompress)',
  ])
  return r.ok && r.out === 'function'
}

function versionGte(a, b) {
  const A = String(a).split('.').map((n) => parseInt(n, 10) || 0)
  const B = String(b).split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i] || 0
    const y = B[i] || 0
    if (x > y) return true
    if (x < y) return false
  }
  return true
}

function tryInstallNodeViaWinget() {
  return new Promise((resolve) => {
    const w = runCapture('winget', ['--version'])
    if (!w.ok) {
      shell.openExternal('https://nodejs.org/zh-cn/download')
      resolve()
      return
    }
    const child = spawn(
      'winget',
      [
        'install',
        'OpenJS.NodeJS.LTS',
        '--silent',
        '--accept-package-agreements',
        '--accept-source-agreements',
        '--disable-interactivity',
      ],
      { windowsHide: true, stdio: 'ignore' }
    )
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        resolve()
      }
    }
    child.on('exit', finish)
    child.on('error', finish)
    setTimeout(finish, 180000)
  })
}

/**
 * 确保系统存在可用的 Node.js（>= 22.19 且支持 zstd），否则弹窗引导安装。
 * 返回 node 可执行文件路径（或 'node'），失败返回 null 并退出应用。
 */
async function ensureNode() {
  for (;;) {
    // 1) 优先使用内置 portable Node.js（开箱即用，无需系统安装）
    const bundled = bundledNodePath()
    if (bundled && fs.existsSync(bundled)) {
      const bv = nodeVersion(bundled)
      const bZstd = nodeHasZstd(bundled)
      if (bv && versionGte(bv, MIN_NODE_VERSION) && bZstd) return bundled
    }

    // 2) 回退：检测系统 Node.js
    const found = findSystemNode()
    if (found) {
      const v = nodeVersion(found)
      const hasZstd = found ? nodeHasZstd(found) : false
      if (v && versionGte(v, MIN_NODE_VERSION) && hasZstd) return found

      const r = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['仍然继续', '升级 Node.js', '退出'],
        defaultId: 1,
        cancelId: 2,
        title: 'Node.js 版本过低',
        message: `检测到 Node.js ${v || '未知'}，dsh 需要 ${MIN_NODE_VERSION} 及以上（含 zstd 支持）。`,
        detail: '建议升级到 Node.js 22 LTS（≥22.19）或 24 LTS。',
      })
      if (r.response === 0) return found
      if (r.response === 1) {
        await tryInstallNodeViaWinget()
        continue
      }
      app.quit()
      return null
    }

    const r = await dialog.showMessageBox({
      type: 'info',
      buttons: ['自动安装 Node.js', '打开官网下载', '退出'],
      defaultId: 0,
      cancelId: 2,
      title: '未检测到 Node.js',
      message: 'DeepSeek Harness 需要 Node.js 运行时。',
      detail:
        '可选择自动安装（调用 winget，可能弹出用户账户控制提示），或前往 nodejs.org 手动下载安装。',
    })
    if (r.response === 0) {
      await tryInstallNodeViaWinget()
      continue
    }
    if (r.response === 1) {
      shell.openExternal('https://nodejs.org/zh-cn/download')
      await sleep(3000)
      continue
    }
    app.quit()
    return null
  }
}

/* ---------------- dsh 服务管理 ---------------- */

function dshBinPath() {
  const resDir = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources')
  return path.join(resDir, 'dsh', 'runtime', 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
}

function workspaceDir() {
  const dir = process.env.DSH_WORKSPACE || path.join(app.getPath('documents'), 'DeepSeekHarness')
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (_) {}
  return dir
}

function checkHttp(url) {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume()
      resolve(true)
    })
    req.on('error', () => resolve(false))
    req.setTimeout(2000, () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * 等待 dsh 启动完成。
 * 新版 dsh 会输出带一次性 token 的地址，必须等解析到该地址后再判定就绪，
 * 否则 loadURL 会拿到无 token 的地址而被拒绝（401）。
 * 若 dsh 长时间不输出地址（老版本行为），则回退为直接探测默认地址。
 */
async function waitForServer(timeoutMs = STARTUP_TIMEOUT_MS) {
  const start = Date.now()
  const graceMs = 15000
  while (Date.now() - start < timeoutMs) {
    if (serverUrlResolved) {
      if (await checkHttp(serverUrl)) return true
    } else if (Date.now() - start > graceMs) {
      if (await checkHttp(serverUrl)) return true
    }
    await sleep(500)
  }
  return false
}

function sendLog(text) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('server-log', text)
  }
}

function startServer() {
  const dshBin = dshBinPath()
  if (!fs.existsSync(dshBin)) {
    dialog.showErrorBox('运行时缺失', '未找到内置的 dsh，安装可能不完整。\n请重新运行安装程序。')
    return false
  }

  serverLogs = ''
  const cwd = workspaceDir()

  serverProc = spawn(nodeCommand, [dshBin, 'web', '--no-open'], {
    cwd,
    env: { ...process.env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  serverProc.stdout.on('data', (d) => {
    const s = d.toString()
    serverLogs += s
    sendLog(serverLogs)
    const m = s.match(/https?:\/\/[^\s"'<>]+/)
    if (m) {
      serverUrl = m[0].replace(/\/+$/, '')
      serverUrlResolved = true
    }
  })

  serverProc.stderr.on('data', (d) => {
    serverLogs += d.toString()
    sendLog(serverLogs)
  })

  serverProc.on('error', (err) => {
    serverLogs += '\n[进程错误] ' + err.message + '\n'
    sendLog(serverLogs)
  })

  serverProc.on('exit', (code) => {
    serverProc = null
    sendLog(serverLogs + `\n[dsh 已退出，code=${code}]\n`)
  })

  return true
}

/* ---------------- 窗口 ---------------- */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 940,
    minHeight: 620,
    backgroundColor: '#0b0f1a',
    title: 'DeepSeek Harness',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  mainWindow.loadFile(path.join(__dirname, 'loading.html'))

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://127.0.0.1') || url.startsWith('http://localhost')) {
      return { action: 'allow' }
    }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // 在主界面（dsh web）注入"关于"入口：集成到顶栏 "Session log" 按钮左侧，
  // 并在右上角保留"？"按钮作为兜底
  mainWindow.webContents.on('did-finish-load', injectDesktopButton)
  mainWindow.webContents.on('did-navigate-in-page', injectDesktopButton)

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

async function boot() {
  createWindow()

  nodeCommand = await ensureNode()
  if (!nodeCommand) return

  // 端口已被其他程序占用（可能是残留的 dsh 实例或别的程序）。
  if (await checkHttp(serverUrl)) {
    const r = await dialog.showMessageBox({
      type: 'warning',
      buttons: ['关闭占用进程并重启', '直接连接现有服务', '退出'],
      defaultId: 0,
      cancelId: 2,
      title: '端口 3080 已被占用',
      message: `检测到 ${serverUrl} 已有服务在运行。`,
      detail:
        '为避免连接到残留/异常实例导致插件加载失败，建议关闭占用进程后由本应用重新启动 dsh。',
    })
    if (r.response === 0) {
      if (isWin) {
        const out = require('child_process').execSync(
          `netstat -ano | findstr :${DEFAULT_PORT} | findstr LISTENING`
        )
        const lines = (out || '').toString().split(/\r?\n/)
        const pids = new Set()
        for (const line of lines) {
          const pid = line.trim().split(/\s+/).pop()
          if (pid && /^\d+$/.test(pid) && pid !== String(process.pid)) pids.add(pid)
        }
        for (const pid of pids) {
          try {
            spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
          } catch (_) {}
        }
        await sleep(1500)
      }
    } else if (r.response === 1) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(serverUrl)
      }
      return
    } else {
      app.quit()
      return
    }
  }

  // 桌面应用独占 3080 服务：总是由本进程启动一个干净、全新的 dsh 实例，
  // 避免连接到端口上残留/半死的旧实例导致插件加载异常。
  if (serverProc) return
  if (!startServer()) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadFile(path.join(__dirname, 'error.html'))
    }
    return
  }

  const ready = await waitForServer()

  if (ready && mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL(serverUrl)
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'error.html'))
  }
}

function stopServer() {
  if (serverProc) {
    try {
      if (isWin) {
        spawn('taskkill', ['/pid', String(serverProc.pid), '/T', '/F'], { windowsHide: true })
      } else {
        serverProc.kill('SIGTERM')
      }
    } catch (_) {}
    serverProc = null
  }
}

/* ---------------- 自动更新（GitHub / Gitee 发布通道） ---------------- */

function setupAutoUpdater() {
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'updater.config.json'), 'utf8'))
  } catch (_) {
    return // 没有配置文件则不启用更新
  }
  if (!cfg.owner || !cfg.repo) {
    console.log('[updater] 未配置更新仓库（owner/repo），跳过自动更新')
    return
  }
  const provider = (cfg.provider || 'github').toLowerCase()

  try {
    if (provider === 'gitee') {
      // Gitee Releases 自定义通道（国内快，但需用 publish-gitee.js 发布）
      autoUpdater.setFeedURL({
        provider: 'custom',
        updateProvider: GiteeProvider,
        owner: cfg.owner,
        repo: cfg.repo,
        channel: cfg.channel || 'latest',
        token: process.env.GITEE_TOKEN || null,
      })
    } else {
      // GitHub Releases 原生通道（默认）
      autoUpdater.setFeedURL({
        provider: 'github',
        owner: cfg.owner,
        repo: cfg.repo,
        token: process.env.GITHUB_TOKEN || null,
      })
    }
    autoUpdater.allowPrerelease = !!cfg.allowPrerelease
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      console.log(`[updater] 发现新版本 ${info.version}`)
      sendLog(`\n[自动更新] 发现新版本 ${info.version}，开始下载…\n`)
      sendUpdateStatus({ type: 'available', text: `发现新版本 ${info.version}，开始下载…` })
    })
    autoUpdater.on('update-not-available', (info) => {
      const ver = (info && info.version) || appVersion()
      console.log(`[updater] 当前已是最新（${ver}）`)
      // 用户手动触发时必须给出明确反馈；启动时的自动检查保持静默，不打扰用户。
      if (manualCheckRef === 'dialog') {
        dialog.showMessageBox({
          type: 'info',
          title: '检查更新',
          message: '当前已是最新版本',
          detail: `DeepSeek Harness ${appVersion()}\n远端最新版本：${ver}`,
        })
      } else if (manualCheckRef === 'window') {
        sendUpdateStatus({ type: 'latest', version: ver, text: `当前已是最新版本（${ver}）` })
      }
      manualCheckRef = null
      manualSender = null
    })
    autoUpdater.on('download-progress', (p) => {
      sendLog(`\r[自动更新] 下载进度 ${Math.floor(p.percent)}%`)
      sendUpdateStatus({ type: 'progress', percent: Math.floor(p.percent), text: `下载中 ${Math.floor(p.percent)}%` })
    })
    autoUpdater.on('update-downloaded', (info) => {
      console.log(`[updater] 新版本 ${info.version} 已下载，等待安装`)
      sendUpdateStatus({ type: 'downloaded', version: info.version, text: `新版本 ${info.version} 已下载，可重启安装` })
      if (mainWindow && !mainWindow.isDestroyed()) {
        dialog
          .showMessageBox(mainWindow, {
            type: 'info',
            buttons: ['立即重启安装', '稍后'],
            defaultId: 0,
            cancelId: 1,
            title: '发现新版本',
            message: `DeepSeek Harness ${info.version} 已下载完成。`,
            detail: '点击「立即重启安装」将重启应用并完成升级。',
          })
          .then((r) => {
            if (r.response === 0) autoUpdater.quitAndInstall()
          })
      }
    })
    autoUpdater.on('error', (err) => {
      console.error('[updater] 更新出错：', err && (err.stack || err.message))
      sendLog(`\n[自动更新] 检查更新失败：${err && err.message}\n`)
      sendUpdateStatus({ type: 'error', text: `更新出错：${err && err.message}` })
      if (manualCheckRef) {
        manualCheckRef = null
        manualSender = null
      }
    })

    autoUpdater.checkForUpdates().catch(() => {})
  } catch (e) {
    console.error('[updater] 初始化失败：', e && (e.stack || e.message))
  }
}

/* ---------------- 托盘与交互式更新检查 ---------------- */

function showMainWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.show()
    mainWindow.focus()
  }
}

function appVersion() {
  try {
    return app.getVersion()
  } catch (_) {
    return 'unknown'
  }
}

/**
 * 交互式「检查更新」：从托盘触发。有可更新版本时触发自动下载（下载完成后
 * 已有 update-downloaded 弹窗引导重启安装）；否则弹窗提示当前已是最新。
 */
async function checkForUpdatesInteractive() {
  if (checkingUpdate) return
  checkingUpdate = true
  try {
    const r = await autoUpdater.checkForUpdates()
    if (!r || !r.updateInfo) {
      dialog.showMessageBox({
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        detail: `DeepSeek Harness ${appVersion()}`,
      })
    }
    // 有 updateInfo 说明已发现新版，update-available 会触发下载并在完成后弹窗。
  } catch (e) {
    dialog.showMessageBox({
      type: 'warning',
      title: '检查更新失败',
      message: '无法连接到更新服务器',
      detail: (e && (e.message || e.stack)) || String(e),
    })
  } finally {
    checkingUpdate = false
  }
}

function createTray() {
  const iconPath = trayIconPath()
  if (!iconPath) {
    console.log('[tray] 未找到托盘图标，跳过创建')
    return
  }
  let image = nativeImage.createFromPath(iconPath)
  if (image.isEmpty()) {
    // 回退：从 base64 内嵌图标（16x16，与 gen-tray-icon.js 相同样式）
    image = nativeImage.createFromDataURL(
      'data:image/png;base64,' +
        'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR4nGP8z8Dwn4GBgYG'
    )
  }
  tray = new Tray(image)
  tray.setToolTip('DeepSeek Harness')

  const menu = Menu.buildFromTemplate([
    { label: '显示主界面', click: showMainWindow },
    { type: 'separator' },
    { label: '检查更新…', click: () => checkForUpdatesInteractive() },
    { label: '关于 / 版本', click: () => openAboutWindow() },
    { type: 'separator' },
    { label: '退出', click: () => app.quit() },
  ])
  tray.setContextMenu(menu)
  tray.on('click', showMainWindow)
}

/* ---------------- 关于 / 设置窗口 ---------------- */

let aboutWindow = null

function dshVersion() {
  try {
    const base = app.isPackaged ? process.resourcesPath : path.join(__dirname, '..', 'resources')
    const p = path.join(base, 'dsh', 'runtime', 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
    return JSON.parse(fs.readFileSync(p, 'utf8')).version
  } catch (_) {
    return 'unknown'
  }
}

function buildAppInfo() {
  let cfg = {}
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'updater.config.json'), 'utf8'))
  } catch (_) {}
  const provider = (cfg.provider || 'github').toLowerCase()
  const updateUrl =
    provider === 'gitee'
      ? `https://gitee.com/${cfg.owner || ''}/${cfg.repo || ''}/releases`
      : `https://github.com/${cfg.owner || ''}/${cfg.repo || ''}/releases`
  return {
    appVersion: appVersion(),
    dshVersion: dshVersion(),
    provider: (cfg.provider || 'github').toUpperCase(),
    owner: cfg.owner || '',
    repo: cfg.repo || '',
    channel: cfg.channel || 'latest',
    updateUrl,
  }
}

function openAboutWindow() {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.focus()
    return
  }
  aboutWindow = new BrowserWindow({
    width: 460,
    height: 560,
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    backgroundColor: '#0b0f1a',
    title: '关于 / 设置',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })
  aboutWindow.setMenuBarVisibility(false)
  aboutWindow.loadFile(path.join(__dirname, 'about.html'))
  aboutWindow.on('closed', () => {
    aboutWindow = null
  })
}

/** 把更新状态转发给关于窗口（若已打开） */
function sendUpdateStatus(payload) {
  if (aboutWindow && !aboutWindow.isDestroyed()) {
    aboutWindow.webContents.send('app:update-status', payload)
  }
}

/**
 * 通用更新检查。ref 指定结果呈现方式：
 *  - 'dialog'：弹窗（托盘「检查更新…」触发）
 *  - 'window'：通过 IPC 把状态发给关于窗口（关于页按钮触发）
 */
async function runUpdateCheck(ref, sender) {
  if (checkingUpdate) {
    if (ref === 'window' && sender && !sender.isDestroyed()) {
      sender.send('app:update-status', { type: 'checking', text: '正在检查更新，请稍候…' })
    }
    return
  }
  checkingUpdate = true
  manualCheckRef = ref
  manualSender = sender
  if (ref === 'window' && sender && !sender.isDestroyed()) {
    sender.send('app:update-status', { type: 'checking', text: '正在检查更新…' })
  }
  try {
    // 注意：不能用 `!r.updateInfo` 判断"已是最新" —— electron-updater 无论有无
    // 更新都会返回 updateInfo（远端 latest.yml 内容）。结果统一由
    // update-available / update-not-available 事件驱动呈现。
    await autoUpdater.checkForUpdates()
  } catch (e) {
    const msg = (e && (e.message || e.stack)) || String(e)
    if (ref === 'dialog') {
      dialog.showMessageBox({
        type: 'warning',
        title: '检查更新失败',
        message: '无法连接到更新服务器',
        detail: msg,
      })
    } else if (sender && !sender.isDestroyed()) {
      sender.send('app:update-status', { type: 'error', text: '检查更新失败：' + msg })
    }
    manualCheckRef = null
    manualSender = null
  } finally {
    checkingUpdate = false
  }
}

/* ---------------- 桌面端 IPC ---------------- */

ipcMain.handle('app:get-info', () => buildAppInfo())

ipcMain.on('app:open-about', () => openAboutWindow())

ipcMain.on('app:check-updates', (event) => runUpdateCheck('window', event.sender))

ipcMain.on('app:quit-install', () => {
  try {
    autoUpdater.quitAndInstall()
  } catch (_) {}
})

ipcMain.on('app:open-external', (event, url) => {
  if (url && /^https?:\/\//i.test(url)) shell.openExternal(url)
})

function injectDesktopButton() {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.webContents
    .executeJavaScript(
      `(function(){
        // 1) 右上角"？"按钮（兜底入口，避免 dsh web 改版导致找不到入口）
        if (!document.getElementById('__dsh_desktop_help')) {
          var h = document.createElement('div');
          h.id = '__dsh_desktop_help';
          h.title = '关于 / 设置';
          h.textContent = '?';
          h.style.cssText = 'position:fixed;top:7px;right:150px;z-index:2147483647;width:30px;height:30px;border-radius:6px;background:rgba(255,255,255,0.08);color:#e6ebf5;font-size:16px;font-weight:600;line-height:30px;text-align:center;cursor:pointer;user-select:none;-webkit-app-region:no-drag;transition:background .15s;';
          h.addEventListener('mouseenter', function(){ h.style.background='rgba(255,255,255,0.18)'; });
          h.addEventListener('mouseleave', function(){ h.style.background='rgba(255,255,255,0.08)'; });
          h.addEventListener('click', function(){ try { window.dshDesktop.openAbout(); } catch(e){} });
          (document.body || document.documentElement).appendChild(h);
        }
        // 2) 在 "Session log" 按钮左侧注入"关于"按钮（集成式入口）
        if (window.__dshAboutInjecting) return;
        window.__dshAboutInjecting = true;
        var tries = 0;
        var iv = setInterval(function(){
          tries++;
          if (tries > 200) { clearInterval(iv); return; }
          var nodes = document.querySelectorAll('button,a,[role="button"],div');
          var tgt = null;
          for (var i = 0; i < nodes.length; i++) {
            var txt = (nodes[i].textContent || '').trim().toLowerCase();
            if (txt.indexOf('session log') !== -1 && nodes[i].offsetParent !== null) { tgt = nodes[i]; break; }
          }
          if (!tgt) return;
          var existing = document.getElementById('__dsh_about_btn');
          if (!existing && tgt.parentNode) {
            var ab = document.createElement('button');
            ab.id = '__dsh_about_btn';
            ab.type = 'button';
            ab.textContent = '关于';
            ab.style.cssText = 'display:inline-flex;align-items:center;height:30px;padding:0 14px;margin-right:8px;border:1px solid rgba(255,255,255,0.16);border-radius:6px;background:rgba(255,255,255,0.06);color:#e6ebf5;font-size:13px;cursor:pointer;font-family:inherit;vertical-align:middle;';
            ab.addEventListener('click', function(e){ e.stopPropagation(); e.preventDefault(); try { window.dshDesktop.openAbout(); } catch(_){} });
            tgt.parentNode.insertBefore(ab, tgt);
          }
        }, 500);
      })();`
    )
    .catch(() => {})
}

function updaterInfoText() {
  let cfg
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(__dirname, 'updater.config.json'), 'utf8'))
  } catch (_) {
    return null
  }
  return `更新通道：${(cfg.provider || 'github').toUpperCase()} · ${cfg.owner}/${cfg.repo}`
}

/* ---------------- 应用生命周期 ---------------- */

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(() => {
    setupAutoUpdater()
    createTray()
    boot()
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) boot()
  })

  app.on('window-all-closed', () => {
    stopServer()
    if (process.platform !== 'darwin') app.quit()
  })

  app.on('before-quit', () => stopServer())
}
