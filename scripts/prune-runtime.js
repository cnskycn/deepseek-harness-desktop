'use strict'

/**
 * 精简 dsh runtime：删除运行时不加载的冗余文件，缩小安装包体积。
 *
 * 删除内容（均为非运行时必需）：
 *   1. *.pdb          — 调试符号文件（仅开发调试用，运行时永不加载）
 *   2. @img/sharp-wasm32 — wasm 平台构建（win-x64 使用 native 构建）
 *   3. *.d.ts         — TypeScript 类型声明（仅 IDE 提示用）
 *   4. *.map          — 源地图（仅调试用）
 *
 * 保留：node-pty / sharp 本体及 native 构建（被 dsh 核心依赖顶层 import，不能删）。
 *
 * 用法：node scripts/prune-runtime.js [--keep-dts]
 *   --keep-dts  保留 .d.ts（牺牲一点体积换 IDE 提示，默认删除）
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const RUNTIME_DIR = path.join(ROOT, 'resources', 'dsh', 'runtime', 'node_modules')

const KEEP_DTS = process.argv.includes('--keep-dts')

function rmIfExist(p) {
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true })
    return true
  }
  return false
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function main() {
  if (!fs.existsSync(RUNTIME_DIR)) {
    console.error('runtime 不存在，请先运行 setup-runtime.js')
    process.exit(1)
  }

  const before = walk(RUNTIME_DIR).reduce((s, f) => s + fs.statSync(f).size, 0)
  const removed = []
  let removedBytes = 0

  const removeFilesByExt = (ext) => {
    const files = walk(RUNTIME_DIR)
    for (const f of files) {
      if (f.endsWith(ext)) {
        const sz = fs.statSync(f).size
        fs.unlinkSync(f)
        removedBytes += sz
        removed.push(f)
      }
    }
  }

  // 1) PDB 调试符号
  removeFilesByExt('.pdb')

  // 2) wasm 平台包（x64 用不到）
  const wasm = path.join(RUNTIME_DIR, '@img', 'sharp-wasm32')
  if (fs.existsSync(wasm)) {
    const sz = walk(wasm).reduce((s, f) => s + fs.statSync(f).size, 0)
    rmIfExist(wasm)
    removedBytes += sz
    removed.push(wasm)
  }

  // 3) .d.ts（默认删）
  if (!KEEP_DTS) removeFilesByExt('.d.ts')

  // 4) .map 源地图
  removeFilesByExt('.map')

  const afterSize = walk(RUNTIME_DIR).reduce((s, f) => s + fs.statSync(f).size, 0)

  console.log(`删除文件数: ${removed.length}`)
  console.log(`释放空间: ${(removedBytes / 1048576).toFixed(1)} MB`)
  console.log(`runtime 体积: ${(before / 1048576).toFixed(1)} MB -> ${(afterSize / 1048576).toFixed(1)} MB`)
}

main()
