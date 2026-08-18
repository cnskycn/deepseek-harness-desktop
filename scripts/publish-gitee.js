'use strict'
/**
 * 发布脚本：把 electron-builder 生成的产物上传到 Gitee Release，
 * 供桌面端的自动更新（electron-updater + GiteeProvider）拉取。
 *
 * 用法：
 *   set GITEE_TOKEN=xxxx
 *   node scripts/publish-gitee.js --owner <owner> --repo <repo> --tag v1.2.0 --release-name "v1.2.0" --body "更新说明"
 *
 * 需要上传的附件（自动从 dist/ 读取）：
 *   - DeepSeek Harness-Setup-<version>.exe
 *   - DeepSeek Harness-Setup-<version>.exe.blockmap
 *   - latest.yml
 */
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const GITEE_API = 'https://gitee.com/api/v5'
const DIST = path.join(__dirname, '..', 'dist')

function parseArgs(argv) {
  const o = { owner: null, repo: null, tag: null, name: null, body: '' }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--owner') o.owner = argv[++i]
    else if (a === '--repo') o.repo = argv[++i]
    else if (a === '--tag') o.tag = argv[++i]
    else if (a === '--release-name') o.name = argv[++i]
    else if (a === '--body') o.body = argv[++i]
  }
  return o
}

async function giteeFetch(url, { method = 'GET', body, headers = {}, isJson = true } = {}) {
  const token = process.env.GITEE_TOKEN
  if (!token) throw new Error('缺少环境变量 GITEE_TOKEN')
  const h = { ...headers, Authorization: `token ${token}` }
  const res = await fetch(url, { method, body, headers: h })
  const text = await res.text()
  if (!res.ok) throw new Error(`Gitee API ${method} ${url} 失败: ${res.status} ${text}`)
  return isJson ? JSON.parse(text) : text
}

async function main() {
  const o = parseArgs(process.argv.slice(2))
  if (!o.owner || !o.repo || !o.tag) {
    console.error('用法: node scripts/publish-gitee.js --owner <owner> --repo <repo> --tag v1.2.0 [--release-name ...] [--body ...]')
    process.exit(1)
  }
  if (!process.env.GITEE_TOKEN) {
    console.error('请先设置环境变量 GITEE_TOKEN')
    process.exit(1)
  }

  const version = o.tag.replace(/^v/, '')
  const exe = `DeepSeek Harness-Setup-${version}.exe`
  const blockmap = `${exe}.blockmap`
  const latestYml = 'latest.yml'
  for (const f of [exe, blockmap, latestYml]) {
    if (!fs.existsSync(path.join(DIST, f))) throw new Error(`dist/${f} 不存在，请先执行打包`)
  }

  // 1) 创建 Release（已存在则用已存在的）
  let release
  try {
    release = await giteeFetch(`${GITEE_API}/repos/${o.owner}/${o.repo}/releases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tag_name: o.tag,
        name: o.name || o.tag,
        body: o.body || `Release ${o.tag}`,
        prerelease: false,
        draft: false,
      }),
    })
    console.log(`✓ 创建 Release: ${release.tag_name} (id=${release.id})`)
  } catch (e) {
    // 已存在则按 tag 查询
    const list = await giteeFetch(`${GITEE_API}/repos/${o.owner}/${o.repo}/releases?per_page=100`)
    release = list.find((r) => r.tag_name === o.tag)
    if (!release) throw e
    console.log(`· 复用已有 Release: ${release.tag_name} (id=${release.id})`)
  }

  // 2) 上传附件
  for (const f of [latestYml, blockmap, exe]) {
    const filePath = path.join(DIST, f)
    const form = new FormData()
    form.append('file', new Blob([fs.readFileSync(filePath)]), f)
    await giteeFetch(`${GITEE_API}/repos/${o.owner}/${o.repo}/releases/${release.id}/attach_files`, {
      method: 'POST',
      body: form,
      isJson: false,
    })
    console.log(`✓ 上传 ${f} (${(fs.statSync(filePath).size / 1024 / 1024).toFixed(1)} MB)`)
  }

  console.log('\n发布完成。桌面端下次启动会检测到该 Gitee Release 并自动更新。')
  console.log(`Release 页面: https://gitee.com/${o.owner}/${o.repo}/releases/${o.tag}`)
}

main().catch((e) => {
  console.error('发布失败:', e.message)
  process.exit(1)
})
