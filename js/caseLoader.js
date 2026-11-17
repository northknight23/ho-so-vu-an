/**
 * Tải và kiểm tra file vụ án cases/<id>.json.
 *
 * validateCase() được dùng chung cho trình duyệt và tools/check-case.mjs,
 * nên chỉ dùng JS thuần, không đụng tới DOM hay fetch.
 */

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
    for (const part of ['culprit', 'motive', 'method']) {
      need(Array.isArray(c.hints?.[part]) && c.hints[part].length === c.hintCosts.length,
        `"hints.${part}" phải có ${c.hintCosts?.length} cấp — hãy chạy tools/encode-case.mjs`);
    }
  }

  // Câu hỏi & đáp án
  const q = c.questions || {};
  need(q.culprit, 'Thiếu "questions.culprit"');
  for (const part of ['motive', 'method']) {
    need(Array.isArray(q[part]?.options) && q[part].options.length > 1, `"questions.${part}.options" cần ít nhất 2 lựa chọn`);
  }
  need(c.scoring, 'Thiếu "scoring"');
  need(c.answer && c.answer.salt, 'Thiếu "answer" — hãy chạy: node tools/encode-case.mjs ' + (c.id || '<id>'));
  need(c.solution && c.solution.payload, 'Thiếu "solution" — hãy chạy tools/encode-case.mjs');

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
