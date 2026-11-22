/**
 * Chấm điểm & mã hóa nội dung bí mật (lời giải, mâu thuẫn khi thẩm vấn, gợi ý).
 *
 * Module này KHÔNG đụng tới DOM để dùng chung được cho cả trình duyệt
 * lẫn script Node (tools/encode-case.mjs, tools/check-case.mjs).
 *
 * - Đáp án: sha256(salt:phần:optionId). Khi chấm, ta băm lựa chọn của người chơi rồi so khớp.
 * - Lời giải / gợi ý / mâu thuẫn: XOR với dòng khóa sinh từ sha256(seed|i), rồi base64.
 *   + Lời giải:   seed = caseId|salt                      (giải mã sau khi nộp bài)
 *   + Gợi ý:      seed = caseId|salt|hint|phần|cấp         (giải mã khi người chơi mở gợi ý)
 *   + Mâu thuẫn:  seed = caseId|salt|x|suspect|topic|clue  (chỉ giải mã được khi trình
 *                 ĐÚNG cặp câu trả lời + manh mối — vì bộ ba này chính là khóa)
 *
 * Lưu ý: đây là "chống nhìn trộm", không phải bảo mật thật — người đọc code
 * vẫn có thể thử hết các tổ hợp. Muốn bảo mật thật phải xử lý ở server.
 */
import { sha256Hex, sha256Bytes } from './sha256.js';

/** Các phần mặc định của bài nộp (vụ án không khai báo "parts" sẽ dùng bộ này). */
export const PARTS = ['culprit', 'motive', 'method'];

/**
 * Danh sách phần câu hỏi của một vụ án, theo đúng thứ tự hiển thị.
 * Vụ án có thể tự khai báo "parts": ["mastermind", "target", ...]; mỗi id phải có
 * mục tương ứng trong "questions" và "scoring".
 */
export function partsOf(caseData) {
  if (caseData?.mode === 'timed') return []; // chấm bằng buộc tội kèm chứng minh (js/accuse.js)
  return Array.isArray(caseData?.parts) && caseData.parts.length ? caseData.parts : PARTS;
}

/** Băm một lựa chọn cho một phần câu hỏi. */
export function hashChoice(salt, part, optionId) {
  return sha256Hex(`${salt}:${part}:${optionId}`);
}

/** Tổng điểm bị trừ khi đã mở `used` gợi ý của một phần (trừ cộng dồn theo từng cấp). */
export function hintPenalty(costs, used) {
  return (costs || []).slice(0, used || 0).reduce((sum, v) => sum + v, 0);
}

/**
 * Chấm bài.
 * @param {object} caseData  dữ liệu vụ án (cần .answer, .scoring, .hintCosts)
 * @param {Object<string,string>} submission  lựa chọn của người chơi theo từng phần
 * @param {Object<string,number>} hintsUsed   số gợi ý đã mở mỗi phần
 * @returns {{score, max, parts: Object<string,{correct, points, max, penalty}>}}
 *
 * Điểm trừ do gợi ý chỉ áp lên phần tương ứng và không làm điểm phần đó xuống dưới 0.
 */
export function gradeSubmission(caseData, submission, hintsUsed = {}) {
  const { answer, scoring } = caseData;
  const parts = {};
  let score = 0;
  let max = 0;
  for (const part of partsOf(caseData)) {
    const partMax = scoring[part] ?? 0;
    const correct = hashChoice(answer.salt, part, submission[part]) === answer[part];
    const penalty = hintPenalty(caseData.hintCosts, hintsUsed[part]);
    const points = correct ? Math.max(0, partMax - penalty) : 0;
    parts[part] = { correct, points, max: partMax, penalty };
    score += points;
    max += partMax;
  }
  return { score, max, parts };
}

/** Chọn danh hiệu theo % điểm, dựa trên bảng ranks trong JSON. */
export function rankFor(ranks, score, max) {
  const pct = max ? (score / max) * 100 : 0;
  const sorted = [...(ranks || [])].sort((a, b) => b.min - a.min);
  return sorted.find((r) => pct >= r.min) || { min: 0, title: '' };
}

// ---------- Mã hóa XOR + base64 dùng chung ----------

/** Sinh dòng khóa đủ dài bằng cách nối các khối sha256(seed|i). */
function keystream(seed, length) {
  const out = new Uint8Array(length);
  const enc = new TextEncoder();
  for (let block = 0, pos = 0; pos < length; block++) {
    const chunk = sha256Bytes(enc.encode(`${seed}|${block}`));
    for (let i = 0; i < chunk.length && pos < length; i++, pos++) out[pos] = chunk[i];
  }
  return out;
}

function bytesToBase64(bytes) {
  let bin = '';
  const STEP = 0x8000; // chia nhỏ để tránh tràn ngăn xếp với chuỗi dài
  for (let i = 0; i < bytes.length; i += STEP) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
  }
  return btoa(bin);
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function xorEncode(seed, obj) {
  const plain = new TextEncoder().encode(JSON.stringify(obj));
  const key = keystream(seed, plain.length);
  for (let i = 0; i < plain.length; i++) plain[i] ^= key[i];
  return bytesToBase64(plain);
}

function xorDecode(seed, payload) {
  const data = base64ToBytes(payload);
  const key = keystream(seed, data.length);
  for (let i = 0; i < data.length; i++) data[i] ^= key[i];
  return JSON.parse(new TextDecoder().decode(data));
}

// ---------- Lời giải ----------
export const encodeSolution = (caseId, salt, obj) => xorEncode(`${caseId}|${salt}`, obj);
export const decodeSolution = (caseId, salt, payload) => xorDecode(`${caseId}|${salt}`, payload);

// ---------- Mâu thuẫn khi thẩm vấn ----------
/** Mã nhận diện công khai của một mâu thuẫn (để so khớp, không đủ để giải mã). */
export function contradictionHash(salt, suspect, topic, clue) {
  return sha256Hex(`${salt}:x:${suspect}:${topic}:${clue}`);
}
const xSeed = (caseId, salt, s, t, c) => `${caseId}|${salt}|x|${s}|${t}|${c}`;
export const encodeContradiction = (caseId, salt, s, t, c, obj) => xorEncode(xSeed(caseId, salt, s, t, c), obj);
export const decodeContradiction = (caseId, salt, s, t, c, payload) => xorDecode(xSeed(caseId, salt, s, t, c), payload);

// ---------- Gợi ý ----------
const hSeed = (caseId, salt, part, level) => `${caseId}|${salt}|hint|${part}|${level}`;
export const encodeHint = (caseId, salt, part, level, text) => xorEncode(hSeed(caseId, salt, part, level), text);
export const decodeHint = (caseId, salt, part, level, payload) => xorDecode(hSeed(caseId, salt, part, level), payload);

// ---------- Chế độ có đồng hồ (mode "timed"): hỏi đúng người, đúng nơi, đúng chủ đề ----------
/** Mã nhận diện công khai của một câu hỏi có kết quả. Khóa giải mã chính là bộ ba (người, nơi, chủ đề). */
export function askHash(salt, person, place, lead) {
  return sha256Hex(`${salt}:ask:${person}:${place}:${lead}`);
}
const aSeed = (caseId, salt, p, l, q) => `${caseId}|${salt}|ask|${p}|${l}|${q}`;
export const encodeAsk = (caseId, salt, p, l, q, obj) => xorEncode(aSeed(caseId, salt, p, l, q), obj);
export const decodeAsk = (caseId, salt, p, l, q, payload) => xorDecode(aSeed(caseId, salt, p, l, q), payload);
