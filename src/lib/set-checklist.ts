import { formatMoney } from "@/lib/portfolio";
import type { SetGroup } from "@/lib/portfolio";

export function printSetChecklist(group: SetGroup) {
  const title = [group.year, group.label].filter(Boolean).join(" · ");
  const printDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const rows = group.cards
    .slice()
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }))
    .map((c) => {
      const num = c.number ? `#${c.number}` : "—";
      const variant = c.variant ? ` (${c.variant})` : "";
      const value = c.value ? `$${c.value}` : "";
      return `<tr><td width="28">☑</td><td>${escapeHtml(num)}</td><td>${escapeHtml(c.name)}${escapeHtml(variant)}</td><td align="right">${escapeHtml(value)}</td></tr>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>${escapeHtml(title)} checklist</title>
<style>
  body { font-family: system-ui, sans-serif; padding: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .meta { color: #555; margin: 0 0 16px; font-size: 13px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  td, th { border-bottom: 1px solid #ddd; padding: 8px 6px; vertical-align: top; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #666; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${escapeHtml(title)}</h1>
<p class="meta">${group.ownedCount} owned · ${escapeHtml(formatMoney(group.totalValue))} total value · Printed ${escapeHtml(printDate)}</p>
<p class="meta">The Binder set checklist — checked rows are cards in your collection.</p>
<table>
<thead><tr><th></th><th>#</th><th>Card</th><th>Value</th></tr></thead>
<tbody>${rows}</tbody>
</table>
<script>window.onload = () => window.print()</script>
</body></html>`;

  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  return true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
