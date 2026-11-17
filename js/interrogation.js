/**
 * Chế độ thẩm vấn.
 *
 * Dữ liệu công khai (caseData.interrogations[suspectId]):
 *   intro[]            — mô tả khi bắt đầu thẩm vấn
 *   topics[]           — { id, question, answer[], requires?: { topics[], clues[] } }
 *   fallback[]         — câu đáp khi trình bằng chứng không liên quan
 *   contradictions[]   — { hash, payload } do tools/encode-case.mjs sinh ra
 *
 * Trình bằng chứng = chọn một câu trả lời (topic) + một manh mối (clue).
 * Nếu sha256(salt:x:suspect:topic:clue) khớp một hash → giải mã payload bằng
 * chính bộ ba đó → { response[], unlocks: { topics[], clues[], statement[] } }.
 *
 * Tiến trình chỉ lưu nhật ký (log) các lượt hỏi/trình; mọi thứ "đã mở khóa"
 * được tính lại từ log mỗi lần tải trang (computeUnlocks), nên nội dung bí mật
 * không bao giờ nằm dạng chữ trong localStorage.
 */
import { el, para } from './dom.js';
import { openModal, closeModal } from './modal.js';
import { contradictionHash, decodeContradiction } from './answer.js';
import { allClues, findClue, clueNo } from './selectors.js';
import { clueLink } from './ui.js';

// Bộ nhớ đệm các payload đã giải mã: "suspect|topic|clue" → object
const decoded = new Map();

/** Thử giải mã một lượt trình bằng chứng. Trả về null nếu không khớp mâu thuẫn nào. */
export function decodePresent(app, sid, tid, cid) {
  const key = `${sid}|${tid}|${cid}`;
  if (decoded.has(key)) return decoded.get(key);
  const { caseData: c } = app;
  const inter = c.interrogations?.[sid];
  if (!inter) return null;
  const hash = contradictionHash(c.answer.salt, sid, tid, cid);
  const match = (inter.contradictions || []).find((x) => x.hash === hash);
  if (!match) return null;
  try {
    const data = { hash, ...decodeContradiction(c.id, c.answer.salt, sid, tid, cid, match.payload) };
    decoded.set(key, data);
    return data;
  } catch {
    return null;
  }
}

/** Tính lại mọi thứ đã mở khóa từ nhật ký thẩm vấn → app.unlocked. */
export function computeUnlocks(app) {
  const { caseData: c, progress: p } = app;
  // solved: hash các cặp đã trình đúng (chống trình lặp)
  // groups: nhóm mâu thuẫn đã vạch — nhiều manh mối khác nhau có thể cùng vạch một mâu thuẫn
  const u = { topics: {}, clues: [], statements: {}, solved: {}, groups: {} };
  const clueIds = new Set();
  for (const sid of Object.keys(c.interrogations || {})) {
    u.topics[sid] = [];
    u.statements[sid] = [];
    u.solved[sid] = new Set();
    u.groups[sid] = new Set();
    for (const ev of p.interrogation[sid]?.log || []) {
      if (ev.k !== 'present' || !ev.ok || ev.dup) continue;
      const data = decodePresent(app, sid, ev.t, ev.c);
      if (!data || u.solved[sid].has(data.hash)) continue;
      u.solved[sid].add(data.hash);
      u.groups[sid].add(data.group || data.hash);
      const un = data.unlocks || {};
      for (const t of un.topics || []) {
        if (!u.topics[sid].some((x) => x.id === t.id)) u.topics[sid].push(t);
      }
      for (const cl of un.clues || []) {
        if (!clueIds.has(cl.id)) { clueIds.add(cl.id); u.clues.push(cl); }
      }
      for (const line of un.statement || []) {
        if (!u.statements[sid].includes(line)) u.statements[sid].push(line);
      }
    }
  }
  app.unlocked = u;
}

/** Tìm một câu hỏi (cả câu công khai lẫn câu đã mở khóa). */
export function findTopic(app, sid, tid) {
  const base = app.caseData.interrogations?.[sid]?.topics || [];
  return base.find((t) => t.id === tid) || app.unlocked?.topics[sid]?.find((t) => t.id === tid) || null;
}

const askedSet = (app, sid) => new Set((app.progress.interrogation[sid]?.log || []).filter((e) => e.k === 'ask').map((e) => e.t));

/** Các câu hỏi người chơi đang được hỏi (đủ điều kiện, chưa hỏi). */
function availableTopics(app, sid) {
  const inter = app.caseData.interrogations[sid];
  const asked = askedSet(app, sid);
  const viewed = new Set(app.progress.viewedClues);
  const ok = (t) => (t.requires?.topics || []).every((id) => asked.has(id))
    && (t.requires?.clues || []).every((id) => viewed.has(id));
  const list = [...inter.topics.filter(ok), ...(app.unlocked.topics[sid] || [])];
  return list.filter((t) => !asked.has(t.id));
}

/** Số mâu thuẫn đã vạch ra với một nghi phạm. */
export const solvedCount = (app, sid) => app.unlocked?.groups[sid]?.size || 0;

// ======================================================================
// Giao diện
// ======================================================================

/** Khung chat: câu của điều tra viên (phải) hoặc nghi phạm (trái). */
function bubble(side, paragraphs, extra = {}) {
  const texts = Array.isArray(paragraphs) ? paragraphs : [paragraphs];
  return el('div', { class: `talk talk--${side}${extra.cls ? ` ${extra.cls}` : ''}` },
    extra.who && el('div', { class: 'talk__who', text: extra.who }),
    texts.map((t) => para(t)),
    extra.after || null);
}

const sysLine = (...children) => el('div', { class: 'talk-sys' }, children);

export function renderInterrogation(app, sid, actions) {
  const { caseData: c } = app;
  const s = c.suspects.find((x) => x.id === sid);
  const inter = c.interrogations?.[sid];
  if (!s || !inter) return [el('p', { text: 'Không có dữ liệu thẩm vấn cho nghi phạm này.' })];

  const log = app.progress.interrogation[sid]?.log || [];
  const shortName = s.nickname || s.name;
  let failCount = 0;

  // Dựng lại biên bản từ nhật ký
  const transcript = el('div', { class: 'transcript', 'aria-live': 'polite' },
    el('div', { class: 'talk-intro' }, (inter.intro || []).map((t) => para(t))));

  for (const ev of log) {
    const topic = findTopic(app, sid, ev.t);
    if (!topic) continue;
    if (ev.k === 'ask') {
      transcript.append(
        bubble('me', topic.question, { who: 'Điều tra viên' }),
        bubble('them', topic.answer, {
          who: shortName,
          after: el('button', {
            type: 'button',
            class: 'talk__object',
            onClick: () => openEvidencePicker(app, sid, topic, actions),
          }, '⚡ Phản bác'),
        }));
      continue;
    }
    // Lượt trình bằng chứng
    const clue = findClue(app, ev.c);
    transcript.append(bubble('me', [`Còn cái này thì sao? (về câu: “${topic.question}”)`], {
      who: 'Điều tra viên',
      cls: 'talk--evidence',
      after: clue ? clueLink(app, clue.id, actions) : null,
    }));
    if (!ev.ok) {
      const lines = inter.fallback?.length ? inter.fallback : ['…'];
      transcript.append(bubble('them', lines[failCount++ % lines.length], { who: shortName, cls: 'talk--flat' }));
      continue;
    }
    if (ev.dup) {
      transcript.append(sysLine('Mâu thuẫn này đã được vạch ra trước đó.'));
      continue;
    }
    const data = decodePresent(app, sid, ev.t, ev.c);
    if (!data) continue;
    transcript.append(
      sysLine(el('strong', { text: '⚡ Mâu thuẫn!' })),
      bubble('them', data.response || [], { who: shortName, cls: 'talk--break' }));
    const un = data.unlocks || {};
    for (const t of un.topics || []) transcript.append(sysLine(`🔓 Câu hỏi mới: “${t.question}”`));
    for (const cl of un.clues || []) transcript.append(sysLine('🔓 Manh mối mới: ', clueLink(app, cl.id, actions)));
    if ((un.statement || []).length) transcript.append(sysLine('🔓 Lời khai bổ sung đã được ghi vào hồ sơ nghi phạm.'));
  }

  const topics = availableTopics(app, sid);
  const solved = solvedCount(app, sid);

  // Cuộn biên bản xuống cuối sau khi gắn vào trang
  requestAnimationFrame(() => { transcript.scrollTop = transcript.scrollHeight; });

  return [
    el('button', { type: 'button', class: 'back-link', onClick: () => actions.go('#/case/suspects') }, '← Danh sách nghi phạm'),
    el('div', { class: 'interro' },
      el('aside', { class: 'paper-card interro__who' },
        el('img', { class: 'interro__photo', src: s.portrait, alt: `Chân dung ${s.name}` }),
        el('div', {},
          el('h2', { class: 'interro__name', text: s.name }),
          el('div', { class: 'interro__meta', text: s.relation }),
          el('div', { class: 'interro__stat', text: solved ? `⚡ Đã vạch ${solved} mâu thuẫn` : 'Chưa phát hiện mâu thuẫn' }))),
      el('section', { class: 'interro__main' },
        transcript,
        el('div', { class: 'interro__ask' },
          el('h3', { class: 'interro__ask-title', text: 'Đặt câu hỏi' }),
          topics.length
            ? el('div', { class: 'question-list' }, topics.map((t) => el('button', {
              type: 'button',
              class: 'question-chip',
              onClick: () => actions.askTopic(sid, t.id),
            }, t.question)))
            : el('p', { class: 'interro__empty', text: 'Đã hỏi hết. Hãy tìm thêm manh mối, hoặc bấm “⚡ Phản bác” trên một câu trả lời để trình bằng chứng.' }),
          el('p', { class: 'interro__tip', text: 'Mẹo: một số câu hỏi chỉ xuất hiện sau khi bạn đã xem manh mối liên quan hoặc vạch ra mâu thuẫn.' })))),
  ];
}

/** Modal chọn manh mối để trình. */
function openEvidencePicker(app, sid, topic, actions) {
  const clues = allClues(app);
  openModal({
    title: 'Trình bằng chứng',
    body: [
      el('p', { class: 'picker__about' }, 'Phản bác câu trả lời cho: ', el('strong', { text: `“${topic.question}”` })),
      el('div', { class: 'picker' }, clues.map((cl) => el('button', {
        type: 'button',
        class: 'picker__item',
        onClick: () => { closeModal(); actions.presentEvidence(sid, topic.id, cl.id); },
      },
      el('img', { src: cl.icon, alt: '' }),
      el('span', {}, el('small', { text: clueNo(cl) }), cl.title)))),
    ],
    foot: el('button', { type: 'button', class: 'btn btn--paper', 'data-close': true }, 'Huỷ'),
  });
}
