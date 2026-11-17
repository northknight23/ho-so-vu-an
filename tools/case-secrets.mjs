/**
 * Logic dùng chung cho tools/encode-case.mjs và tools/check-case.mjs:
 * kiểm tra file bí mật và dựng các payload (trước khi mã hóa).
 *
 * File bí mật authoring/<id>.secret.json gồm:
 *   answers         { culprit, motive, method }
 *   contradictions  [{ suspect, topic, clue, group?, response[], unlocks: { topics[], clues["@id"], statement[] } }]
 *   lockedClues     [manh mối đầy đủ + trường "no"] — chỉ lộ ra khi được mở khóa
 *   hints           { culprit: [cấp1, cấp2, cấp3], motive: [...], method: [...] }
 *   solution        { headline, overview, parts, chain, redHerrings, closing }
 */
import { PARTS } from '../js/answer.js';
import { optionsFor } from '../js/caseLoader.js';

/** Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateSecret(caseData, secret) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };

  // Đáp án trỏ tới lựa chọn có thật
  for (const part of PARTS) {
    const id = secret.answers?.[part];
    const ids = optionsFor(caseData, part).map((o) => o.id);
    need(ids.includes(id), `answers.${part} = "${id}" không có trong lựa chọn: ${ids.join(', ')}`);
  }

  // Manh mối bị khóa: id/số thứ tự không trùng với manh mối công khai
  const baseIds = new Set(caseData.clues.map((c) => c.id));
  const usedNos = new Set(caseData.clues.map((c, i) => c.no ?? i + 1));
  const locked = secret.lockedClues || [];
  for (const cl of locked) {
    need(cl.id && !baseIds.has(cl.id), `lockedClues: id "${cl.id}" trống hoặc trùng manh mối công khai`);
    need(Number.isInteger(cl.no) && !usedNos.has(cl.no), `lockedClues ${cl.id}: "no" phải là số nguyên chưa dùng`);
    usedNos.add(cl.no);
    need(cl.detail?.type, `lockedClues ${cl.id}: thiếu detail.type`);
  }
  const allClueIds = new Set([...baseIds, ...locked.map((c) => c.id)]);
  const lockedIds = new Set(locked.map((c) => c.id));

  // Mâu thuẫn
  const inter = caseData.interrogations || {};
  const baseTopicIds = new Set(Object.values(inter).flatMap((x) => (x.topics || []).map((t) => t.id)));
  const topicsOf = (sid) => {
    const ids = new Set((inter[sid]?.topics || []).map((t) => t.id));
    for (const x of secret.contradictions || []) {
      if (x.suspect === sid) (x.unlocks?.topics || []).forEach((t) => ids.add(t.id));
    }
    return ids;
  };
  const seenTriples = new Set();
  const unlockedLocked = new Set();
  for (const x of secret.contradictions || []) {
    const tag = `${x.suspect}/${x.topic}/${x.clue}`;
    need(inter[x.suspect], `Mâu thuẫn ${tag}: nghi phạm chưa có mục interrogations`);
    need(topicsOf(x.suspect).has(x.topic), `Mâu thuẫn ${tag}: câu hỏi "${x.topic}" không tồn tại`);
    need(allClueIds.has(x.clue), `Mâu thuẫn ${tag}: manh mối "${x.clue}" không tồn tại`);
    need(!seenTriples.has(tag), `Mâu thuẫn ${tag} bị khai báo hai lần`);
    seenTriples.add(tag);
    need(Array.isArray(x.response) && x.response.length, `Mâu thuẫn ${tag}: thiếu "response"`);
    for (const t of x.unlocks?.topics || []) {
      need(t.id && !baseTopicIds.has(t.id), `Mâu thuẫn ${tag}: câu hỏi mở khóa "${t.id}" trùng câu hỏi công khai`);
      need(t.question && Array.isArray(t.answer), `Mâu thuẫn ${tag}: câu hỏi mở khóa "${t.id}" cần question + answer[]`);
    }
    for (const ref of x.unlocks?.clues || []) {
      const id = String(ref).replace(/^@/, '');
      need(lockedIds.has(id), `Mâu thuẫn ${tag}: unlocks.clues "${ref}" không có trong lockedClues`);
      unlockedLocked.add(id);
    }
  }
  for (const id of lockedIds) need(unlockedLocked.has(id), `lockedClues "${id}" không được mâu thuẫn nào mở khóa`);

  // Gợi ý
  const costs = caseData.hintCosts || [];
  if (costs.length) {
    for (const part of PARTS) {
      need(Array.isArray(secret.hints?.[part]) && secret.hints[part].length === costs.length,
        `hints.${part} phải có đúng ${costs.length} cấp (bằng số phần tử hintCosts)`);
    }
  }

  // Lời giải trỏ tới manh mối có thật (kể cả manh mối bị khóa)
  const sol = secret.solution || {};
  for (const item of [...(sol.chain || []), ...(sol.redHerrings || [])]) {
    for (const id of item.clueIds || []) need(allClueIds.has(id), `Lời giải "${item.title}" trỏ tới manh mối không tồn tại: ${id}`);
  }
  return problems;
}

/** Payload (chưa mã hóa) của một mâu thuẫn: thay "@id" bằng manh mối đầy đủ. */
export function contradictionPayload(entry, secret) {
  const lockedMap = new Map((secret.lockedClues || []).map((c) => [c.id, c]));
  const un = entry.unlocks || {};
  return {
    group: entry.group || null,
    response: entry.response,
    unlocks: {
      topics: un.topics || [],
      clues: (un.clues || []).map((ref) => lockedMap.get(String(ref).replace(/^@/, ''))),
      statement: un.statement || [],
    },
  };
}

/** Payload (chưa mã hóa) của lời giải: kèm đáp án và các manh mối bị khóa. */
export function solutionPayload(secret) {
  return { answers: secret.answers, ...secret.solution, lockedClues: secret.lockedClues || [] };
}
