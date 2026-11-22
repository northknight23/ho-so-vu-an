#!/usr/bin/env node
/**
 * Kiểm chứng mô hình logic của một vụ án có mục "logic" trong file bí mật:
 *
 *   node tools/check-logic.mjs case-03
 *
 * Lớp suy diễn (logic phi đơn điệu — xem docs/case-03-logic.md mục 5):
 *   luật chỉ  ρ: P ⇒ Nghi(x)   (khả bác)      — logic.point[]  { if: [...], then: [...] }
 *   luật bác  δ: P ⇒ ¬H(x)     (chặt, thắng ρ) — logic.defeat[] { if: [...], clear: x }
 *   Nghi(F) = { x : ∃ρ bắn cho x ∧ ¬∃δ bắn cho x },  luật bắn khi P ⊆ F.
 * Ba tính chất bắt buộc:
 *   (i)   Nghi(K) = {hung thủ}, và hung thủ ∉ Nghi(F) với mọi F ⊊ K
 *   (ii)  mọi F ⊊ K, F ≠ ∅: Nghi(F) ≠ ∅  (luôn có người vô tội bị chỉ nhầm)
 *   (iii) |{người chưa từng bị nghi ở mọi F ⊊ K}| ≥ 2  (chặn mẹo "ai chưa bị nghi")
 *
 * Lớp thời gian: lấy được x ở lượt t ⇔ t ∈ A(x) ∧ R(x) ⊆ H_t. Đếm số lịch thắng, độ dư,
 * lượt sớm nhất e(x) / muộn nhất l(x), bao đóng bắc cầu R*(x) và phủ định lan truyền.
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseId = process.argv[2];
if (!caseId || !/^[a-z0-9-]+$/.test(caseId)) {
  console.error('Cách dùng: node tools/check-logic.mjs <case-id>');
  process.exit(1);
}
const secret = JSON.parse(await readFile(path.join(ROOT, 'authoring', `${caseId}.secret.json`), 'utf8'));
const L = secret.logic;
if (!L) { console.error(`authoring/${caseId}.secret.json không có mục "logic"`); process.exit(1); }

const problems = [];
const short = (id) => id.replace(/^s-/, '');

// ===================== LỚP SUY DIỄN =====================
const K = L.keys;
const fires = (P, F) => P.every((p) => F.includes(p));
function nghi(F) {
  const pointed = new Set(L.point.filter((r) => fires(r.if, F)).flatMap((r) => r.then));
  const cleared = new Set(L.defeat.filter((r) => fires(r.if, F)).map((r) => r.clear));
  return { nghi: L.suspects.filter((x) => pointed.has(x) && !cleared.has(x)), cleared: L.suspects.filter((x) => cleared.has(x)) };
}
const subsets = [];
for (let mask = 1; mask < 1 << K.length; mask++) subsets.push(K.filter((_, i) => mask & (1 << i)));
subsets.sort((a, b) => a.length - b.length || a.join().localeCompare(b.join()));

console.log(`== Lớp suy diễn: ${caseId} — ${K.length} manh mối then chốt, ${subsets.length} tổ hợp ==`);
const everPointed = new Set();
for (const F of subsets) {
  const r = nghi(F);
  const full = F.length === K.length;
  if (!full) r.nghi.forEach((x) => everPointed.add(x));
  if (full && (r.nghi.length !== 1 || r.nghi[0] !== L.culprit)) problems.push(`(i) Nghi(K) = {${r.nghi.join(', ')}} thay vì {${L.culprit}}`);
  if (!full && r.nghi.includes(L.culprit)) problems.push(`(i) hung thủ đã lộ ở tổ hợp {${F.join('+')}}`);
  if (!full && r.nghi.length === 0) problems.push(`(ii) tổ hợp {${F.join('+')}} không chỉ vào ai`);
  const cleared = r.cleared.length ? `   bác: ${r.cleared.map(short).join(', ')}` : '';
  console.log(`  {${F.join('+')}}`.padEnd(18) + `→ Nghi = {${r.nghi.map(short).join(', ')}}${cleared}`);
}
const never = L.suspects.filter((x) => !everPointed.has(x));
if (never.length < 2) problems.push(`(iii) chỉ có ${never.length} người chưa từng bị nghi: {${never.join(', ')}}`);
const nonMono = subsets.some((F) => subsets.some((G) => G.length > F.length && fires(F, G)
  && nghi(F).nghi.some((x) => !nghi(G).nghi.includes(x))));
console.log(`  Chưa từng bị nghi ở tổ hợp thiếu: {${never.map(short).join(', ')}} · phi đơn điệu: ${nonMono ? 'có' : 'KHÔNG'}`);

// ===================== LỚP THỜI GIAN =====================
if (L.time) {
  const { turns: N, nodes } = L.time;
  const ids = Object.keys(nodes);
  for (const k of K) if (!nodes[k]) problems.push(`Lớp thời gian thiếu manh mối then chốt ${k}`);
  // Thứ tự topo + bao đóng bắc cầu R*(x) = R(x) ∪ ⋃ R*(r)
  const order = [];
  const visit = (x, stack = []) => {
    if (order.includes(x)) return;
    if (stack.includes(x)) { problems.push(`Chu trình tiên quyết: ${[...stack, x].join(' → ')}`); return; }
    for (const r of nodes[x].R) visit(r, [...stack, x]);
    order.push(x);
  };
  ids.forEach((x) => visit(x));
  const Rstar = {};
  for (const x of order) Rstar[x] = [...new Set(nodes[x].R.flatMap((r) => [r, ...Rstar[r]]))];

  let schedules = 0;
  (function dfs(i, used, when) {
    if (i === order.length) { schedules++; return; }
    const x = order[i];
    for (const t of nodes[x].A) {
      if (t > N || used.has(t) || nodes[x].R.some((r) => when[r] >= t)) continue;
      used.add(t); when[x] = t;
      dfs(i + 1, used, when);
      used.delete(t); delete when[x];
    }
  })(0, new Set(), {});

  const e = {}, l = {};
  for (const x of order) e[x] = Math.max(Math.min(...nodes[x].A), ...nodes[x].R.map((r) => e[r] + 1));
  for (const x of [...order].reverse()) {
    const kids = order.filter((y) => nodes[y].R.includes(x));
    l[x] = Math.min(Math.max(...nodes[x].A), ...kids.map((y) => l[y] - 1));
  }
  console.log(`\n== Lớp thời gian: N = ${N} lượt ==`);
  console.log(`  Số lịch thắng: ${schedules} · bắt buộc m = ${order.length} lượt · độ dư N − m = ${N - order.length}`);
  for (const x of order) {
    const lost = order.filter((y) => y !== x && Rstar[y].includes(x));
    console.log(`  ${x.padEnd(3)} e=${e[x]} l=${l[x]}  R*={${Rstar[x].join(', ')}}` + (lost.length ? `   ¬${x} ⇒ ${lost.map((y) => '¬' + y).join(' ∧ ')}` : ''));
    if (e[x] > l[x]) problems.push(`${x}: lượt sớm nhất ${e[x]} > muộn nhất ${l[x]} — không bao giờ lấy được`);
  }
  if (!schedules) problems.push('Không có lịch thắng nào');
}

if (problems.length) {
  console.error(`\n✗ ${problems.length} vấn đề:\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log('\n✓ Mô hình thỏa (i) hung thủ chỉ lộ khi đủ K · (ii) mọi tổ hợp thiếu đều chỉ nhầm · (iii) ≥ 2 người chưa từng bị nghi');
