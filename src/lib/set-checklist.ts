import type { SetGroup } from "@/lib/portfolio";

export function printSetChecklist(set: SetGroup) {
  const rows = set.cards
    .map((c) => `<tr><td>${escape(c.number)}</td><td>${escape(c.name)}</td><td>${escape(c.variant)}</td><td>☑</td></tr>`)
    .join("");
  const html = `<!doctype html><html><head><title>${escape(set.label)} checklist</title>
<style>body{font-family:system-ui;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head>
<body><h1>${escape(set.label)}</h1><p>${set.ownedCount} owned cards</p>
<table><thead><tr><th>#</th><th>Name</th><th>Variant</th><th>Owned</th></tr></thead><tbody>${rows}</tbody></table>
<script>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
