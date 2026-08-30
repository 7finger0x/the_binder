export type Box = { x: number; y: number; w: number; h: number };

export function ninePocketBoxes(width: number, height: number, origin: Box = { x: 0, y: 0, w: width, h: height }): Box[] {
  const insetX = origin.w * 0.02;
  const insetY = origin.h * 0.02;
  const w = (origin.w - insetX * 2) / 3;
  const h = (origin.h - insetY * 2) / 3;
  const boxes: Box[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      boxes.push({
        x: origin.x + insetX + col * w,
        y: origin.y + insetY + row * h,
        w,
        h,
      });
    }
  }
  return boxes;
}

/** Strongest `count` valleys in a 1D energy row (gutters between cards). */
export function valleyIndices(values: number[], count: number) {
  if (values.length < 8 || count <= 0) return [];
  const kernel = Math.max(2, Math.round(values.length * 0.04));
  const smooth: number[] = values.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = -kernel; k <= kernel; k++) {
      const j = i + k;
      if (j < 0 || j >= values.length) continue;
      sum += values[j];
      n++;
    }
    return sum / n;
  });
  const min = Math.min(...smooth);
  const max = Math.max(...smooth);
  const mid = min + (max - min) * 0.35;
  const candidates: { i: number; v: number }[] = [];
  for (let i = kernel; i < smooth.length - kernel; i++) {
    if (smooth[i] > mid) continue;
    if (smooth[i] <= smooth[i - 1] && smooth[i] <= smooth[i + 1]) {
      candidates.push({ i, v: smooth[i] });
    }
  }
  candidates.sort((a, b) => a.v - b.v);
  const picked: number[] = [];
  const minGap = values.length / (count + 2);
  for (const c of candidates) {
    if (picked.some((p) => Math.abs(p - c.i) < minGap)) continue;
    picked.push(c.i);
    if (picked.length === count) break;
  }
  return picked.sort((a, b) => a - b);
}

export function boxesFromFractions(
  naturalWidth: number,
  naturalHeight: number,
  fractions: { x: number; y: number; w: number; h: number }[],
): Box[] {
  return fractions
    .map((b) => ({
      x: b.x * naturalWidth,
      y: b.y * naturalHeight,
      w: b.w * naturalWidth,
      h: b.h * naturalHeight,
    }))
    .filter((b) => b.w > 8 && b.h > 8);
}

export function cropToJpeg(img: HTMLImageElement, box: Box, maxEdge = 720, quality = 0.72) {
  const sx = Math.max(0, Math.round(box.x));
  const sy = Math.max(0, Math.round(box.y));
  const sw = Math.max(1, Math.min(img.naturalWidth - sx, Math.round(box.w)));
  const sh = Math.max(1, Math.min(img.naturalHeight - sy, Math.round(box.h)));
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function compressFull(img: HTMLImageElement, maxEdge = 1280, quality = 0.72) {
  return cropToJpeg(img, { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight }, maxEdge, quality);
}

export function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn’t read that photo"));
    img.src = src;
  });
}

export async function fileToJpeg(file: File, maxEdge = 900, quality = 0.78) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return compressFull(img, maxEdge, quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function readSmall(img: HTMLImageElement, max = 220) {
  const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h, scale };
}

function contentBox(img: HTMLImageElement): Box {
  const sample = readSmall(img);
  if (!sample) {
    return { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  }
  const { data, w, h, scale } = sample;
  const corner = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [data[i], data[i + 1], data[i + 2]] as const;
  };
  const bg = [0, 0, 0].map((_, c) => {
    const pts = [corner(2, 2), corner(w - 3, 2), corner(2, h - 3), corner(w - 3, h - 3)];
    return pts.reduce((s, p) => s + p[c], 0) / pts.length;
  });
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dist = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
      if (dist < 48) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
  }
  const padX = (maxX - minX) * 0.02;
  const padY = (maxY - minY) * 0.02;
  const x = Math.max(0, (minX - padX) / scale);
  const y = Math.max(0, (minY - padY) / scale);
  const boxW = Math.min(img.naturalWidth - x, (maxX - minX + padX * 2) / scale);
  const boxH = Math.min(img.naturalHeight - y, (maxY - minY + padY * 2) / scale);
  return { x, y, w: boxW, h: boxH };
}

function edgeEnergy(img: HTMLImageElement) {
  const sample = readSmall(img, 180);
  if (!sample) return null;
  const { data, w, h, scale } = sample;
  const lum = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
  };
  const cols = new Array(w).fill(0);
  const rows = new Array(h).fill(0);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const dx = lum(x + 1, y) - lum(x - 1, y);
      const dy = lum(x, y + 1) - lum(x, y - 1);
      const mag = Math.abs(dx) + Math.abs(dy);
      cols[x] += mag;
      rows[y] += mag;
    }
  }
  return { cols, rows, scale, w, h };
}

export function detectPockets(img: HTMLImageElement): Box[] {
  const bounds = contentBox(img);
  const energy = edgeEnergy(img);
  if (!energy) return ninePocketBoxes(img.naturalWidth, img.naturalHeight, bounds);
  const x0 = Math.round(bounds.x * energy.scale);
  const x1 = Math.round((bounds.x + bounds.w) * energy.scale);
  const y0 = Math.round(bounds.y * energy.scale);
  const y1 = Math.round((bounds.y + bounds.h) * energy.scale);
  const colSlice = energy.cols.slice(Math.max(0, x0), Math.min(energy.w, x1));
  const rowSlice = energy.rows.slice(Math.max(0, y0), Math.min(energy.h, y1));
  const vGutters = valleyIndices(colSlice, 2).map((i) => (i + Math.max(0, x0)) / energy.scale);
  const hGutters = valleyIndices(rowSlice, 2).map((i) => (i + Math.max(0, y0)) / energy.scale);
  if (vGutters.length < 2 || hGutters.length < 2) {
    return ninePocketBoxes(img.naturalWidth, img.naturalHeight, bounds);
  }
  const xs = [bounds.x, vGutters[0], vGutters[1], bounds.x + bounds.w];
  const ys = [bounds.y, hGutters[0], hGutters[1], bounds.y + bounds.h];
  const boxes: Box[] = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      boxes.push({
        x: xs[c],
        y: ys[r],
        w: xs[c + 1] - xs[c],
        h: ys[r + 1] - ys[r],
      });
    }
  }
  return boxes;
}

export function splitNine(img: HTMLImageElement) {
  return detectPockets(img).map((box) => cropToJpeg(img, box));
}

export function splitBoxes(img: HTMLImageElement, boxes: Box[]) {
  return boxes.map((box) => cropToJpeg(img, box));
}

/** Flip a 9-pocket page left-to-right per row (how a sleeve looks from the back). */
export function mirrorNine<T>(items: T[]): T[] {
  const src = items.slice(0, 9);
  const out: T[] = [];
  for (let row = 0; row < 3; row++) {
    const i = row * 3;
    out.push(src[i + 2], src[i + 1], src[i]);
  }
  return out.filter((v) => v !== undefined);
}
