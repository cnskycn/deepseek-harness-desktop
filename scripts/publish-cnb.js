'use strict'

/**
 * 把 electron-builder 生成的产物发布到 CNB Release，作为**国内自动更新源**。
 *
 * 背景：dsh 的 Web 界面在 0.1.2+ 启用了 token 鉴权，且 GitHub 在国内访问不稳定；
 * 使用 CNB 后，客户端可通过 `generic` 更新通道从国内 CDN 拉取 latest.yml 与安装包。
 *
 * 关键设计：tag 固定为 `latest`（默认），每次发版**覆盖**同名附件。
 * 这样已安装客户端里写死的更新地址（.../releases/download/latest/）永远指向最新版。
 *
 * 用法：
 *   $env:CNB_TOKEN = "xxxx"                     # CNB 访问令牌（个人设置 → 访问令牌）
 *   node scripts/publish-cnb.js --repo <namespace>/<repo> [--tag latest] [--dry-run]
 *
 * 需要上传的附件（自动从 dist/ 读取）：
 *   - DeepSeek-Harness-Setup-<version>.exe
 *   - DeepSeek-Harness-Setup-<version>.exe.blockmap
 *   - latest.yml
 */

const fs = require('fs')
const path = require('path')

const API = 'https://api.cnb.cool'
const DIST = path.join(__dirname, '..', 'dist')

function parseArgs(argv) {
  const o = { repo: null, tag: 'latest', dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--repo') o.repo = argv[++i]
    else if (a === '--tag') o.tag = argv[++i]
    else if (a === '--dry-run') o.dryRun = true
  }
  return o
}

/** 统一请求封装；返回 { status, ok, json, text } */
async function request(method, urlOrPath, { token, body, binary } = {}) {
  const url = /^https?:\/\//i.test(urlOrPath) ? urlOrPath : API + urlOrPath
  const headers = { Accept: 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  } else if (binary) {
    headers['Content-Type'] = 'application/octet-stream'
    payload = binary
  }
  const res = await fetch(url, { method, headers, body: payload })
  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch (_) {}
  return { status: res.status, ok: res.ok, json, text }
}

/**
 * 从 dist/ 收集需要上传的文件。
 * 注意：dist/ 里可能堆积多个历史版本的安装包，因此按 package.json 的 version 精确匹配，
 * 避免误传旧版本。
 */
function collectAssets() {
  if (!fs.existsSync(DIST)) throw new Error('未找到 dist/ 目录，请先执行 npm run dist')
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'))
  const exe = `DeepSeek-Harness-Setup-${pkg.version}.exe`
  if (!fs.existsSync(path.join(DIST, exe))) {
    throw new Error(
      `dist/ 中未找到当前版本的安装包 ${exe}（package.json version=${pkg.version}），请先执行 npm run dist`
    )
  }
  const wanted = [exe, exe + '.blockmap', 'latest.yml']
  return wanted
    .filter((f) => fs.existsSync(path.join(DIST, f)))
    .map((f) => ({ name: f, path: path.join(DIST, f), size: fs.statSync(path.join(DIST, f)).size }))
}

/** 取（或创建）指定 tag 的 release，返回 release_id */
async function ensureRelease(repo, tag, token) {
  const get = await request('GET', `/${repo}/-/releases/tags/${encodeURIComponent(tag)}`, { token })
  if (get.ok && get.json && get.json.id) {
    console.log(`[cnb] 已存在 release ${tag}（id=${get.json.id}），将覆盖其附件`)
    return get.json.id
  }
  console.log(`[cnb] release ${tag} 不存在，正在创建…（HTTP ${get.status}）`)
  const body = {
    tag_name: tag,
    name: tag,
    body: 'Auto-published by scripts/publish-cnb.js（国内自动更新源，附件每次发版覆盖）',
    target_commitish: 'master'
  }
  const created = await request('POST', `/${repo}/-/releases`, { token, body })
  if (!created.ok || !created.json || !created.json.id) {
    throw new Error(
      `创建 release 失败：HTTP ${created.status} ${created.text.slice(0, 300)}\n` +
        '（若提示 scope 不足，请在 CNB 重新生成访问令牌并勾选仓库/Release 读写权限）'
    )
  }
  console.log(`[cnb] 已创建 release ${tag}（id=${created.json.id}）`)
  return created.json.id
}

/** 上传单个附件：申请上传地址 → PUT → 确认 */
async function uploadAsset(repo, releaseId, asset, token, dryRun) {
  console.log(`[cnb] 上传 ${asset.name}（${(asset.size / 1048576).toFixed(1)} MB）…`)
  if (dryRun) {
    console.log('       dry-run：跳过实际上传')
    return
  }

  const reqUrl = await request('POST', `/${repo}/-/releases/${releaseId}/asset-upload-url`, {
    token,
    body: { asset_name: asset.name, overwrite: true, size: asset.size }
  })
  if (!reqUrl.ok || !reqUrl.json) {
    throw new Error(`申请上传地址失败：HTTP ${reqUrl.status} ${reqUrl.text.slice(0, 300)}`)
  }
  const { upload_url: uploadUrl, verify_url: verifyUrl, expires_in_sec: ttl } = reqUrl.json
  if (!uploadUrl) throw new Error('响应中缺少 upload_url：' + JSON.stringify(reqUrl.json).slice(0, 300))

  const buf = fs.readFileSync(asset.path)
  const put = await request('PUT', uploadUrl, { binary: buf })
  if (!put.ok) throw new Error(`上传失败：HTTP ${put.status} ${put.text.slice(0, 300)}`)

  if (verifyUrl) {
    const confirm = await request('POST', verifyUrl, { token })
    if (!confirm.ok) throw new Error(`确认上传失败：HTTP ${confirm.status} ${confirm.text.slice(0, 300)}`)
  }
  console.log(`       完成${ttl ? `（上传地址有效期 ${ttl}s）` : ''}`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const token = process.env.CNB_TOKEN
  if (!args.repo) {
    console.error('用法：node scripts/publish-cnb.js --repo <namespace>/<repo> [--tag latest] [--dry-run]')
    process.exit(1)
  }
  if (!token) {
    console.error('缺少环境变量 CNB_TOKEN（CNB → 个人设置 → 访问令牌）')
    process.exit(1)
  }

  const assets = collectAssets()
  console.log(`[cnb] 仓库 ${args.repo} / tag ${args.tag}`)
  for (const a of assets) console.log(`       待上传：${a.name}  ${(a.size / 1048576).toFixed(1)} MB`)

  if (args.dryRun) {
    console.log('\n[cnb] dry-run：仅列出待上传文件，未做任何写入')
    return
  }

  const releaseId = await ensureRelease(args.repo, args.tag, token)
  for (const a of assets) {
    await uploadAsset(args.repo, releaseId, a, token, args.dryRun)
  }

  const base = `https://cnb.cool/${args.repo}/-/releases/download/${args.tag}/`
  console.log('\n[cnb] 全部完成 ✅')
  console.log('[cnb] 更新通道 URL（写入 electron/updater.config.json 的 url 字段）：')
  console.log('       ' + base)
  console.log('[cnb] 校验：curl -I ' + base + 'latest.yml')
}

main().catch((e) => {
  console.error('[cnb] 失败：' + (e && e.message ? e.message : e))
  process.exit(1)
})
