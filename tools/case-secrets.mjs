/**
 * Logic dùng chung cho tools/encode-case.mjs và tools/check-case.mjs:
 * kiểm tra file bí mật và dựng các payload (trước khi mã hóa).
 *
 * File bí mật authoring/<id>.secret.json gồm:
 *   answers         { <phần>: id lựa chọn đúng } — các phần theo partsOf(caseData)
 *   contradictions  [{ suspect, topic, clue, group?, response[], unlocks: { topics[], clues["@id"], statement[] } }]
 *   lockedClues     [manh mối đầy đủ + trường "no"] — chỉ lộ ra khi được mở khóa
 *   hints           { <phần>: [cấp1, cấp2, cấp3], ... }
 *   solution        { headline, overview, parts, chain, redHerrings, closing }
 */
import { partsOf } from '../js/answer.js';
import { optionsFor } from '../js/caseLoader.js';

/** Trả về danh sách lỗi (rỗng = hợp lệ). */
export function validateSecret(caseData, secret) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };

  // Đáp án trỏ tới lựa chọn có thật
  for (const part of partsOf(caseData)) {
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
  // Chế độ có đồng hồ: câu hỏi (người, nơi, chủ đề) mở manh mối bị khóa
  if (caseData.mode === 'timed') problems.push(...validateTimedSecret(caseData, secret, allClueIds, lockedIds, unlockedLocked));

  for (const id of lockedIds) need(unlockedLocked.has(id), `lockedClues "${id}" không được mâu thuẫn hay câu hỏi nào mở khóa`);

  // Gợi ý
  const costs = caseData.hintCosts || [];
  if (costs.length) {
    for (const part of partsOf(caseData)) {
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

/** Kiểm tra phần bí mật của chế độ có đồng hồ. Ghi id manh mối được mở vào unlockedLocked. */
function validateTimedSecret(caseData, secret, allClueIds, lockedIds, unlockedLocked) {
  const problems = [];
  const need = (cond, msg) => { if (!cond) problems.push(msg); };
  const N = caseData.clock.days * caseData.clock.slots.length;
  const people = new Set([...caseData.suspects.map((s) => s.id), ...(caseData.people || []).map((p) => p.id)]);
  const places = new Set(caseData.locations.map((l) => l.id));
  const leads = new Map(caseData.leads.map((q) => [q.id, q]));
  const nodes = secret.logic?.time?.nodes || {};
  const seen = new Set();

  for (const a of secret.asks || []) {
    const tag = `${a.person}@${a.place}/${a.lead}`;
    need(people.has(a.person), `asks ${tag}: không có người "${a.person}"`);
    need(places.has(a.place), `asks ${tag}: không có nơi "${a.place}"`);
    need(leads.has(a.lead), `asks ${tag}: không có chủ đề "${a.lead}"`);
    need(!seen.has(tag), `asks ${tag}: khai báo hai lần`);
    seen.add(tag);
    need(Array.isArray(a.window) && a.window.length && a.window.every((t) => Number.isInteger(t) && t >= 1 && t <= N),
      `asks ${tag}: "window" phải là các lượt trong 1..${N}`);
    need(Array.isArray(a.answer) && a.answer.length, `asks ${tag}: thiếu "answer"`);
    // Người phải thực sự có mặt ở nơi đó trong mọi lượt của cửa sổ: A(x) = { t ∈ W(x) : σ(p,t) = l }
    for (const t of a.window || []) {
      need(caseData.schedule?.[a.person]?.[t - 1] === a.place, `asks ${tag}: lượt ${t} người này không có mặt ở "${a.place}" theo lịch`);
    }
    if (a.clue) {
      const id = String(a.clue).replace(/^@/, '');
      need(lockedIds.has(id), `asks ${tag}: clue "${a.clue}" không có trong lockedClues`);
      unlockedLocked.add(id);
      // Đối chiếu với mô hình logic: cửa sổ = A(x), tiên quyết của chủ đề = R(x)
      if (nodes[id]) {
        need(JSON.stringify([...a.window].sort((x, y) => x - y)) === JSON.stringify([...nodes[id].A].sort((x, y) => x - y)),
          `asks ${tag}: window [${a.window}] khác A(${id}) = [${nodes[id].A}] trong logic.time`);
        const R = [...(leads.get(a.lead)?.requires?.clues || [])].sort();
        need(JSON.stringify(R) === JSON.stringify([...nodes[id].R].sort()),
          `asks ${tag}: requires của chủ đề [${R}] khác R(${id}) = [${nodes[id].R}]`);
      }
    }
  }
  for (const q of leads.values()) {
    for (const id of q.requires?.clues || []) need(allClueIds.has(id), `leads ${q.id}: requires.clues "${id}" không tồn tại`);
  }

  const acc = secret.accusation || {};
  const suspects = caseData.suspects.map((s) => s.id);
  need(suspects.includes(acc.culprit), `accusation.culprit "${acc.culprit}" không phải nghi phạm`);
  need(Array.isArray(acc.keys) && acc.keys.every((k) => allClueIds.has(k)), 'accusation.keys phải là các manh mối có thật');
  for (const s of suspects.filter((x) => x !== acc.culprit)) {
    const opts = acc.proofs?.[s];
    need(Array.isArray(opts) && opts.length, `accusation.proofs.${s}: thiếu cách minh oan`);
    for (const P of opts || []) for (const id of P) need(allClueIds.has(id), `accusation.proofs.${s}: manh mối "${id}" không tồn tại`);
  }
  const E = acc.endings || {};
  for (const k of ['good', 'unproven', 'timeout']) need(E[k]?.title, `accusation.endings.${k} thiếu`);
  for (const s of suspects.filter((x) => x !== acc.culprit)) need(E.wrong?.[s]?.title, `accusation.endings.wrong.${s} thiếu`);
  for (const k of acc.keys || []) need(E.missing?.[k]?.title, `accusation.endings.missing.${k} thiếu`);
  return problems;
}

/** Payload (chưa mã hóa) của một câu hỏi có kết quả: thay "@id" bằng manh mối đầy đủ. */
export function askPayload(entry, secret) {
  const locked = new Map((secret.lockedClues || []).map((c) => [c.id, c]));
  return {
    window: entry.window,
    answer: entry.answer,
    late: entry.late || null,
    early: entry.early || null,
    clue: entry.clue ? locked.get(String(entry.clue).replace(/^@/, '')) : null,
  };
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
  const out = { answers: secret.answers || {}, ...secret.solution, lockedClues: secret.lockedClues || [] };
  if (secret.accusation) out.timed = secret.accusation; // chế độ có đồng hồ: dữ liệu chấm buộc tội + kết cục
  return out;
}
