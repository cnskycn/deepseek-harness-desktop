'use strict'

/**
 * 生成 electron-updater 所需的 latest.yml（自动更新通道清单）。
 *
 * 背景：electron-builder 在部分环境（如 ELECTRON_BUILDER_OFFLINE 离线打包）
 * 下会写出空的 latest.yml，导致客户端自动更新无法比对版本。
 * 本脚本按官方格式（version / files[url,sha512,size] / path / sha512 / releaseDate）
 * 依据实际安装包重新生成，保证 CNB / GitHub 两条更新通道都可用。
 *
 * 用法：node scripts/gen-latest-yml.cjs
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const version = require('../package.json').version
const dist = path.join(__dirname, '..', 'dist')
const name = `DeepSeek-Harness-Setup-${version}.exe`
const file = path.join(dist, name)

if (!fs.existsSync(file)) {
  console.error(`[latest.yml] 找不到安装包：${file}`)
  process.exit(1)
}

const buf = fs.readFileSync(file)
const sha512 = crypto.createHash('sha512').update(buf).digest('base64')
const releaseDate = new Date().toISOString()

const yml = [
  `version: ${version}`,
  'files:',
  `  - url: ${name}`,
  `    sha512: ${sha512}`,
  `    size: ${buf.length}`,
  `path: ${name}`,
  `sha512: ${sha512}`,
  `releaseDate: '${releaseDate}'`,
  '',
].join('\n')

fs.writeFileSync(path.join(dist, 'latest.yml'), yml)
console.log(`[latest.yml] 已生成：${name} (${(buf.length / 1048576).toFixed(1)} MB)`)
console.log(`  sha512: ${sha512}`)
