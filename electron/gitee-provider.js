'use strict'
const { Provider } = require('electron-updater')
const yaml = require('js-yaml')

const GITEE_API = 'https://gitee.com/api/v5'

/**
 * 自定义 electron-updater provider，从 Gitee Releases 拉取更新。
 * 实例化签名由 electron-updater 固定为 new GiteeProvider(options, updater, runtimeOptions)
 */
class GiteeProvider extends Provider {
  constructor(options, updater, runtimeOptions) {
    super(runtimeOptions)
    this.options = options
    this.updater = updater
    this.owner = options.owner
    this.repo = options.repo
    this.channel = options.channel || 'latest'
    this.token = options.token || process.env.GITEE_TOKEN || null
    // Gitee 附件下载 URL 规则特殊，关闭差量下载（块映射 URL 不易匹配），直接下整包
    if (this.runtimeOptions) this.runtimeOptions.isUseMultipleRangeRequest = false
  }

  // 强制整包下载，避免 Gitee 附件 URL 与 .blockmap 不匹配
  get isUseMultipleRangeRequest() {
    return false
  }

  requestHeaders() {
    const h = { Accept: 'application/json' }
    if (this.token) h.Authorization = `token ${this.token}`
    return h
  }

  assetDownloadUrl(asset) {
    return asset.browser_download_url || asset.url || asset.download_url
  }

  async getLatestVersion() {
    const ref = this.channel === 'latest' ? 'latest' : `tags/${encodeURIComponent(this.channel)}`
    const apiUrl = `${GITEE_API}/repos/${this.owner}/${this.repo}/releases/${ref}`
    const raw = await this.httpRequest(apiUrl, this.requestHeaders())
    const release = JSON.parse(raw)
    const assets = release.assets || []

    const latestYml = assets.find((a) => a.name === 'latest.yml')
    if (!latestYml) {
      throw new Error(`Gitee Release ${release.tag_name} 未包含 latest.yml，无法解析更新信息`)
    }

    const ymlRaw = await this.httpRequest(this.assetDownloadUrl(latestYml), this.requestHeaders())
    const updateInfo = yaml.load(ymlRaw)

    const byName = new Map(assets.map((a) => [a.name, a]))
    const resolve = (fileName) => {
      const asset = byName.get(fileName) || byName.get(fileName.replace(/\\/g, '/'))
      return asset ? this.assetDownloadUrl(asset) : null
    }

    updateInfo.files = (updateInfo.files || []).map((f) => {
      const url = resolve(f.url)
      if (!url) throw new Error(`Gitee Release 中找不到文件 ${f.url}`)
      return { ...f, url }
    })

    if (updateInfo.path) {
      const url = resolve(updateInfo.path)
      if (url) updateInfo.path = url
    }

    updateInfo.releaseName = release.tag_name
    updateInfo.releaseNotes = release.body || ''
    return updateInfo
  }

  resolveFiles(updateInfo) {
    const files = updateInfo.files || []
    return files.map((info) => ({ url: new URL(info.url), info }))
  }
}

module.exports = GiteeProvider
