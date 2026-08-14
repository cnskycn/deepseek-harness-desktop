'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dshDesktop', {
  onLog(callback) {
    ipcRenderer.on('server-log', (_event, text) => callback(text))
  },
  getVersion() {
    return process.versions.electron
  },
})
