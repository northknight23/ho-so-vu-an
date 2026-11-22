/**
 * Chế độ điều tra có đồng hồ (caseData.mode === "timed").
 *
 * Mô hình (docs/case-03-logic.md):
 *   - Thời gian T = {1..N}, N = số ngày × số buổi. Mỗi câu hỏi tốn đúng 1 lượt, kể cả hỏi sai.
 *   - Một câu hỏi = (người p, nơi l, chủ đề q). Người chỉ có mặt ở nơi theo lịch caseData.schedule.
 *   - Lấy được manh mối x ở lượt t ⇔ t ∈ A(x) ∧ R(x) ⊆ H_t ∧ hỏi đúng (p, l, q).
 *     R(x) nằm ở caseData.leads[].requires (chủ đề chỉ hiện khi đã có đủ manh mối tiên quyết);
 *     A(x) và nội dung manh mối nằm trong payload mã hóa của caseData.asks (khóa = bộ ba p|l|q).
 *
 * Tiến trình chỉ lưu nhật ký progress.timed.log = [{ t, p, l, q }];
 * manh mối đã có và câu trả lời được tính lại bằng computeTimed() mỗi lần vẽ.
 */
import { el, para, rich } from './dom.js';
import { openModal, closeModal } from './modal.js';
import { askHash, decodeAsk } from './answer.js';
import { clueLink } from './ui.js';

export const isTimed = (c) => c?.mode === 'timed';
export const totalTurns = (c) => c.clock.days * c.clock.slots.length;

/** Lượt hiện tại (1-based). Lớn hơn totalTurns nghĩa là đã hết giờ. */
export const currentTurn = (app) => (app.progress.timed?.log?.length || 0) + 1;

/** Nhãn thời gian của lượt t: { day, slot, date, label }. */
export function clockAt(c, t) {
  const per = c.clock.slots.length;
  const day = Math.min(c.clock.days, Math.ceil(t / per));
  const slot = c.clock.slots[(t - 1) % per];
  const date = c.clock.dates?.[day - 1];
  return { day, slot, date, label: `Ngày ${day}${date ? ` (${date})` : ''} · ${slot}` };
}

/** Chuỗi ngắn cho header: "Ngày 2 · Chiều · còn 4 lượt" hoặc "Hết 72 giờ". */
export function clockSummary(app) {
  const c = app.caseData;
  const t = currentTurn(app);
  const N = totalTurns(c);
  if (t > N) return 'Hết thời hạn tạm giữ';
  const { day, slot } = clockAt(c, t);
  return `Ngày ${day} · ${slot} · còn ${N - t + 1} lượt`;
}

// Bộ nhớ đệm giải mã: "p|l|q" → payload | null
const cache = new Map();
function decodeTriple(app, p, l, q) {
  const key = `${p}|${l}|${q}`;
  if (cache.has(key)) return cache.get(key);
  const c = app.caseData;
  const hash = askHash(c.answer.salt, p, l, q);
  const hit = (c.asks || []).find((a) => a.hash === hash);
  let data = null;
  if (hit) {
    try { data = decodeAsk(c.id, c.answer.salt, p, l, q, hit.payload); } catch { data = null; }
  }
  cache.set(key, data);
  return data;
}

/**
 * Tính lại toàn bộ từ nhật ký → app.timed = { clues, entries }.
 * entries[i] = { ...log[i], kind: 'ok'|'late'|'early'|'none', lines, clue? }
 */
export function computeTimed(app) {
  const c = app.caseData;
  const held = new Set(c.clues.map((x) => x.id));
  const clues = [];
  const entries = [];
  for (const ev of app.progress.timed?.log || []) {
    const data = decodeTriple(app, ev.p, ev.l, ev.q);
    const person = personOf(c, ev.p);
    let kind = 'none';
    let lines = person?.fallback?.length ? [person.fallback[entries.length % person.fallback.length]] : ['Tôi không biết gì về chuyện đó.'];
    let clue = null;
    if (data) {
      const window = data.window || [];
      if (window.includes(ev.t)) {
        kind = 'ok';
        lines = data.answer || [];
        clue = data.clue || null;
      } else if (window.length && ev.t > Math.max(...window)) {
        kind = 'late';
        lines = data.late || ['Muộn rồi. Thứ anh cần không còn nữa.'];
      } else {
        kind = 'early';
        lines = data.early || ['Bây giờ thì chưa được. Lúc khác quay lại.'];
      }
    }
    if (clue && !held.has(clue.id)) {
      held.add(clue.id);
      clues.push(clue);
    }
    entries.push({ ...ev, kind, lines, clue });
  }
  app.timed = { clues, entries };
}

export const personOf = (c, id) => c.people.find((x) => x.id === id) || c.suspects.find((x) => x.id === id);

/** Ai đang có mặt ở nơi l tại lượt t (theo lịch). */
export function presentAt(c, l, t) {
  return Object.entries(c.schedule || {})
    .filter(([, plan]) => plan[t - 1] === l)
    .map(([id]) => personOf(c, id))
    .filter(Boolean);
}

/** Các chủ đề đang hỏi được: đủ manh mối tiên quyết (R(x) ⊆ H). */
export function availableLeads(app) {
  const c = app.caseData;
  const held = new Set([...c.clues.map((x) => x.id), ...(app.timed?.clues || []).map((x) => x.id)]);
  return (c.leads || []).filter((q) => (q.requires?.clues || []).every((id) => held.has(id)));
}

/** Tin tức về những nguồn chứng cứ đã biến mất tính tới lượt t. */
export const newsUntil = (c, t) => (c.expiries || []).filter((x) => x.after < t);

// ---------------------------------------------------------------------
// Tab "Điều tra"
// ---------------------------------------------------------------------
let selectedPlace = null; // chỉ là trạng thái giao diện, không cần lưu

export function renderInvestigate(app, actions) {
  const c = app.caseData;
  const t = currentTurn(app);
  const N = totalTurns(c);
  const over = t > N;
  const done = Boolean(app.progress.submission);
  if (!selectedPlace || !c.locations.some((x) => x.id === selectedPlace)) selectedPlace = c.locations[0].id;

  const clock = el('div', { class: 'paper-card clock' },
    el('div', { class: 'clock__now' },
      el('strong', { text: over ? 'Hết 72 giờ tạm giữ' : clockAt(c, t).label }),
      el('span', { text: over ? 'Không thể điều tra thêm. Hãy buộc tội — hoặc thả tất cả.' : `Lượt ${t}/${N} · còn ${N - t + 1} lượt` })),
    el('div', { class: 'clock__bar', role: 'img', 'aria-label': `Đã dùng ${Math.min(t - 1, N)} trên ${N} lượt` },
      Array.from({ length: N }, (_, i) => el('span', {
        class: `clock__cell${i < t - 1 ? ' is-used' : ''}${i === t - 1 && !over ? ' is-now' : ''}${(i + 1) % c.clock.slots.length === 0 ? ' is-dayend' : ''}`,
      }))),
    newsUntil(c, t).length ? el('ul', { class: 'clock__news' },
      newsUntil(c, t).map((n) => el('li', {}, rich(`📰 ${n.text}`)))) : null);

  const places = el('div', { class: 'places', role: 'tablist', 'aria-label': 'Địa điểm' },
    c.locations.map((loc) => {
      const here = over ? [] : presentAt(c, loc.id, t);
      return el('button', {
        type: 'button',
        role: 'tab',
        class: `place${loc.id === selectedPlace ? ' is-active' : ''}`,
        'aria-selected': String(loc.id === selectedPlace),
        onClick: () => { selectedPlace = loc.id; actions.rerender(); },
      }, el('span', { class: 'place__name', text: loc.name }), el('span', { class: 'place__count', text: here.length ? `${here.length} người` : 'vắng' }));
    }));

  const loc = c.locations.find((x) => x.id === selectedPlace);
  const here = over ? [] : presentAt(c, loc.id, t);
  const people = el('div', { class: 'paper-card place-detail' },
    el('h3', { text: loc.name }),
    loc.desc && para(loc.desc, { class: 'place-detail__desc' }),
    here.length
      ? el('div', { class: 'people' }, here.map((p) => el('button', {
        type: 'button',
        class: 'person',
        disabled: done || over,
        onClick: () => openAsk(app, p, loc, actions),
      },
      p.portrait ? el('img', { src: p.portrait, alt: '' }) : el('span', { class: 'person__avatar', 'aria-hidden': 'true', text: p.name.split(' ').pop().slice(0, 1) }),
      el('span', { class: 'person__name', text: p.name }),
      el('span', { class: 'person__role', text: p.role || p.relation || '' }))))
      : el('p', { class: 'place-detail__empty', text: over ? 'Hết giờ.' : 'Lúc này không có ai ở đây.' }));

  const entries = app.timed?.entries || [];
  const log = el('section', { class: 'paper-card ilog' },
    el('h3', { text: 'Nhật ký điều tra' }),
    entries.length
      ? el('ol', { class: 'ilog__list' }, [...entries].reverse().map((e) => {
        const p = personOf(c, e.p);
        const lead = c.leads.find((x) => x.id === e.q);
        const place = c.locations.find((x) => x.id === e.l);
        return el('li', { class: `ilog__item is-${e.kind}` },
          el('div', { class: 'ilog__head', text: `${clockAt(c, e.t).label} — ${place?.name || e.l}` }),
          el('div', { class: 'ilog__q', text: `Hỏi ${p?.name || e.p}: ${lead?.label || e.q}` }),
          e.lines.map((line) => para(line, { class: 'ilog__a' })),
          e.clue ? el('div', { class: 'ilog__clue' }, '🔓 Manh mối mới: ', clueLink(app, e.clue.id, actions)) : null);
      }))
      : el('p', { class: 'ilog__empty', text: 'Chưa hỏi ai. Mỗi câu hỏi tốn một lượt — kể cả khi hỏi sai người, sai chỗ.' }));

  return [
    el('h2', { class: 'panel__title', text: 'Điều tra' }),
    el('p', { class: 'panel__intro', text: 'Chọn nơi, chọn người đang có mặt, rồi chọn chủ đề để hỏi. Mỗi câu hỏi tốn một lượt. Chứng cứ có hạn sử dụng: đến muộn là mất.' }),
    clock,
    el('div', { class: 'investigate' }, el('div', {}, places, people), log),
  ];
}

function openAsk(app, person, loc, actions) {
  const leads = availableLeads(app);
  openModal({
    title: `Hỏi ${person.name}`,
    body: [
      para(`${loc.name} · ${clockAt(app.caseData, currentTurn(app)).label}. Câu hỏi này tốn 1 lượt.`, { class: 'ask__intro' }),
      el('div', { class: 'ask__leads' }, leads.map((q) => el('button', {
        type: 'button',
        class: 'btn btn--paper ask__lead',
        onClick: () => { closeModal(); actions.askAt(person.id, loc.id, q.id); },
      }, q.label))),
    ],
    foot: el('button', { type: 'button', class: 'btn btn--paper', 'data-close': true }, 'Thôi'),
  });
}
