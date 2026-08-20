'use strict'
// 生成托盘图标 PNG（纯 Node，无第三方依赖）。
// 输出: build/tray-icon.png (16x16), build/tray-icon@2x.png (32x32)
const fs = require('fs')
const path = require('path')
const zlib = require('zlib')

// --- 最小 PNG 编码器 ---
function crc32(buf) {
  let c, table = []
  for (let n = 0; n < 256; n++) {
    c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8  // bit depth
  ihdr[9] = 6  // color type RGBA
  // raw scanlines with filter byte 0
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4)
  }
  const idat = zlib.deflateSync(raw, { level: 9 })
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))])
}

// --- 绘制: 深蓝圆角方块 + 白色 "D" 粗体 ---
function draw(size) {
  const px = Buffer.alloc(size * size * 4)
  const cx = (size - 1) / 2
  const cy = (size - 1) / 2
  const R = size / 2 - 1
  const stroke = Math.max(1, Math.floor(size / 8))
  const bg = [42, 75, 179, 255]     // #2a4bb3
  const fg = [255, 255, 255, 255]   // white

  function insideCircle(x, y) {
    const dx = x - cx, dy = y - cy
    return Math.sqrt(dx * dx + dy * dy) <= R
  }
  function insideD(x, y) {
    // 用环形 + 竖条近似字母 D: 左竖条 + 右侧圆弧
    const w = size
    // 左竖条 (x from 0.28w to 0.42w), 高度 0.25w..0.75w
    const xLeft = x / w, yRel = y / w
    if (xLeft >= 0.28 && xLeft <= 0.42 && yRel >= 0.3 && yRel <= 0.7) return true
    // 右侧弧: 圆心偏右
    const acx = 0.70 * w, acy = 0.5 * w, ar = 0.26 * w
    const dist = Math.sqrt((x - acx) ** 2 + (y - acy) ** 2)
    if (dist <= ar && x >= acx - ar + stroke && yRel >= 0.3 && yRel <= 0.7) return true
    return false
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (insideCircle(x, y)) {
        if (insideD(x, y)) {
          px[i] = fg[0]; px[i + 1] = fg[1]; px[i + 2] = fg[2]; px[i + 3] = fg[3]
        } else {
          px[i] = bg[0]; px[i + 1] = bg[1]; px[i + 2] = bg[2]; px[i + 3] = bg[3]
        }
      } else {
        px[i] = px[i + 1] = px[i + 2] = px[i + 3] = 0 // 透明
      }
    }
  }
  return px
}

const outDir = path.join(__dirname, '..', 'build')
fs.mkdirSync(outDir, { recursive: true })
for (const [size, name] of [[16, 'tray-icon.png'], [32, 'tray-icon@2x.png']]) {
  const buf = encodePNG(size, size, draw(size))
  const p = path.join(outDir, name)
  fs.writeFileSync(p, buf)
  console.log('wrote', p, buf.length, 'bytes')
}
