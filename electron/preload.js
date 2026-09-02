'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dshDesktop', {
  onLog(callback) {
    ipcRenderer.on('server-log', (_event, text) => callback(text))
  },
  getVersion() {
    return process.versions.electron
  },
  // 打开"关于 / 设置"窗口（主界面浮动按钮 / 托盘菜单触发）
  openAbout() {
    ipcRenderer.send('app:open-about')
  },
  // 返回版本与更新通道信息
  getAppInfo() {
    return ipcRenderer.invoke('app:get-info')
  },
  // 请求手动检查更新
  checkForUpdates() {
    ipcRenderer.send('app:check-updates')
  },
  // 下载完成后请求重启安装
  quitAndInstall() {
    ipcRenderer.send('app:quit-install')
  },
  // 用系统浏览器打开外部链接
  openExternal(url) {
    ipcRenderer.send('app:open-external', url)
  },
  // 接收主进程转发的更新状态
  onUpdateStatus(callback) {
    ipcRenderer.on('app:update-status', (_event, payload) => callback(payload))
  },
})
