'use strict'

/**
 * 准备内置运行时：安装 @deepseek-ai/dsh 到 resources/dsh。
 *
 * Node.js 以 portable 形态打包（resources/node/win-x64/node.exe，不带 npm），
 * 应用启动时优先使用内置 node；仅当内置 node 缺失时才检测系统 Node.js。
 *
 * 用法：node scripts/setup-runtime.js
 * 可用环境变量：
 *   DSH_VERSION  指定 @deepseek-ai/dsh 版本（默认 latest）
 *
 * 需要构建机已安装 Node.js + npm（仅用于下载 dsh 依赖，与最终安装包无关）。
 */

const fs = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const ROOT = path.resolve(__dirname, '..')
// 注意：dsh 依赖安装在 runtime 子目录，使 node_modules 成为“子 node_modules”，
// 从而绕过 electron-builder 对“根 node_modules”的硬编码过滤（见其 util/filter.js）。
const DSH_DIR = path.join(ROOT, 'resources', 'dsh')
const RUNTIME_DIR = path.join(DSH_DIR, 'runtime')
const DSH_VERSION = process.env.DSH_VERSION || 'latest'
const DSH_PKG = '@deepseek-ai/dsh'

function runShell(cmd, cwd) {
  console.log('> ' + cmd)
  const r = spawnSync(cmd, { stdio: 'inherit', cwd, shell: true })
  if (r.status !== 0) {
    console.error('命令执行失败，退出码 ' + r.status)
    process.exit(r.status ?? 1)
  }
}

function main() {
  fs.mkdirSync(RUNTIME_DIR, { recursive: true })
  const pkg = {
    name: 'dsh-runtime',
    version: '1.1.0',
    private: true,
    description: 'Bundled runtime for DeepSeek Harness Desktop',
  }
  fs.writeFileSync(path.join(RUNTIME_DIR, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')

  console.log('正在安装 ' + DSH_PKG + '@' + DSH_VERSION + ' …（可能需要几分钟）')
  runShell(
    'npm install ' +
      DSH_PKG +
      '@' +
      DSH_VERSION +
      ' --no-audit --no-fund --omit=dev --ignore-engines',
    RUNTIME_DIR
  )

  const bin = path.join(RUNTIME_DIR, 'node_modules', '@deepseek-ai', 'dsh', 'lib', 'bin.js')
  if (!fs.existsSync(bin)) {
    console.error('安装完成但未找到 dsh 入口: ' + bin)
    process.exit(1)
  }
  console.log('dsh 已就绪: ' + bin)
}

main()
