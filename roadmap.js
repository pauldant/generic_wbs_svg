/* Edit roadmap.json to change the schedule, colors, labels, and number of weeks.
   Run `python3 -m http.server 8000` in this folder, then open localhost:8000.
   The renderer creates a true SVG and Export SVG downloads that vector artwork. */
const DATA_FILE = './roadmap.json';
const SVG_NS = 'http://www.w3.org/2000/svg';

function svgElement(tag, attrs = {}, text) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  if (text !== undefined) node.textContent = text;
  return node;
}

function validateColor(color) {
  if (!/^#[0-9a-fA-F]{3,8}$/.test(color)) throw new Error(`Invalid color: ${color}`);
  return color;
}

function resolveColor(data, key) {
  return validateColor(data.colors[key] || key);
}

function renderRoadmap(data) {
  const svg = document.querySelector('#roadmap-svg');
  svg.replaceChildren();

  const weeks = Number(data.weeks);
  if (!Number.isInteger(weeks) || weeks < 1 || weeks > 52) throw new Error('weeks must be an integer from 1 to 52');

  // Fixed internal coordinate system = deterministic, high-quality vector export.
  const W = 1800;
  const PAD_X = 34;
  const TOP = 34;
  const LABEL_W = 430;
  const GAP = 8;
  const CELL_H = 51;
  const ROW_GAP = 8;
  const HEADER_H = 132;
  const AXIS_H = 34;
  const FOOTER_TOP_GAP = 26;
  const FOOTER_PAD_TOP = 24;
  const LEGEND_H = 28;
  const NOTE_H = data.note ? 46 : 0;
  const rowsH = data.rows.length * (CELL_H + ROW_GAP) - ROW_GAP;
  const H = TOP + HEADER_H + AXIS_H + rowsH + FOOTER_TOP_GAP + FOOTER_PAD_TOP + LEGEND_H + NOTE_H + 28;
  const gridX = PAD_X + LABEL_W;
  const gridW = W - PAD_X * 2 - LABEL_W;
  const cellW = (gridW - GAP * (weeks - 1)) / weeks;

  svg.setAttribute('xmlns', SVG_NS);
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

  const titleNode = svgElement('title', { id: 'roadmap-title' }, data.title || 'POC delivery roadmap');
  const descNode = svgElement('desc', { id: 'roadmap-desc' }, data.subtitle || 'POC delivery roadmap');
  svg.append(titleNode, descNode);

  const defs = svgElement('defs');
  const gradient = svgElement('linearGradient', { id: 'roadmap-bg', x1: '0%', y1: '0%', x2: '100%', y2: '100%' });
  gradient.append(
    svgElement('stop', { offset: '0%', 'stop-color': '#0f1215' }),
    svgElement('stop', { offset: '58%', 'stop-color': '#111519' }),
    svgElement('stop', { offset: '100%', 'stop-color': '#0e1115' })
  );
  const shadow = svgElement('filter', { id: 'shadow', x: '-10%', y: '-10%', width: '120%', height: '130%' });
  shadow.append(svgElement('feDropShadow', { dx: '0', dy: '6', stdDeviation: '12', 'flood-color': '#000000', 'flood-opacity': '.32' }));
  defs.append(gradient, shadow);
  svg.append(defs);

  // Self-contained CSS is embedded so the downloaded SVG renders independently.
  const style = svgElement('style', {}, `
    text { font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; }
    .title { fill:#f7f8fa; font-size:42px; font-weight:760; letter-spacing:-1.4px; }
    .subtitle { fill:#c2c7d0; font-size:20px; }
    .badge { fill:#83b7ff; font-size:25px; }
    .axis { fill:#b8c0ca; font-size:16px; }
    .week { fill:#cbd1db; font-size:16px; text-anchor:middle; }
    .row-title { fill:#f7f8fa; font-size:18px; font-weight:540; }
    .row-subtitle { fill:#aab2bd; font-size:15px; }
    .legend { fill:#cbd0d8; font-size:15px; }
    .note { fill:#8f9aa8; font-size:13px; }
  `);
  svg.append(style);

  // Export the browser/page background as part of the SVG itself.
  // This prevents the rounded outer corners from becoming transparent when
  // the SVG is inserted into Word or PowerPoint.
  svg.append(svgElement('rect', {
    x: 0, y: 0, width: W, height: H, fill: '#0b0d0f'
  }));

  // Roadmap panel background.
  svg.append(svgElement('rect', {
    x: 2, y: 2, width: W - 4, height: H - 4, rx: 22,
    fill: 'url(#roadmap-bg)', stroke: '#f5f7f8', 'stroke-width': 2,
    filter: 'url(#shadow)'
  }));

  // Heading.
  svg.append(svgElement('text', { x: PAD_X, y: TOP + 40, class: 'title' }, data.title));
  svg.append(svgElement('text', { x: PAD_X, y: TOP + 88, class: 'subtitle' }, data.subtitle));

  const badgeText = data.badge || `${weeks} weeks`;
  const badgeW = Math.max(130, badgeText.length * 15 + 34);
  const badgeX = W - PAD_X - badgeW;
  svg.append(svgElement('rect', { x: badgeX, y: TOP - 1, width: badgeW, height: 49, rx: 25, fill: '#12243c' }));
  svg.append(svgElement('text', { x: badgeX + badgeW / 2, y: TOP + 31, class: 'badge', 'text-anchor': 'middle' }, badgeText));

  // Week axis.
  const axisY = TOP + HEADER_H;
  svg.append(svgElement('text', { x: PAD_X, y: axisY + 20, class: 'axis' }, 'Week'));
  for (let week = 1; week <= weeks; week++) {
    const x = gridX + (week - 1) * (cellW + GAP) + cellW / 2;
    svg.append(svgElement('text', { x, y: axisY + 20, class: 'week' }, String(week)));
  }

  // Timeline rows.
  let rowY = axisY + AXIS_H;
  for (const row of data.rows) {
    const hasSubtitle = Boolean(row.subtitle);
    svg.append(svgElement('text', { x: PAD_X, y: rowY + (hasSubtitle ? 21 : 31), class: 'row-title' }, row.label));
    if (hasSubtitle) svg.append(svgElement('text', { x: PAD_X, y: rowY + 43, class: 'row-subtitle' }, row.subtitle));

    for (let week = 1; week <= weeks; week++) {
      const matches = (row.blocks || []).filter(block => week >= block.start && week <= block.end);
      const fill = matches.length ? resolveColor(data, matches[matches.length - 1].color) : '#22272b';
      const x = gridX + (week - 1) * (cellW + GAP);
      const cell = svgElement('rect', { x, y: rowY, width: cellW, height: CELL_H, rx: 5, fill });
      if (matches.length) cell.append(svgElement('title', {}, `${row.label}: week ${week}`));
      svg.append(cell);
    }
    rowY += CELL_H + ROW_GAP;
  }

  // Footer + legend.
  const footerY = rowY - ROW_GAP + FOOTER_TOP_GAP;
  svg.append(svgElement('line', { x1: PAD_X, y1: footerY, x2: W - PAD_X, y2: footerY, stroke: '#282d32', 'stroke-width': 2 }));

  let legendX = PAD_X;
  const legendY = footerY + FOOTER_PAD_TOP;
  for (const item of data.legend || []) {
    const color = resolveColor(data, item.color);
    svg.append(svgElement('rect', { x: legendX, y: legendY, width: 23, height: 23, rx: 5, fill: color }));
    svg.append(svgElement('text', { x: legendX + 34, y: legendY + 17, class: 'legend' }, item.label));
    legendX += 70 + item.label.length * 8.2;
  }

  if (data.note) svg.append(svgElement('text', { x: PAD_X, y: legendY + 52, class: 'note' }, data.note));

  document.querySelector('#export-svg').disabled = false;
}

function exportSVG() {
  const svg = document.querySelector('#roadmap-svg');
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', SVG_NS);
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  const declaration = '<?xml version="1.0" encoding="UTF-8"?>\n';
  const source = declaration + new XMLSerializer().serializeToString(clone);
  const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'POC-Estimated-Delivery.svg';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function main() {
  try {
    const response = await fetch(DATA_FILE, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Unable to load ${DATA_FILE}: HTTP ${response.status}`);
    renderRoadmap(await response.json());
    document.querySelector('#export-svg').addEventListener('click', exportSVG);
  } catch (error) {
    const message = document.querySelector('#error');
    message.hidden = false;
    message.textContent = `${error.message}. Serve this directory with: python3 -m http.server 8000`;
    console.error(error);
  }
}

main();
