#!/usr/bin/env node
/**
 * Kiểm tra một file vụ án trước khi chơi:
 *   node tools/check-case.mjs case-01
 *
 * - Cấu trúc JSON hợp lệ (dùng chung validateCase với trình duyệt)
 * - Mọi file ảnh (chân dung, icon, sơ đồ — kể cả của manh mối bị khóa) đều tồn tại
 * - Nếu có file bí mật: mọi phần mã hóa (đáp án, lời giải, mâu thuẫn, gợi ý) khớp với
 *   file bí mật — tức là đã chạy encode-case.mjs sau lần sửa cuối.
 */
import { readFile, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { validateCase } from '../js/caseLoader.js';
import { partsOf, hashChoice, decodeSolution, contradictionHash, decodeContradiction, decodeHint } from '../js/answer.js';
import { validateSecret, contradictionPayload, solutionPayload, askPayload } from './case-secrets.mjs';
import { askHash, decodeAsk } from '../js/answer.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseId = process.argv[2] || 'case-01';
const caseData = JSON.parse(await readFile(path.join(ROOT, 'cases', `${caseId}.json`), 'utf8'));
const errors = validateCase(caseData);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const STALE = ' — hãy chạy lại encode-case.mjs';

let secret = null;
try {
  secret = JSON.parse(await readFile(path.join(ROOT, 'authoring', `${caseId}.secret.json`), 'utf8'));
} catch (e) {
  if (e.code !== 'ENOENT') errors.push(`Lỗi đọc file bí mật: ${e.message}`);
}

// Ảnh
const assets = [
  caseData.victim?.portrait,
  caseData.scene?.map,
  ...caseData.suspects.map((s) => s.portrait),
  ...caseData.clues.map((c) => c.icon),
  ...(secret?.lockedClues || []).map((c) => c.icon),
].filter(Boolean);
for (const a of new Set(assets)) {
  try { await access(path.join(ROOT, a)); } catch { errors.push(`Thiếu file ảnh: ${a}`); }
}

// Đối chiếu phần mã hóa với file bí mật
if (secret && caseData.answer?.salt) {
  const { id } = caseData;
  const { salt } = caseData.answer;
  errors.push(...validateSecret(caseData, secret));

  for (const part of partsOf(caseData)) {
    if (hashChoice(salt, part, secret.answers[part]) !== caseData.answer[part]) errors.push(`Hash đáp án "${part}" không khớp${STALE}`);
  }
  try {
    if (!same(decodeSolution(id, salt, caseData.solution.payload), solutionPayload(secret))) errors.push(`Lời giải đã mã hóa khác file bí mật${STALE}`);
  } catch { errors.push(`Không giải mã được lời giải${STALE}`); }

  if (caseData.mode === 'timed') {
    for (const a of secret.asks || []) {
      const tag = `${a.person}@${a.place}/${a.lead}`;
      const found = (caseData.asks || []).find((x) => x.hash === askHash(salt, a.person, a.place, a.lead));
      if (!found) { errors.push(`Thiếu câu hỏi ${tag}${STALE}`); continue; }
      try {
        if (!same(decodeAsk(id, salt, a.person, a.place, a.lead, found.payload), askPayload(a, secret))) errors.push(`Câu hỏi ${tag} khác file bí mật${STALE}`);
      } catch { errors.push(`Không giải mã được câu hỏi ${tag}${STALE}`); }
    }
    if ((caseData.asks || []).length !== (secret.asks || []).length) errors.push(`Số câu hỏi trong vụ án khác file bí mật${STALE}`);
  }

  let total = 0;
  for (const x of secret.contradictions || []) {
    const hash = contradictionHash(salt, x.suspect, x.topic, x.clue);
    const found = caseData.interrogations?.[x.suspect]?.contradictions?.find((c) => c.hash === hash);
    const tag = `${x.suspect}/${x.topic}/${x.clue}`;
    if (!found) { errors.push(`Thiếu mâu thuẫn ${tag}${STALE}`); continue; }
    try {
      if (!same(decodeContradiction(id, salt, x.suspect, x.topic, x.clue, found.payload), contradictionPayload(x, secret))) errors.push(`Mâu thuẫn ${tag} khác file bí mật${STALE}`);
    } catch { errors.push(`Không giải mã được mâu thuẫn ${tag}${STALE}`); }
    total++;
  }
  const published = Object.values(caseData.interrogations || {}).reduce((s, x) => s + (x.contradictions?.length || 0), 0);
  if (published !== total) errors.push(`Số mâu thuẫn trong vụ án (${published}) khác file bí mật (${total})${STALE}`);

  for (const part of partsOf(caseData)) {
    (secret.hints?.[part] || []).forEach((text, level) => {
      try {
        if (decodeHint(id, salt, part, level, caseData.hints[part][level]) !== text) errors.push(`Gợi ý ${part}/${level + 1} khác file bí mật${STALE}`);
      } catch { errors.push(`Không giải mã được gợi ý ${part}/${level + 1}${STALE}`); }
    });
  }
}

if (errors.length) {
  console.error(`✗ ${caseId} có ${errors.length} lỗi:\n- ` + errors.join('\n- '));
  process.exit(1);
}
const topics = Object.values(caseData.interrogations || {}).reduce((s, x) => s + x.topics.length, 0);
console.log(`✓ ${caseId} hợp lệ: ${caseData.suspects.length} nghi phạm, ${caseData.clues.length} manh mối `
  + `(+${caseData.lockedClues || 0} bị khóa), ${caseData.scene?.hotspots?.length || 0} điểm hiện trường, `
  + (caseData.mode === 'timed' ? `${caseData.locations.length} địa điểm, ${(caseData.asks || []).length} câu hỏi có kết quả, ` : '')
  + `${topics} câu hỏi thẩm vấn, ${caseData.hints ? 'có' : 'không có'} gợi ý.`);
