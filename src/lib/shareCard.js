// Generates a branded PNG of the final standings and shares it via the Web
// Share API (so it lands straight in WhatsApp/Messages on mobile). Falls back
// to downloading the image when file-sharing isn't supported (most desktops).

const SHARE_URL = 'kachuful-70077.web.app'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function truncate(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(`${t}…`).width > maxWidth) t = t.slice(0, -1)
  return `${t}…`
}

const MEDALS = { 1: '🥇', 2: '🥈', 3: '🥉' }

/** Draw the result card onto a canvas. `players` are pre-sorted by rank. */
export function drawResultCard(canvas, data) {
  const players = data.players.slice(0, 6)
  const scale = 2
  const W = 600
  const PADX = 36
  const rowsStartY = 158
  const rowH = 60
  const footerH = 66
  const H = rowsStartY + players.length * rowH + footerH

  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)

  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#15281c')
  bg.addColorStop(1, '#0c140e')
  ctx.fillStyle = bg
  roundRect(ctx, 0, 0, W, H, 26)
  ctx.fill()
  ctx.strokeStyle = 'rgba(201,150,58,0.5)'
  ctx.lineWidth = 2
  roundRect(ctx, 1, 1, W - 2, H - 2, 25)
  ctx.stroke()

  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(201,150,58,0.9)'
  ctx.font = '600 17px Georgia, serif'
  ctx.fillText('K A C H U F U L', W / 2, 50)
  ctx.fillStyle = '#fde9c8'
  ctx.font = '700 32px Georgia, serif'
  ctx.fillText('Game Over', W / 2, 92)
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '400 14px sans-serif'
  ctx.fillText(`${players.length} players · ${data.totalRounds} rounds`, W / 2, 118)

  players.forEach((p, i) => {
    const y = rowsStartY + i * rowH
    const isWinner = p.rank === 1

    if (isWinner) {
      ctx.fillStyle = 'rgba(201,150,58,0.14)'
      roundRect(ctx, PADX - 8, y - 6, W - (PADX - 8) * 2, rowH - 8, 12)
      ctx.fill()
    } else if (p.isMe) {
      ctx.fillStyle = 'rgba(255,255,255,0.05)'
      roundRect(ctx, PADX - 8, y - 6, W - (PADX - 8) * 2, rowH - 8, 12)
      ctx.fill()
    }

    const midY = y + (rowH - 8) / 2 - 4

    ctx.textAlign = 'left'
    ctx.font = '600 20px sans-serif'
    ctx.fillStyle = isWinner ? '#fbbf24' : 'rgba(255,255,255,0.45)'
    ctx.fillText(MEDALS[p.rank] ?? `${p.rank}`, PADX, midY + 7)

    const nameX = PADX + 48
    const nameText = `${p.name}${p.isMe ? ' (You)' : ''}`
    ctx.font = '600 21px sans-serif'
    ctx.fillStyle = p.isMe ? '#fcd34d' : isWinner ? '#fde9c8' : '#e8eae6'
    const titleStr = p.title ? `  ${p.title.emoji} ${p.title.label}` : ''
    const reservedRight = 150
    const nameMax = W - PADX - reservedRight - nameX
    ctx.fillText(truncate(ctx, nameText, nameMax), nameX, midY + 7)
    const nameW = ctx.measureText(truncate(ctx, nameText, nameMax)).width

    if (titleStr) {
      ctx.font = '400 13px sans-serif'
      ctx.fillStyle = 'rgba(251,191,36,0.8)'
      ctx.fillText(titleStr, nameX + nameW + 2, midY + 6)
    }

    ctx.textAlign = 'right'
    ctx.font = '700 22px sans-serif'
    ctx.fillStyle = isWinner ? '#fbbf24' : '#d4d4d8'
    ctx.fillText(`${p.score}`, W - PADX, midY + 8)
  })

  const fy = H - footerH + 36
  ctx.textAlign = 'left'
  ctx.font = '400 13px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText(data.dateLabel, PADX, fy)
  ctx.textAlign = 'right'
  ctx.fillStyle = 'rgba(201,150,58,0.85)'
  ctx.fillText(SHARE_URL, W - PADX, fy)
}

function canvasToBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

/**
 * Build the result image and share it. Returns 'shared' | 'downloaded'.
 * Throws only on genuine failure (cancellation resolves quietly as 'shared').
 */
export async function shareResult(data) {
  const winner = data.players.find((p) => p.rank === 1)
  const shareText = winner
    ? `🏆 ${winner.name} won our Kachuful game! Play at ${SHARE_URL}`
    : `Our Kachuful results — play at ${SHARE_URL}`

  const canvas = document.createElement('canvas')
  drawResultCard(canvas, data)
  const blob = await canvasToBlob(canvas)
  const file = blob ? new File([blob], 'kachuful-result.png', { type: 'image/png' }) : null

  if (file && navigator.canShare?.({ files: [file] }) && navigator.share) {
    try {
      await navigator.share({ files: [file], text: shareText })
      return 'shared'
    } catch (err) {
      if (err?.name === 'AbortError') return 'shared'
      // fall through to download
    }
  }

  if (blob) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'kachuful-result.png'
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  }

  throw new Error('Could not create the result image.')
}
