'use strict'

/**
 * 一键构建脚本：准备运行时 + 打包 Windows 安装包
 * 前置条件：项目根目录已执行 npm install（安装 electron / electron-builder）
 * 用法：node scripts/build.js
 */

const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')

function run(cmd, args, opts = {}) {
  console.log('> ' + [cmd, ...args].join(' '))
  const r = spawnSync(cmd, args, { stdio: 'inherit', cwd: ROOT, ...opts })
  if (r.status !== 0) {
    console.error('命令执行失败，退出码 ' + r.status)
    process.exit(r.status ?? 1)
  }
}

function runShell(cmd) {
  console.log('> ' + cmd)
  const r = spawnSync(cmd, { stdio: 'inherit', cwd: ROOT, shell: true })
  if (r.status !== 0) {
    console.error('命令执行失败，退出码 ' + r.status)
    process.exit(r.status ?? 1)
  }
}

console.log('=== 第 1 步：准备运行时（Node.js + dsh）===')
run(process.execPath, [path.join(__dirname, 'setup-runtime.js')])

console.log('\n=== 第 2 步：打包 Windows 安装包（electron-builder）===')
const builder = path.join(
  ROOT,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'electron-builder.cmd' : 'electron-builder'
)
run(builder, ['--win', 'nsis', '--x64'])

console.log('\n完成！安装包位于 dist/ 目录。')
