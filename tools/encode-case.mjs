#!/usr/bin/env node
/**
 * Tool soạn vụ án: mã hóa toàn bộ phần bí mật vào file vụ án.
 *
 *   node tools/encode-case.mjs case-01
 *
 * Đọc:  authoring/<id>.secret.json  (đáp án, mâu thuẫn, manh mối bị khóa, gợi ý, lời giải — KHÔNG deploy)
 *       cases/<id>.json             (nội dung công khai)
 * Ghi:  cases/<id>.json với các trường do máy sinh:
 *         answer                                   — hash SHA-256 của đáp án
 *         solution                                 — lời giải mã hóa (kèm manh mối bị khóa)
 *         interrogations[*].contradictions         — [{ hash, payload }]
 *         lockedClues                              — số manh mối bị khóa
 *         hints                                    — gợi ý mã hóa theo từng cấp
 *
 * Mỗi lần chạy sinh salt mới → mọi hash đổi, nhưng tiến trình người chơi vẫn dùng
 * được vì tiến trình lưu id (topic/clue) chứ không lưu hash.
 * Tool dùng lại đúng code của trình duyệt (js/answer.js) để hai bên luôn khớp nhau.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import {
  partsOf, hashChoice, encodeSolution, decodeSolution,
  contradictionHash, encodeContradiction, decodeContradiction, encodeHint, decodeHint,
  askHash, encodeAsk, decodeAsk,
} from '../js/answer.js';
import { validateSecret, contradictionPayload, solutionPayload, askPayload } from './case-secrets.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseId = process.argv[2];

if (!caseId || !/^[a-z0-9-]+$/.test(caseId)) {
  console.error('Cách dùng: node tools/encode-case.mjs <case-id>   (vd: case-01)');
  process.exit(1);
}

const casePath = path.join(ROOT, 'cases', `${caseId}.json`);
const secretPath = path.join(ROOT, 'authoring', `${caseId}.secret.json`);
const caseData = JSON.parse(await readFile(casePath, 'utf8'));
const secret = JSON.parse(await readFile(secretPath, 'utf8'));

const problems = validateSecret(caseData, secret);
if (problems.length) {
  console.error('Không mã hóa được vì:\n- ' + problems.join('\n- '));
  process.exit(1);
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (msg) => { console.error(`Lỗi tự kiểm tra: ${msg}`); process.exit(1); };
const salt = randomBytes(16).toString('hex');
const id = caseData.id;

// 1. Đáp án
caseData.answer = { algo: 'sha256', salt };
for (const part of partsOf(caseData)) caseData.answer[part] = hashChoice(salt, part, secret.answers[part]);

// 2. Lời giải
const sol = solutionPayload(secret);
caseData.solution = { encoding: 'xor-b64', payload: encodeSolution(id, salt, sol) };
if (!same(decodeSolution(id, salt, caseData.solution.payload), sol)) fail('lời giải');

// 3. Mâu thuẫn khi thẩm vấn (sắp theo hash để thứ tự không lộ thông tin)
for (const inter of Object.values(caseData.interrogations || {})) inter.contradictions = [];
for (const x of secret.contradictions || []) {
  const payloadObj = contradictionPayload(x, secret);
  const payload = encodeContradiction(id, salt, x.suspect, x.topic, x.clue, payloadObj);
  if (!same(decodeContradiction(id, salt, x.suspect, x.topic, x.clue, payload), payloadObj)) fail(`mâu thuẫn ${x.suspect}/${x.topic}/${x.clue}`);
  caseData.interrogations[x.suspect].contradictions.push({ hash: contradictionHash(salt, x.suspect, x.topic, x.clue), payload });
}
for (const inter of Object.values(caseData.interrogations || {})) inter.contradictions.sort((a, b) => a.hash.localeCompare(b.hash));
caseData.lockedClues = (secret.lockedClues || []).length;

// 3b. Chế độ có đồng hồ: câu hỏi (người, nơi, chủ đề) — khóa giải mã chính là bộ ba đó
if (caseData.mode === 'timed') {
  caseData.asks = (secret.asks || []).map((a) => {
    const obj = askPayload(a, secret);
    const payload = encodeAsk(id, salt, a.person, a.place, a.lead, obj);
    if (!same(decodeAsk(id, salt, a.person, a.place, a.lead, payload), obj)) fail(`câu hỏi ${a.person}@${a.place}/${a.lead}`);
    return { hash: askHash(salt, a.person, a.place, a.lead), payload };
  }).sort((x, y) => x.hash.localeCompare(y.hash));
}

// 4. Gợi ý
if ((caseData.hintCosts || []).length) {
  caseData.hints = {};
  for (const part of partsOf(caseData)) {
    caseData.hints[part] = secret.hints[part].map((text, level) => {
      const payload = encodeHint(id, salt, part, level, text);
      if (decodeHint(id, salt, part, level, payload) !== text) fail(`gợi ý ${part}/${level}`);
      return payload;
    });
  }
}

await writeFile(casePath, JSON.stringify(caseData, null, 2) + '\n', 'utf8');
console.log(`✓ Đã mã hóa ${caseId}: salt=${salt.slice(0, 8)}…, ${(secret.contradictions || []).length} mâu thuẫn, `
  + `${caseData.lockedClues} manh mối bị khóa, ${caseData.hints ? partsOf(caseData).length * caseData.hintCosts.length : 0} gợi ý.`);
