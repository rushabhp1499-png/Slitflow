import { BundleRecord, MaterialInward } from '../types';
import { COMPANY } from '../config/company';

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

const kg = (n: number) => n.toFixed(2);

// Opens a print window with one 100 x 75 mm bundle sticker (standard thermal label size).
// Returns false when the browser blocked the window.
export function printBundleSticker(bundle: BundleRecord, job: MaterialInward): boolean {
  const win = window.open('', '_blank', 'width=480,height=420');
  if (!win) return false;

  const tare = (bundle.paperCoreTareWeightKg || 0) + (bundle.otherPackagingTareKg || 0);
  const weighed = new Date(bundle.weighedAt).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  win.document.write(`<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(bundle.bundleTag)} sticker</title>
<style>
  @page { size: 100mm 75mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; overflow: hidden; font-family: Arial, Helvetica, sans-serif; color: #000; }
  .label { width: 100mm; height: 75mm; overflow: hidden; padding: 3mm 4mm; display: flex; flex-direction: column; gap: 1.5mm; }
  .top { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 0.4mm solid #000; padding-bottom: 1mm; }
  .co { font-size: 9pt; font-weight: bold; }
  .date { font-size: 7pt; }
  .tag { font-size: 22pt; font-weight: 900; letter-spacing: 0.5pt; }
  .po { font-size: 13pt; font-weight: bold; }
  .row { font-size: 8.5pt; line-height: 1.25; }
  .weights { display: grid; grid-template-columns: 1fr 1fr 1fr; border: 0.4mm solid #000; margin-top: auto; }
  .weights div { padding: 1mm; text-align: center; border-left: 0.3mm solid #000; }
  .weights div:first-child { border-left: none; }
  .weights span { display: block; font-size: 7pt; }
  .weights b { font-size: 12pt; }
  .net b { font-size: 15pt; }
</style></head>
<body>
  <div class="label">
    <div class="top"><span class="co">${esc(COMPANY.name)}</span><span class="date">${esc(weighed)}</span></div>
    <div style="display:flex;justify-content:space-between;align-items:baseline">
      <span class="tag">${esc(bundle.bundleTag)}</span>
      <span class="po">PO ${esc(job.customerPoNo || '')}</span>
    </div>
    <div class="row"><b>${esc(job.customerName)}</b></div>
    <div class="row">${esc(job.grade)} • ${esc(String(job.thickness))} ${esc(job.thicknessUnit)}</div>
    <div class="row">${esc(bundle.rollsSummary || `${bundle.totalRollsCount} rolls`)}</div>
    <div class="row">Job ${esc(job.jobNo)}</div>
    <div class="weights">
      <div><span>GROSS kg</span><b>${kg(bundle.grossWeightKg)}</b></div>
      <div><span>TARE kg</span><b>${kg(tare)}</b></div>
      <div class="net"><span>NET kg</span><b>${kg(bundle.netWeightKg)}</b></div>
    </div>
  </div>
  <script>window.onload = function () { window.focus(); window.print(); };</script>
</body></html>`);
  win.document.close();
  return true;
}
