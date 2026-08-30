export type Box = { x: number; y: number; w: number; h: number };

/** 3×3 binder-sleeve grid in natural image pixels, with a small inset. */
export function ninePocketBoxes(naturalWidth: number, naturalHeight: number): Box[] {
  const insetX = naturalWidth * 0.03;
  const insetY = naturalHeight * 0.03;
  const w = (naturalWidth - insetX * 2) / 3;
  const h = (naturalHeight - insetY * 2) / 3;
  const boxes: Box[] = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      boxes.push({
        x: insetX + col * w,
        y: insetY + row * h,
        w,
        h,
      });
    }
  }
  return boxes;
}

export function cropToJpeg(
  img: HTMLImageElement,
  box: Box,
  maxEdge = 720,
  quality = 0.72,
) {
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

export function splitNine(img: HTMLImageElement) {
  return ninePocketBoxes(img.naturalWidth, img.naturalHeight).map((box) => cropToJpeg(img, box));
}
