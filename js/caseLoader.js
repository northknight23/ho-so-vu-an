/**
 * Tải và kiểm tra file vụ án cases/<id>.json.
 *
 * validateCase() được dùng chung cho trình duyệt và tools/check-case.mjs,
 * nên chỉ dùng JS thuần, không đụng tới DOM hay fetch.
 */
import { partsOf } from './answer.js';

/** Các kiểu tài liệu mà js/documents.js biết cách hiển thị. */
export const DOC_TYPES = ['text', 'chat', 'receipt', 'letter', 'newspaper', 'notice', 'table'];

/** Chỉ cho phép id an toàn (chữ thường, số, gạch ngang) để tránh tải file lạ. */
const SAFE_ID = /^[a-z0-9-]+$/;

export async function loadCase(caseId) {
  if (!SAFE_ID.test(caseId)) throw new Error(`Mã vụ án không hợp lệ: "${caseId}"`);
  const res = await fetch(`cases/${caseId}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`Không tải được cases/${caseId}.json (HTTP ${res.status})`);
  const data = await res.json();
  const errors = validateCase(data);
  if (errors.length) throw new Error('Dữ liệu vụ án có lỗi:\n- ' + errors.join('\n- '));
  return data;
}

/**
 * Danh sách vụ án hiển thị trên trang bìa (cases/index.json).
 * Thiếu file hoặc lỗi thì trả về mảng rỗng — game vẫn chạy với vụ án hiện tại.
 */
export async function loadLibrary() {
  try {
    const res = await fetch('cases/index.json', { cache: 'no-cache' });
    if (!res.ok) return [];
    const list = await res.json();
    return Array.isArray(list) ? list.filter((x) => x && SAFE_ID.test(x.id || '')) : [];
  } catch {
    return [];
  }
}

/**
 * Kiểm tra cấu trúc dữ liệu. Trả về mảng thông báo lỗi (rỗng = hợp lệ).
 * Không kiểm tra nội dung văn bản, chỉ kiểm tra những thứ làm game hỏng.
 */
export function validateCase(c) {
  const errors = [];
  const need = (cond, msg) => { if (!cond) errors.push(msg); };

  need(c && typeof c === 'object', 'File không phải object JSON');
  if (!c || typeof c !== 'object') return errors;

  for (const key of ['id', 'title', 'summary']) need(typeof c[key] === 'string' && c[key], `Thiếu trường "${key}"`);
  need(Array.isArray(c.briefing), 'Thiếu "briefing" (mảng đoạn văn)');
  need(c.victim && c.victim.name, 'Thiếu "victim.name"');

  // Nghi phạm
  need(Array.isArray(c.suspects) && c.suspects.length > 0, 'Thiếu danh sách "suspects"');
  const suspectIds = new Set();
  (c.suspects || []).forEach((s, i) => {
    need(s.id && !suspectIds.has(s.id), `suspects[${i}]: id trống hoặc trùng`);
    suspectIds.add(s.id);
    need(Array.isArray(s.statement), `suspects[${i}] (${s.id}): thiếu "statement"`);
  });

  // Manh mối
  need(Array.isArray(c.clues) && c.clues.length > 0, 'Thiếu danh sách "clues"');
  const clueIds = new Set();
  (c.clues || []).forEach((cl, i) => {
    need(cl.id && !clueIds.has(cl.id), `clues[${i}]: id trống hoặc trùng`);
    clueIds.add(cl.id);
    need(cl.detail && DOC_TYPES.includes(cl.detail.type),
      `clues[${i}] (${cl.id}): detail.type phải là một trong ${DOC_TYPES.join(', ')}`);
  });

  // Hiện trường: điểm bấm phải trỏ tới manh mối có thật
  (c.scene?.hotspots || []).forEach((h, i) => {
    need(typeof h.x === 'number' && typeof h.y === 'number', `scene.hotspots[${i}]: thiếu toạ độ x/y`);
    (h.clueIds || []).forEach((id) => need(clueIds.has(id), `scene.hotspots[${i}]: clueId "${id}" không tồn tại`));
  });

  // Thẩm vấn: nghi phạm có thật, id câu hỏi không trùng, điều kiện trỏ tới thứ có thật
  const topicIds = new Set();
  for (const [sid, inter] of Object.entries(c.interrogations || {})) {
    need(suspectIds.has(sid), `interrogations.${sid}: không có nghi phạm này`);
    need(Array.isArray(inter.topics), `interrogations.${sid}: thiếu "topics"`);
    (inter.topics || []).forEach((t, i) => {
      need(t.id && !topicIds.has(t.id), `interrogations.${sid}.topics[${i}]: id trống hoặc trùng`);
      topicIds.add(t.id);
      need(t.question && Array.isArray(t.answer), `interrogations.${sid}.topics[${i}] (${t.id}): cần "question" và "answer" (mảng)`);
    });
    need(Array.isArray(inter.contradictions), `interrogations.${sid}: thiếu "contradictions" — hãy chạy tools/encode-case.mjs`);
  }
  for (const [sid, inter] of Object.entries(c.interrogations || {})) {
    for (const t of inter.topics || []) {
      (t.requires?.topics || []).forEach((id) => need(topicIds.has(id), `${sid}/${t.id}: requires.topics "${id}" không tồn tại`));
      (t.requires?.clues || []).forEach((id) => need(clueIds.has(id), `${sid}/${t.id}: requires.clues "${id}" không tồn tại`));
    }
  }

  // Gợi ý: mỗi phần phải có đúng số cấp bằng số mức trừ điểm
  if (c.hintCosts) {
    need(Array.isArray(c.hintCosts) && c.hintCosts.every((x) => typeof x === 'number'), '"hintCosts" phải là mảng số');
    for (const part of partsOf(c)) {
      need(Array.isArray(c.hints?.[part]) && c.hints[part].length === c.hintCosts.length,
        `"hints.${part}" phải có ${c.hintCosts?.length} cấp — hãy chạy tools/encode-case.mjs`);
    }
  }

  // Chế độ có đồng hồ: đồng hồ, địa điểm, người, lịch có mặt, chủ đề hỏi
  if (c.mode === 'timed') errors.push(...validateTimed(c, suspectIds, need));

  // Câu hỏi & đáp án
  // Mỗi phần: hoặc chọn từ danh sách nghi phạm, hoặc có ít nhất 2 lựa chọn riêng
  const q = c.questions || {};
  need(c.parts === undefined || (Array.isArray(c.parts) && c.parts.length > 0), '"parts" phải là mảng id câu hỏi');
  for (const part of partsOf(c)) {
    need(q[part]?.prompt, `Thiếu "questions.${part}.prompt"`);
    need(q[part]?.optionsFrom === 'suspects' || (Array.isArray(q[part]?.options) && q[part].options.length > 1),
      `"questions.${part}" cần optionsFrom: "suspects" hoặc ít nhất 2 "options"`);
    need(typeof c.scoring?.[part] === 'number', `Thiếu điểm "scoring.${part}"`);
  }
  need(c.answer && c.answer.salt, 'Thiếu "answer" — hãy chạy: node tools/encode-case.mjs ' + (c.id || '<id>'));
  need(c.solution && c.solution.payload, 'Thiếu "solution" — hãy chạy tools/encode-case.mjs');

  return errors;
}

/** Kiểm tra dữ liệu công khai của chế độ có đồng hồ (mode "timed"). */
function validateTimed(c, suspectIds, need) {
  const errors = [];
  const req = (cond, msg) => { if (!cond) errors.push(msg); };
  const clock = c.clock || {};
  req(Number.isInteger(clock.days) && clock.days > 0, '"clock.days" phải là số nguyên dương');
  req(Array.isArray(clock.slots) && clock.slots.length > 0, '"clock.slots" phải là mảng tên buổi');
  const N = (clock.days || 0) * (clock.slots?.length || 0);

  const locIds = new Set();
  (c.locations || []).forEach((l, i) => {
    req(l.id && !locIds.has(l.id), `locations[${i}]: id trống hoặc trùng`);
    locIds.add(l.id);
    req(l.name, `locations[${i}] (${l.id}): thiếu "name"`);
  });
  req(locIds.size > 0, 'Thiếu "locations"');

  const personIds = new Set(suspectIds);
  (c.people || []).forEach((p, i) => {
    req(p.id && !personIds.has(p.id), `people[${i}]: id trống hoặc trùng với nghi phạm`);
    personIds.add(p.id);
    req(p.name, `people[${i}] (${p.id}): thiếu "name"`);
  });

  for (const [pid, plan] of Object.entries(c.schedule || {})) {
    req(personIds.has(pid), `schedule.${pid}: không có người này`);
    req(Array.isArray(plan) && plan.length === N, `schedule.${pid}: cần đúng ${N} ô (mỗi lượt một nơi hoặc null)`);
    (plan || []).forEach((l, t) => req(l === null || locIds.has(l), `schedule.${pid}[${t}]: nơi "${l}" không tồn tại`));
  }

  const leadIds = new Set();
  (c.leads || []).forEach((q, i) => {
    req(q.id && !leadIds.has(q.id), `leads[${i}]: id trống hoặc trùng`);
    leadIds.add(q.id);
    req(q.label, `leads[${i}] (${q.id}): thiếu "label"`);
  });
  req(leadIds.size > 0, 'Thiếu "leads"');
  req(Array.isArray(c.asks), 'Thiếu "asks" — hãy chạy tools/encode-case.mjs');
  (c.expiries || []).forEach((x, i) => req(Number.isInteger(x.after) && x.text, `expiries[${i}]: cần "after" (lượt) và "text"`));
  return errors;
}

/** Danh sách lựa chọn cho một phần câu hỏi (hung thủ lấy từ danh sách nghi phạm). */
export function optionsFor(caseData, part) {
  const q = caseData.questions[part];
  if (q.optionsFrom === 'suspects') {
    return caseData.suspects.map((s) => ({ id: s.id, label: s.name, portrait: s.portrait }));
  }
  return q.options;
}
