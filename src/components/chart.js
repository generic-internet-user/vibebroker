import { getHistory } from '../services/market-data.js';

export async function renderChart(container, symbol) {
  container.innerHTML = '<div class="muted" style="padding:24px;text-align:center">Loading chart...</div>';

  try {
    const candles = await getHistory(symbol, 'D', 90);
    if (!candles || candles.length === 0) {
      container.innerHTML = '<div class="muted" style="padding:24px;text-align:center">No data available</div>';
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth || 400;
    canvas.height = 280;
    canvas.style.width = '100%';
    canvas.style.height = '280px';
    container.innerHTML = '';
    container.appendChild(canvas);

    drawChart(canvas, candles, symbol);
  } catch (e) {
    container.innerHTML = `<div class="muted" style="padding:24px;text-align:center">Chart unavailable: ${e.message}</div>`;
  }
}

function drawChart(canvas, candles, symbol) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const pad = { top: 20, right: 16, bottom: 24, left: 56 };

  const chartW = w - pad.left - pad.right;
  const chartH = h - pad.top - pad.bottom;

  const high = Math.max(...candles.map(c => c.high)) * 1.02;
  const low = Math.min(...candles.map(c => c.low)) * 0.98;
  const range = high - low || 1;

  ctx.clearRect(0, 0, w, h);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);

  // Grid lines
  ctx.strokeStyle = '#eef0f2';
  ctx.lineWidth = 1;
  const gridLines = 5;
  for (let i = 0; i <= gridLines; i++) {
    const y = pad.top + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(w - pad.right, y);
    ctx.stroke();

    // Price labels
    const price = high - (range / gridLines) * i;
    ctx.fillStyle = '#8a8f98';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(price.toFixed(2), pad.left - 4, y + 3);
  }

  // Draw candles
  const candleW = Math.max(1, Math.floor(chartW / candles.length * 0.7));
  const spacing = chartW / candles.length;

  candles.forEach((c, i) => {
    const x = pad.left + i * spacing;
    const openY = pad.top + chartH - ((c.open - low) / range) * chartH;
    const closeY = pad.top + chartH - ((c.close - low) / range) * chartH;
    const highY = pad.top + chartH - ((c.high - low) / range) * chartH;
    const lowY = pad.top + chartH - ((c.low - low) / range) * chartH;

    const isUp = c.close >= c.open;
    ctx.fillStyle = isUp ? '#1a7d36' : '#c5221f';
    ctx.strokeStyle = isUp ? '#1a7d36' : '#c5221f';
    ctx.lineWidth = 1;

    // Wick
    ctx.beginPath();
    ctx.moveTo(x + candleW / 2, highY);
    ctx.lineTo(x + candleW / 2, lowY);
    ctx.stroke();

    // Body
    const bodyTop = Math.min(openY, closeY);
    const bodyH = Math.max(1, Math.abs(closeY - openY));
    ctx.fillRect(x, bodyTop, candleW, bodyH);
  });

  // Symbol label
  ctx.fillStyle = '#1a1b1e';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(symbol, pad.left, 14);

  // Last price
  const last = candles[candles.length - 1];
  ctx.fillStyle = last.close >= last.open ? '#1a7d36' : '#c5221f';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`$${last.close.toFixed(2)}`, w - pad.right, 14);
}

export function resizeChart(canvas) {
  if (!canvas) return;
  canvas.width = canvas.parentElement.clientWidth || 400;
}
