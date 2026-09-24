'use strict'

/**
 * 将 dist/ 产物发布到 GitHub Releases（创建或更新指定 tag 的 release）。
 *
 * 为什么不用 `electron-builder --publish`：
 *   本地已经打好包（dist/win-unpacked + 安装包），只需把现成产物传上去。
 *   本脚本避免重新构建，也避开 electron-builder 在离线环境下的网络探测问题。
 *
 * 用法：
 *   $env:GH_TOKEN = "ghp_xxx"      # classic PAT（repo 权限）或 fine-grained（Contents: Read and write）
 *   node scripts/publish-github.cjs --repo cnskycn/deepseek-harness-desktop [--tag v1.4.7] [--dry-run] [--draft]
 *
 * 上传内容：安装包 exe、其 blockmap、latest.yml（自动更新清单）。
 * 发布说明取自 release-notes-v<version>.md。
 */

const fs = require('fs')
const path = require('path')
const https = require('https')

const DIST = path.join(__dirname, '..', 'dist')
const version = require('../package.json').version

function parseArgs(argv) {
  const o = { repo: null, tag: null, dryRun: false, draft: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--repo') o.repo = argv[++i]
    else if (a === '--tag') o.tag = argv[++i]
    else if (a === '--dry-run') o.dryRun = true
    else if (a === '--draft') o.draft = true
  }
  if (!o.tag) o.tag = `v${version}`
  return o
}

function apiRequest(method, urlPath, { token, body, host = 'api.github.com' }) {
  return new Promise((resolve, reject) => {
    const data = body ? Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)) : null
    const req = https.request(
      {
        host,
        path: urlPath,
        method,
        headers: {
          'User-Agent': 'dsh-desktop-release',
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          ...(data ? { 'Content-Type': 'application/json', 'Content-Length': data.length } : {}),
        },
        timeout: 120000,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let json = null
          try {
            json = JSON.parse(text)
          } catch (_) {}
          resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, json, text })
        })
      }
    )
    req.on('error', reject)
    req.on('timeout', () => req.destroy(new Error('请求超时')))
    if (data) req.write(data)
    req.end()
  })
}

/** 流式上传单个资产（大文件不驻留内存） */
function uploadAsset(uploadUrl, filePath, token) {
  return new Promise((resolve, reject) => {
    const name = path.basename(filePath)
    const size = fs.statSync(filePath).size
    const url = new URL(uploadUrl)
    url.searchParams.set('name', name)
    const req = https.request(
      {
        host: url.host,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'User-Agent': 'dsh-desktop-release',
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/octet-stream',
          'Content-Length': size,
        },
        timeout: 1800000,
      },
      (res) => {
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let json = null
          try {
            json = JSON.parse(text)
          } catch (_) {}
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json || {})
          else reject(new Error(`HTTP ${res.statusCode}: ${text.slice(0, 300)}`))
        })
      }
    )
    req.on('error', reject)
    const stream = fs.createReadStream(filePath)
    stream.on('error', reject)
    stream.pipe(req)
  })
}

async function main() {
  const o = parseArgs(process.argv.slice(2))
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
  if (!o.repo || !o.repo.includes('/')) {
    console.error('缺少 --repo <owner>/<repo>')
    process.exit(1)
  }
  if (!token) {
    console.error('缺少 GH_TOKEN / GITHUB_TOKEN 环境变量（GitHub 访问令牌）')
    process.exit(1)
  }

  const [owner, repo] = o.repo.split('/')
  const files = [
    `DeepSeek-Harness-Setup-${version}.exe`,
    `DeepSeek-Harness-Setup-${version}.exe.blockmap`,
    'latest.yml',
  ].map((f) => path.join(DIST, f))

  for (const f of files) {
    if (!fs.existsSync(f)) {
      console.error(`缺少产物：${f}（请先执行 npm run dist）`)
      process.exit(1)
    }
    console.log(`  待上传：${path.basename(f)}  ${(fs.statSync(f).size / 1048576).toFixed(1)} MB`)
  }

  const notesFile = path.join(__dirname, '..', `release-notes-v${version}.md`)
  const body = fs.existsSync(notesFile) ? fs.readFileSync(notesFile, 'utf8') : `Release v${version}`

  if (o.dryRun) {
    console.log('[github] dry-run：仅列出待上传文件，未做任何写入')
    return
  }

  console.log(`[github] 仓库 ${o.repo} / tag ${o.tag}`)

  let rel = null
  const existing = await apiRequest('GET', `/repos/${owner}/${repo}/releases/tags/${o.tag}`, { token })
  if (existing.ok) {
    rel = existing.json
    console.log(`[github] release ${o.tag} 已存在（id=${rel.id}），更新说明并覆盖同名附件`)
    await apiRequest('PATCH', `/repos/${owner}/${repo}/releases/${rel.id}`, { token, body: { body } })
  } else if (existing.status === 404) {
    const created = await apiRequest('POST', `/repos/${owner}/${repo}/releases`, {
      token,
      body: { tag_name: o.tag, name: o.tag, body, draft: o.draft, prerelease: false },
    })
    if (!created.ok) {
      console.error(`[github] 创建 release 失败：HTTP ${created.status} ${created.text.slice(0, 300)}`)
      process.exit(1)
    }
    rel = created.json
    console.log(`[github] 已创建 release ${o.tag}（id=${rel.id}）`)
  } else {
    console.error(`[github] 查询 release 失败：HTTP ${existing.status} ${existing.text.slice(0, 300)}`)
    process.exit(1)
  }

  const assets = await apiRequest('GET', `/repos/${owner}/${repo}/releases/${rel.id}/assets`, { token })
  const existingAssets = assets.ok && Array.isArray(assets.json) ? assets.json : []
  for (const f of files) {
    const name = path.basename(f)
    const dup = existingAssets.find((a) => a.name === name)
    if (dup) {
      console.log(`[github] 删除旧附件 ${name}（id=${dup.id}）`)
      await apiRequest('DELETE', `/repos/${owner}/${repo}/releases/assets/${dup.id}`, { token })
    }
    console.log(`[github] 上传 ${name} …`)
    await uploadAsset(rel.upload_url.replace('{?name,label}', ''), f, token)
    console.log('       完成')
  }

  console.log(`\n[github] 全部完成 ✅`)
  console.log(`[github] Release: https://github.com/${o.repo}/releases/tag/${o.tag}`)
}

main().catch((e) => {
  console.error('[github] 失败：' + (e && e.message))
  process.exit(1)
})
