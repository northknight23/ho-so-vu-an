/**
 * Render các màn hình chính.
 *
 * ui.js chỉ lo HIỂN THỊ. Mọi thay đổi trạng thái (đánh dấu đã xem, lưu ghi chú,
 * nộp bài…) đều gọi qua object `actions` do main.js truyền vào, để logic lưu trữ
 * nằm tập trung một chỗ.
 *
 * Tham số `app` = { caseData, progress, unlocked, revealedClues, rank }.
 * Các màn phụ nằm ở module riêng: interrogation.js, board.js, hints.js.
 */
import { el, mount, para, rich } from './dom.js';
import { renderDocument } from './documents.js';
import { optionsFor } from './caseLoader.js';
import { partsOf } from './answer.js';
import { openModal, confirmDialog } from './modal.js';
import { allClues, findClue, clueNo, lockedRemaining, hintsUsedTotal } from './selectors.js';
import { renderInterrogation, solvedCount } from './interrogation.js';
import { renderBoard } from './board.js';
import { openHints } from './hints.js';
import { isTimed, renderInvestigate, clockSummary } from './timed.js';

const root = () => document.getElementById('app');

// ======================================================================
// Biểu tượng tab (SVG nét, vẽ inline để đổi màu theo chữ)
// ======================================================================
const ICON_PATHS = {
  overview: 'M3 7h6l2 2h10v10H3z',
  suspects: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0',
  clues: 'M10.5 17a6.5 6.5 0 1 1 0-13 6.5 6.5 0 0 1 0 13zM15.5 15.5 21 21',
  scene: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20zM9 4v13.5M15 6.5V20',
  board: 'M3 4h18v14H3zM7 9l5 4 5-6M7 9h.01M12 13h.01M17 7h.01M8 21l1-3M16 21l-1-3',
  notes: 'M4 20h4L19.5 8.5l-4-4L4 16zM14 6l4 4',
  exit: 'M10 4H5v16h5M14 8l4 4-4 4M18 12H9',
  investigate: 'M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10zM12 8.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5',
};

function icon(name) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(NS, 'path');
  path.setAttribute('d', ICON_PATHS[name]);
  svg.append(path);
  return svg;
}

/** Các tab của màn hồ sơ. `short` dùng trên điện thoại khi thiếu chỗ. */
export const TABS = [
  { id: 'overview', label: 'Tổng quan' },
  { id: 'suspects', label: 'Nghi phạm' },
  { id: 'clues', label: 'Manh mối' },
  { id: 'scene', label: 'Hiện trường', short: 'Sơ đồ' },
  { id: 'board', label: 'Bảng suy luận', short: 'Bảng' },
  { id: 'notes', label: 'Sổ tay' },
];

/** Các tab theo chế độ chơi: vụ có đồng hồ thay tab Hiện trường bằng tab Điều tra. */
export function tabsFor(c) {
  if (!isTimed(c)) return TABS;
  return TABS.map((t) => (t.id === 'scene' ? { id: 'investigate', label: 'Điều tra' } : t));
}

// ======================================================================
// Màn lỗi
// ======================================================================
export function renderError(message) {
  document.body.classList.remove('has-tabbar');
  mount(root(), el('div', { class: 'error-screen' },
    el('div', {},
      el('h2', { text: 'Không mở được hồ sơ' }),
      el('pre', { text: message }),
      el('p', { text: 'Hãy chạy game qua một static server (vd: npx serve) thay vì mở trực tiếp file index.html.' }))));
}

// ======================================================================
// Màn mở đầu
// ======================================================================
export function renderIntro(app, actions) {
  const { caseData: c, progress: p } = app;
  document.body.classList.remove('has-tabbar');

  const buttons = [];
  if (!p.started) {
    buttons.push(el('button', { type: 'button', class: 'btn btn--primary', onClick: () => actions.go('#/case/overview') }, 'Bắt đầu điều tra'));
  } else {
    buttons.push(el('button', { type: 'button', class: 'btn btn--primary', onClick: () => actions.go(`#/case/${p.lastTab || 'overview'}`) }, 'Tiếp tục điều tra'));
    if (p.submission) buttons.push(el('button', { type: 'button', class: 'btn btn--paper', onClick: () => actions.go('#/result') }, 'Xem kết quả'));
    buttons.push(el('button', { type: 'button', class: 'btn btn--paper', onClick: () => actions.reset() }, 'Chơi lại từ đầu'));
  }

  // Kệ hồ sơ: chuyển vụ bằng ?case=<id> (mỗi vụ lưu tiến trình riêng)
  const shelf = (app.library || []).length > 1 && el('nav', { class: 'shelf', 'aria-label': 'Chọn hồ sơ vụ án' },
    app.library.map((item) => {
      const current = item.id === c.id;
      return el(current ? 'span' : 'a', {
        class: `shelf__item${current ? ' is-current' : ''}`,
        href: current ? null : `?case=${encodeURIComponent(item.id)}`,
        'aria-current': current ? 'true' : null,
      },
      el('span', { class: 'shelf__no', text: item.caseNumber || item.id }),
      el('span', { class: 'shelf__title', text: item.title }),
      el('span', { class: 'shelf__meta' },
        item.difficulty && el('span', { class: `shelf__diff shelf__diff--${/khó/i.test(item.difficulty) ? 'hard' : 'easy'}`, text: item.difficulty }),
        item.status && el('span', { text: item.status })));
    }));

  mount(root(), el('section', { class: 'intro' },
    shelf,
    el('div', { class: 'folder', 'data-label': c.caseNumber || 'HỒ SƠ' },
      el('div', { class: 'stamp', 'aria-hidden': 'true', text: c.stamp || 'MẬT' }),
      el('div', { class: 'intro__eyebrow', text: [c.location, c.difficulty && `Độ khó: ${c.difficulty}`].filter(Boolean).join(' · ') }),
      el('h1', { class: 'intro__title', text: c.title }),
      c.tagline && el('p', { class: 'intro__tagline', text: c.tagline }),
      el('div', { class: 'intro__summary' }, para(c.summary)),
      el('div', { class: 'intro__victim' },
        c.victim.portrait && el('img', { src: c.victim.portrait, alt: `Ảnh nạn nhân ${c.victim.name}`, width: '84', height: '100' }),
        el('div', {},
          el('strong', { text: `Nạn nhân: ${c.victim.name}` }),
          el('span', { text: [c.victim.age && `${c.victim.age} tuổi`, c.victim.occupation].filter(Boolean).join(' · ') }))),
      el('div', { class: 'intro__actions' }, buttons),
      el('p', { class: 'intro__hint', text: 'Tiến trình, ghi chú và bảng suy luận được lưu tự động trên trình duyệt này.' }))));
}

// ======================================================================
// Màn hồ sơ (header + tab)
// ======================================================================
/**
 * @param {string} tab  tab đang chọn
 * @param {{interrogate?: string}} opts  nếu có → hiển thị màn thẩm vấn thay cho nội dung tab
 */
export function renderCase(app, tab, actions, opts = {}) {
  const { caseData: c, progress: p } = app;
  document.body.classList.add('has-tabbar');

  const clues = allClues(app);
  const seen = clues.filter((cl) => p.viewedClues.includes(cl.id)).length;
  const locked = lockedRemaining(app);
  const usedHints = hintsUsedTotal(app);

  const header = el('header', { class: 'case-header' },
    el('div', { class: 'case-header__row' },
      // Nút thoát ra trang bìa — tiến trình đã tự lưu nên không cần hỏi xác nhận
      el('button', {
        type: 'button',
        class: 'btn btn--ghost btn--small exit-btn',
        title: 'Thoát ra trang bìa (tiến trình đã được lưu)',
        'aria-label': 'Thoát ra trang bìa hồ sơ',
        onClick: () => actions.go('#/'),
      }, icon('exit'), el('span', { class: 'hide-sm', text: 'Thoát' })),
      el('button', { type: 'button', class: 'case-header__home', onClick: () => actions.go('#/'), 'aria-label': 'Về trang bìa hồ sơ' },
        el('span', { class: 'case-header__title', text: c.title }),
        el('span', { class: 'case-header__progress', text: isTimed(c)
          ? `${clockSummary(app)} · ${clues.length} manh mối`
          : `Đã xem ${seen}/${clues.length} manh mối${locked ? ` · 🔒 ${locked} chưa mở` : ''}` })),
      c.hints && el('button', {
        type: 'button',
        class: 'btn btn--ghost btn--small hint-btn',
        'aria-label': `Gợi ý${usedHints ? ` (đã dùng ${usedHints})` : ''}`,
        onClick: () => openHints(app, actions),
      }, '💡', el('span', { class: 'hide-sm', text: 'Gợi ý' }), usedHints ? el('span', { class: 'hint-btn__count', text: String(usedHints) }) : null),
      p.submission
        ? el('button', { type: 'button', class: 'btn btn--ghost btn--small', onClick: () => actions.go('#/result') }, 'Kết quả')
        : el('button', { type: 'button', class: 'btn btn--primary btn--small', onClick: () => actions.go('#/submit') }, isTimed(c) ? 'Buộc tội' : 'Nộp kết luận')),
    el('nav', { class: 'tabs', role: 'tablist', 'aria-label': 'Các phần của hồ sơ' },
      tabsFor(c).map((t) => el('button', {
        type: 'button',
        class: 'tab',
        role: 'tab',
        'aria-selected': String(t.id === tab),
        onClick: () => actions.go(`#/case/${t.id}`),
      }, icon(t.id),
      el('span', { class: 'tab__label', text: t.label }),
      el('span', { class: 'tab__short', 'aria-hidden': 'true', text: t.short || t.label })))));

  const panels = {
    overview: renderOverview,
    suspects: renderSuspects,
    clues: renderClues,
    scene: renderScene,
    investigate: renderInvestigate,
    board: renderBoard,
    notes: renderNotes,
  };
  const content = opts.interrogate
    ? renderInterrogation(app, opts.interrogate, actions)
    : (panels[tab] || renderOverview)(app, actions);
  const panel = el('section', { class: `panel panel--${opts.interrogate ? 'interrogate' : tab}`, role: 'tabpanel' }, content);
  mount(root(), header, panel);
}

// ---------- Tab: Tổng quan ----------
function renderOverview(app) {
  const { caseData: c } = app;
  return [
    el('div', { class: 'overview' },
      el('article', { class: 'paper-card briefing' },
        el('h3', { text: 'Tóm tắt vụ việc' }),
        c.briefing.map((t) => para(t))),
      el('aside', { class: 'paper-card victim-card' },
        c.victim.portrait && el('img', { class: 'victim-card__portrait', src: c.victim.portrait, alt: `Ảnh nạn nhân ${c.victim.name}` }),
        el('h3', { text: c.victim.name }),
        el('div', { class: 'victim-card__sub', text: [c.victim.age && `${c.victim.age} tuổi`, c.victim.occupation].filter(Boolean).join(' · ') }),
        el('ul', { class: 'fact-list' }, (c.victim.facts || []).map((f) => el('li', {}, rich(f)))))),
    el('div', { class: 'howto' },
      el('h3', { text: 'Cách chơi' }),
      c.howto ? el('ol', {}, c.howto.map((t) => el('li', {}, rich(t)))) : el('ol', {},
        el('li', { text: 'Đọc lời khai, mở từng manh mối và xem sơ đồ hiện trường.' }),
        el('li', { text: 'Thẩm vấn nghi phạm. Thấy câu trả lời nào mâu thuẫn với chứng cứ, bấm “⚡ Phản bác” và trình đúng manh mối để mở khóa lời khai hoặc manh mối mới.' }),
        el('li', { text: 'Ghim thẻ lên Bảng suy luận và căng dây đỏ nối các chi tiết liên quan; ghi chú trong Sổ tay.' }),
        el('li', { text: 'Bí quá thì dùng 💡 Gợi ý (bị trừ điểm). Khi chắc chắn, bấm “Nộp kết luận”.' }))),
  ];
}

// ---------- Tab: Nghi phạm ----------
function renderSuspects(app, actions) {
  const { caseData: c } = app;
  return [
    el('h2', { class: 'panel__title', text: 'Nghi phạm' }),
    el('p', { class: 'panel__intro', text: 'Bấm vào ảnh để đọc lời khai, hoặc bấm “Thẩm vấn” để hỏi trực tiếp.' }),
    el('div', { class: 'suspect-grid' },
      c.suspects.map((s) => {
        const solved = solvedCount(app, s.id);
        return el('article', { class: 'paper-card suspect-card' },
          el('button', { type: 'button', class: 'suspect-card__main', onClick: () => openSuspect(app, s.id, actions) },
            el('div', { class: 'suspect-card__photo' },
              el('img', { src: s.portrait, alt: '', loading: 'lazy' }),
              el('span', { text: s.nickname || s.name.split(' ').pop() })),
            el('div', { class: 'suspect-card__name', text: s.name }),
            el('div', { class: 'suspect-card__meta', text: `${s.age} tuổi · ${s.occupation}` }),
            el('div', { class: 'suspect-card__relation', text: s.relation })),
          el('div', { class: 'suspect-card__foot' },
            c.interrogations?.[s.id] && el('button', {
              type: 'button',
              class: 'btn btn--paper btn--small',
              onClick: () => actions.go(`#/interrogate/${s.id}`),
            }, '🗣 Thẩm vấn'),
            solved ? el('span', { class: 'badge badge--pin', text: `⚡ ${solved}` }) : null));
      })),
  ];
}

export function openSuspect(app, suspectId, actions) {
  const s = app.caseData.suspects.find((x) => x.id === suspectId);
  if (!s) return;
  const extra = app.unlocked?.statements[s.id] || [];
  const onBoard = app.progress.board.cards.some((c) => c.kind === 'person' && c.ref === s.id);
  openModal({
    title: s.name,
    body: el('div', { class: 'suspect-detail' },
      el('img', { class: 'suspect-detail__photo', src: s.portrait, alt: `Chân dung ${s.name}` }),
      el('div', {},
        el('dl', { class: 'meta-list' },
          el('dt', { text: 'Tuổi' }), el('dd', { text: String(s.age) }),
          el('dt', { text: 'Nghề nghiệp' }), el('dd', { text: s.occupation }),
          el('dt', { text: 'Quan hệ' }), el('dd', { text: s.relation }),
          (s.details || []).map((d) => [el('dt', { text: d.label }), el('dd', {}, rich(d.value))])),
        el('blockquote', { class: 'statement' },
          el('div', { class: 'statement__label', text: 'Lời khai' }),
          s.statement.map((t) => para(t))),
        extra.length ? el('blockquote', { class: 'statement statement--extra' },
          el('div', { class: 'statement__label', text: '🔓 Lời khai bổ sung (qua thẩm vấn)' }),
          extra.map((t) => para(t))) : null,
        s.alibi && el('div', { class: 'alibi' }, el('strong', { text: 'Ngoại phạm (tự khai): ' }), rich(s.alibi)))),
    foot: [
      el('button', {
        type: 'button',
        class: 'btn btn--paper btn--small',
        onClick: () => { actions.toggleBoardCard('person', s.id); openSuspect(app, s.id, actions); },
      }, onBoard ? '✓ Đã ghim lên bảng' : '📌 Ghim lên bảng'),
      el('span', { style: { flex: '1' } }),
      app.caseData.interrogations?.[s.id] && el('button', {
        type: 'button',
        class: 'btn btn--primary btn--small',
        onClick: () => actions.go(`#/interrogate/${s.id}`),
      }, '🗣 Thẩm vấn'),
    ],
    onClose: () => actions.rerender(),
  });
}

// ---------- Tab: Manh mối ----------
let clueFilter = 'all';

function renderClues(app, actions) {
  const { caseData: c, progress: p } = app;
  const cats = c.categories || [];
  const clues = allClues(app);
  const boardIds = new Set(p.board.cards.filter((x) => x.kind === 'clue').map((x) => x.ref));
  const visible = clues.filter((cl) => clueFilter === 'all'
    || (clueFilter === 'board' ? boardIds.has(cl.id) : cl.category === clueFilter));
  const catLabel = (id) => cats.find((x) => x.id === id)?.label || id;
  const locked = lockedRemaining(app);
  const unlockedIds = new Set((app.unlocked?.clues || []).map((x) => x.id));

  const setFilter = (f) => { clueFilter = f; actions.rerender(); };
  const chip = (id, label) => el('button', { type: 'button', class: 'chip', 'aria-pressed': String(clueFilter === id), onClick: () => setFilter(id) }, label);

  return [
    el('h2', { class: 'panel__title', text: 'Manh mối' }),
    el('p', { class: 'panel__intro', text: 'Vật chứng, tài liệu và dữ liệu thu thập được. Không phải manh mối nào cũng quan trọng — và không phải manh mối nào cũng nói thật.' }),
    el('div', { class: 'filters', role: 'group', 'aria-label': 'Lọc manh mối' },
      chip('all', `Tất cả (${clues.length})`),
      cats.map((cat) => chip(cat.id, cat.label)),
      chip('board', `Trên bảng (${boardIds.size})`)),
    locked ? el('p', { class: 'locked-note', text: `🔒 Còn ${locked} manh mối chưa mở khóa. Hãy thẩm vấn nghi phạm và trình đúng bằng chứng.` }) : null,
    visible.length
      ? el('div', { class: 'clue-grid' }, visible.map((cl) => {
        const seen = p.viewedClues.includes(cl.id);
        return el('button', {
          type: 'button',
          class: `paper-card clue-card${seen ? ' is-seen' : ''}`,
          onClick: () => openClue(app, cl.id, actions),
        },
        el('img', { class: 'clue-card__icon', src: cl.icon, alt: '', loading: 'lazy' }),
        el('div', {},
          el('div', { class: 'clue-card__no', text: `${clueNo(cl)} · ${catLabel(cl.category)}` }),
          el('div', { class: 'clue-card__title', text: cl.title }),
          el('p', { class: 'clue-card__summary', text: cl.summary }),
          el('div', { class: 'clue-card__badges' },
            seen ? el('span', { class: 'badge badge--seen', text: 'Đã xem' }) : el('span', { class: 'badge badge--new', text: 'Mới' }),
            unlockedIds.has(cl.id) && el('span', { class: 'badge badge--unlock', text: '🔓 Từ thẩm vấn' }),
            boardIds.has(cl.id) && el('span', { class: 'badge badge--pin', text: '📌 Trên bảng' }))));
      }))
      : el('p', { class: 'panel__intro', text: 'Chưa có manh mối nào trong mục này.' }),
  ];
}

/** Mở chi tiết manh mối trong modal (có nút trước/sau và ghim lên bảng). */
export function openClue(app, clueId, actions) {
  const clues = allClues(app);
  const idx = clues.findIndex((x) => x.id === clueId);
  if (idx < 0) return;
  const cl = clues[idx];
  actions.markClueViewed(cl.id);

  const onBoard = app.progress.board.cards.some((c) => c.kind === 'clue' && c.ref === cl.id);
  const prev = clues[idx - 1];
  const next = clues[idx + 1];

  openModal({
    title: `${clueNo(cl)} · ${cl.title}`,
    body: [
      cl.foundAt && el('p', { class: 'clue-detail__found' }, el('strong', { text: 'Nơi thu thập: ' }), cl.foundAt),
      renderDocument(cl.detail),
      cl.note && el('div', { class: 'investigator-note' }, el('strong', { text: 'Ghi chú điều tra viên' }), rich(cl.note)),
    ],
    foot: [
      el('button', {
        type: 'button',
        class: 'btn btn--paper btn--small',
        'aria-pressed': String(onBoard),
        title: onBoard ? 'Gỡ thẻ này khỏi bảng suy luận' : 'Ghim thẻ này lên bảng suy luận',
        onClick: () => { actions.toggleBoardCard('clue', cl.id); openClue(app, cl.id, actions); },
      }, onBoard ? '✓ Trên bảng' : '📌 Ghim'),
      el('span', { style: { flex: '1' } }),
      prev && el('button', { type: 'button', class: 'btn btn--paper btn--small', onClick: () => openClue(app, prev.id, actions), 'aria-label': 'Manh mối trước' }, '← Trước'),
      next && el('button', { type: 'button', class: 'btn btn--paper btn--small', onClick: () => openClue(app, next.id, actions), 'aria-label': 'Manh mối sau' }, 'Sau →'),
    ],
    onClose: () => actions.rerender(),
  });
}

/** Nút nhỏ dẫn tới một manh mối (dùng ở hiện trường, sổ tay, thẩm vấn, lời giải). */
export function clueLink(app, id, actions) {
  const cl = findClue(app, id);
  if (!cl) return null;
  return el('button', { type: 'button', class: 'clue-link', onClick: () => openClue(app, id, actions) },
    `${clueNo(cl)} ${cl.title}`);
}

// ---------- Tab: Hiện trường ----------
function renderScene(app, actions) {
  const { caseData: c, progress: p } = app;
  const scene = c.scene;
  const hotspots = scene.hotspots || [];
  return [
    el('h2', { class: 'panel__title', text: scene.title || 'Hiện trường' }),
    scene.description && el('p', { class: 'panel__intro' }, rich(scene.description)),
    el('div', { class: 'scene-layout' },
      el('div', {},
        el('div', { class: 'scene-scroll' },
          el('div', { class: 'scene-map' },
            el('img', { src: scene.map, alt: scene.alt || 'Sơ đồ mặt bằng hiện trường' }),
            hotspots.map((h, i) => el('button', {
              type: 'button',
              class: `pin${p.viewedHotspots.includes(h.id) ? ' is-seen' : ''}`,
              style: { left: `${h.x}%`, top: `${h.y}%` },
              'aria-label': `${i + 1}. ${h.label}`,
              title: h.label,
              onClick: () => openHotspot(app, h.id, actions),
            }, String(i + 1))))),
        el('p', { class: 'scene-hint', text: 'Trên điện thoại có thể vuốt ngang để xem hết sơ đồ.' })),
      el('aside', { class: 'paper-card scene-legend' },
        el('ol', {}, hotspots.map((h, i) => el('li', {},
          el('button', { type: 'button', onClick: () => openHotspot(app, h.id, actions) },
            el('span', { class: 'scene-legend__no', text: String(i + 1) }),
            el('span', { text: h.label }))))))),
  ];
}

function openHotspot(app, hotspotId, actions) {
  const h = app.caseData.scene.hotspots.find((x) => x.id === hotspotId);
  if (!h) return;
  actions.markHotspot(h.id);
  const texts = Array.isArray(h.text) ? h.text : [h.text];
  openModal({
    title: h.label,
    body: [
      texts.map((t) => para(t)),
      (h.clueIds || []).length ? el('div', {},
        el('p', { class: 'clue-detail__found', style: { marginTop: '12px' }, text: 'Manh mối liên quan:' }),
        h.clueIds.map((id) => clueLink(app, id, actions))) : null,
    ],
    foot: el('button', { type: 'button', class: 'btn btn--paper', 'data-close': true }, 'Đóng'),
    onClose: () => actions.rerender(),
  });
}

// ---------- Tab: Sổ tay ----------
function renderNotes(app, actions) {
  const { progress: p } = app;
  const status = el('span', { class: 'notebook__status', 'aria-live': 'polite', text: p.notes ? 'Đã lưu' : 'Tự động lưu' });
  let timer = null;

  const save = (value) => {
    actions.saveNotes(value);
    const t = new Date();
    status.textContent = `Đã lưu lúc ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
  };

  // Tự động lưu sau khi ngừng gõ 500ms; lưu ngay khi rời ô nhập
  const textarea = el('textarea', {
    'aria-label': 'Ghi chú điều tra',
    placeholder: 'Ghi lại mốc thời gian, mâu thuẫn trong lời khai, nghi vấn…',
    spellcheck: 'false',
    onInput: (e) => {
      status.textContent = 'Đang ghi…';
      clearTimeout(timer);
      timer = setTimeout(() => save(e.target.value), 500);
    },
    onBlur: (e) => { clearTimeout(timer); save(e.target.value); },
  });
  textarea.value = p.notes || '';

  const pinned = p.board.cards.filter((x) => x.kind === 'clue').map((x) => x.ref);
  return [
    el('h2', { class: 'panel__title', text: 'Sổ tay điều tra' }),
    renderElimGrid(app, actions),
    el('div', { class: 'notebook-layout' },
      el('div', { class: 'paper-card notebook' },
        el('div', { class: 'notebook__head' }, el('span', { text: 'Ghi chú của bạn' }), status),
        textarea),
      el('aside', { class: 'paper-card pinned' },
        el('h3', { text: 'Manh mối trên bảng suy luận' }),
        pinned.length
          ? el('ul', {}, pinned.map((id) => el('li', {}, clueLink(app, id, actions))))
          : el('p', { class: 'pinned__empty', text: 'Mở một manh mối và bấm “📌 Ghim” để đưa nó lên Bảng suy luận.' }))),
  ];
}

// ---------- Lưới loại trừ (đầu tab Sổ tay) ----------
const GRID_MARKS = {
  yes: { text: '✓', label: 'thỏa' },
  no: { text: '✗', label: 'không thỏa' },
  maybe: { text: '?', label: 'chưa chắc' },
};
const GRID_DEFAULT_LABELS = ['Động cơ', 'Cơ hội', 'Ngoại phạm'];
const GRID_MAX_COLUMNS = 6;

/**
 * Lưới nghi phạm × điều kiện, người chơi tự đặt tên cột.
 * Bấm ô để đổi: trống → ✓ → ✗ → ? → trống. Lưu riêng theo từng vụ (progress.grid).
 */
function renderElimGrid(app, actions) {
  const { caseData: c, progress: p } = app;
  const grid = p.grid || { columns: GRID_DEFAULT_LABELS.map((label, i) => ({ id: `g${i + 1}`, label })), cells: {} };
  const cells = grid.cells || {};
  const canAdd = grid.columns.length < GRID_MAX_COLUMNS;

  const head = el('tr', {},
    el('th', { scope: 'col', class: 'elim__corner', text: 'Nghi phạm' }),
    grid.columns.map((col, i) => el('th', { scope: 'col' },
      el('div', { class: 'elim__colhead' },
        el('input', {
          type: 'text',
          class: 'elim__colname',
          value: col.label,
          maxlength: '40',
          placeholder: `Điều kiện ${i + 1}`,
          'aria-label': `Tên cột ${i + 1}`,
          onChange: (e) => actions.gridRenameColumn(col.id, e.target.value),
          onKeydown: (e) => { if (e.key === 'Enter') e.target.blur(); },
        }),
        el('button', {
          type: 'button',
          class: 'elim__remove',
          title: 'Xóa cột này',
          'aria-label': `Xóa cột ${col.label || i + 1}`,
          onClick: async () => {
            const hasMarks = Object.keys(cells).some((k) => k.endsWith(`|${col.id}`));
            if (hasMarks && !(await confirmDialog({ title: 'Xóa cột?', message: `Các dấu đã đánh trong cột “${col.label || i + 1}” sẽ mất.`, okLabel: 'Xóa cột' }))) return;
            actions.gridRemoveColumn(col.id);
          },
        }, '\u00d7')))),
    canAdd && el('th', { scope: 'col', class: 'elim__addcol' },
      el('button', { type: 'button', class: 'btn btn--paper btn--small', onClick: () => actions.gridAddColumn() }, '+ Cột')));

  const rows = c.suspects.map((s) => {
    const marks = grid.columns.map((col) => cells[`${s.id}|${col.id}`] || '');
    return el('tr', { class: marks.includes('no') ? 'is-out' : '' },
      el('th', { scope: 'row', class: 'elim__who' },
        s.portrait && el('img', { src: s.portrait, alt: '', width: '28', height: '34' }),
        el('span', { text: s.name })),
      grid.columns.map((col, i) => {
        const info = GRID_MARKS[marks[i]];
        return el('td', {},
          el('button', {
            type: 'button',
            class: `elim__cell${marks[i] ? ` is-${marks[i]}` : ''}`,
            'aria-label': `${s.name}, ${col.label || `điều kiện ${i + 1}`}: ${info ? info.label : 'chưa đánh dấu'}`,
            onClick: () => actions.gridCycle(s.id, col.id),
          }, info ? info.text : ''));
      }),
      canAdd && el('td', {}));
  });

  return el('section', { class: 'paper-card elim' },
    el('div', { class: 'elim__head' },
      el('h3', { text: 'Lưới loại trừ' }),
      Object.keys(cells).length ? el('button', {
        type: 'button',
        class: 'btn btn--paper btn--small',
        onClick: async () => {
          if (await confirmDialog({ title: 'Xóa mọi dấu?', message: 'Tên cột được giữ lại, chỉ xóa các dấu ✓ ✗ ?.', okLabel: 'Xóa dấu' })) actions.gridClear();
        },
      }, 'Xóa dấu') : null),
    el('p', { class: 'elim__help', text: 'Đặt tên cột là những điều hung thủ bắt buộc phải làm được. Bấm vào ô để đánh dấu: ✓ thỏa · ✗ không thỏa · ? chưa chắc. Ai có một dấu ✗ sẽ bị gạch mờ.' }),
    el('div', { class: 'elim__scroll', tabindex: '0' },
      el('table', { class: 'elim__table' }, el('thead', {}, head), el('tbody', {}, rows))));
}

// ======================================================================
// Màn nộp kết luận
// ======================================================================
export function renderSubmit(app, actions) {
  const { caseData: c, progress: p } = app;
  document.body.classList.remove('has-tabbar');
  const draft = p.draft || {};
  const defaultMsg = hintsUsedTotal(app)
    ? 'Bạn chỉ được nộp một lần. Điểm trừ do gợi ý sẽ được tính vào các phần tương ứng.'
    : 'Bạn chỉ được nộp một lần cho mỗi lượt chơi.';
  const msg = el('span', { class: 'submit-bar__msg', text: defaultMsg });

  const fieldset = (part, n) => {
    const q = c.questions[part];
    const isSuspect = q.optionsFrom === 'suspects';
    return el('fieldset', { class: 'question' },
      el('legend', {}, el('span', { class: 'question__no', text: `${n}.` }), q.prompt),
      el('div', { class: `options${isSuspect ? ' options--suspects' : ''}` },
        optionsFor(c, part).map((o) => {
          const input = el('input', { type: 'radio', name: part, value: o.id, required: true });
          if (draft[part] === o.id) input.checked = true;
          return el('label', { class: 'option' },
            input,
            el('span', { class: 'option__radio', 'aria-hidden': 'true' }),
            o.portrait && el('img', { src: o.portrait, alt: '' }),
            el('span', { text: o.label }));
        })));
  };

  const form = el('form', {
    class: 'submit-form',
    novalidate: true,
    onChange: () => {
      actions.saveDraft(readForm(form, c));
      msg.classList.remove('is-error');
      msg.textContent = defaultMsg;
    },
    onSubmit: async (e) => {
      e.preventDefault();
      const choice = readForm(form, c);
      const missing = partsOf(c).filter((part) => !choice[part]);
      if (missing.length) {
        msg.textContent = `Hãy trả lời đủ cả ${partsOf(c).length} câu hỏi trước khi nộp.`;
        msg.classList.add('is-error');
        return;
      }
      const ok = await confirmDialog({
        title: 'Nộp kết luận?',
        message: ['Sau khi nộp, bạn sẽ thấy điểm và lời giải chi tiết. Không thể sửa lại đáp án trong lượt chơi này.'],
        okLabel: 'Nộp bài',
        cancelLabel: 'Xem lại',
      });
      if (ok) actions.submit(choice);
    },
  },
  partsOf(c).map((part, i) => fieldset(part, i + 1)),
  el('div', { class: 'submit-bar' },
    el('button', { type: 'submit', class: 'btn btn--primary' }, 'Nộp kết luận'),
    el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go(`#/case/${p.lastTab || 'overview'}`) }, 'Quay lại hồ sơ'),
    el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go('#/') }, 'Thoát ra trang bìa'),
    msg));

  mount(root(), el('section', { class: 'panel' },
    el('h2', { class: 'panel__title', text: 'Kết luận điều tra' }),
    el('p', { class: 'panel__intro', text: 'Mỗi phần được chấm riêng. Hãy chắc chắn rằng kết luận của bạn giải thích được mọi chứng cứ.' }),
    form));
}

function readForm(form, c) {
  const data = new FormData(form);
  return Object.fromEntries(partsOf(c).map((part) => [part, data.get(part) || '']));
}

// ======================================================================
// Màn kết quả + lời giải
// ======================================================================
export function renderResult(app, solution, actions) {
  const { caseData: c, progress: p } = app;
  document.body.classList.remove('has-tabbar');
  const { result, submission } = p;
  const pct = result.max ? Math.round((result.score / result.max) * 100) : 0;
  const labelOf = (part, id) => optionsFor(c, part).find((o) => o.id === id)?.label || '—';

  const partRow = (part) => {
    const r = result.parts[part];
    const yours = labelOf(part, submission[part]);
    const correct = labelOf(part, solution.answers[part]);
    return el('div', { class: 'paper-card part' },
      el('div', { class: `part__mark ${r.correct ? 'is-ok' : 'is-bad'}`, 'aria-label': r.correct ? 'Đúng' : 'Sai', text: r.correct ? '✓' : '✕' }),
      el('div', {},
        el('div', { class: 'part__q', text: c.questions[part].prompt }),
        el('p', { class: 'part__answer' },
          r.correct
            ? el('strong', { text: correct })
            : [el('s', { text: yours }), ' → ', el('strong', { text: correct })]),
        solution.parts?.[part] && el('p', { class: 'part__explain' }, rich(solution.parts[part]))),
      el('div', { class: 'part__pts' },
        el('div', { text: `${r.points}/${r.max}` }),
        r.penalty ? el('small', { class: 'part__penalty', text: `−${r.penalty} gợi ý` }) : null));
  };

  mount(root(), el('section', { class: 'panel' },
    el('div', { class: 'paper-card result-hero' },
      el('div', { class: 'score-ring', style: { '--pct': String(pct) } },
        el('div', { class: 'score-ring__inner' },
          el('div', {},
            el('div', { class: 'score-ring__num', text: String(result.score) }),
            el('div', { class: 'score-ring__max', text: `/ ${result.max} điểm` })))),
      el('div', {},
        el('h2', { class: 'result-hero__rank', text: app.rank?.title || 'Kết quả' }),
        app.rank?.text && el('p', { text: app.rank.text }),
        solution.headline && el('p', { class: 'result-hero__headline' }, rich(solution.headline)))),

    el('div', { class: 'part-list' }, partsOf(c).map(partRow)),

    renderSolutionArticle(app, solution, actions),

    el('div', { class: 'result-actions' },
      el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go(`#/case/${p.lastTab || 'overview'}`) }, 'Xem lại hồ sơ'),
      el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go('#/') }, 'Về trang bìa'),
      el('button', { type: 'button', class: 'btn btn--primary', onClick: () => actions.reset() }, 'Chơi lại từ đầu'))));
}

/** Bài lời giải (chuyện gì đã xảy ra, chuỗi suy luận, mồi nhử, kết) — dùng chung cho mọi chế độ. */
export function renderSolutionArticle(app, solution, actions) {
  return el('article', { class: 'paper-card solution' },
      el('h3', { text: 'Chuyện gì đã xảy ra' }),
      (solution.overview || []).map((t) => para(t)),
      el('h3', { text: 'Chuỗi suy luận' }),
      el('ol', { class: 'chain' }, (solution.chain || []).map((step) => el('li', { class: step.key ? 'is-key' : '' },
        el('div', { class: 'chain__title' }, step.title, step.key && el('span', { class: 'badge badge--pin', text: 'Then chốt' })),
        para(step.text),
        (step.clueIds || []).map((id) => clueLink(app, id, actions))))),
      (solution.redHerrings || []).length ? [
        el('h3', { text: 'Những manh mối gây nhiễu' }),
        el('ul', { class: 'herring' }, solution.redHerrings.map((r) => el('li', {},
          el('strong', { text: `${r.title}: ` }), rich(r.text), ' ',
          (r.clueIds || []).map((id) => clueLink(app, id, actions))))),
      ] : null,
      solution.closing && [el('h3', { text: 'Kết' }), para(solution.closing)]);
}
