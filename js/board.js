/**
 * Bảng suy luận: bảng gỗ bần, ghim thẻ (manh mối / nghi phạm / giấy note) và
 * nối chúng bằng dây đỏ.
 *
 * Toạ độ thẻ lưu theo hệ toạ độ "ảo" BOARD_W × BOARD_H (không phụ thuộc zoom).
 * Zoom = CSS transform scale trên .board-surface; .board-sizer giữ kích thước
 * đã scale để khung cuộn (.board-viewport) cuộn đúng.
 *
 * Kéo thả dùng Pointer Events → chạy được cả chuột lẫn cảm ứng. Thẻ có
 * touch-action: none; chạm vào nền bảng thì vẫn cuộn bình thường.
 *
 * State: app.progress.board = { cards: [{id, kind, ref, x, y, text?}], links: [{id, from, to, label?}], zoom }
 * Mọi thay đổi đi qua actions.board*(); board.js tự vẽ lại phần bảng (draw) để
 * không làm mất vị trí cuộn.
 */
import { el, mount } from './dom.js';
import { openModal, closeModal } from './modal.js';
import { allClues, findClue, clueNo } from './selectors.js';
import { openClue, openSuspect } from './ui.js';

export const BOARD_W = 1600;
export const BOARD_H = 1000;
export const CARD_W = 168;
const ZOOMS = [0.4, 0.5, 0.6, 0.75, 0.9, 1];
const NS = 'http://www.w3.org/2000/svg';

// Trạng thái giao diện (không cần lưu): chế độ nối dây, thẻ đang chọn, vị trí cuộn
let connectMode = false;
let connectFrom = null;
let lastScroll = { left: 0, top: 0 };
let currentViewport = null;

const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Mức zoom hiện tại (null = tự chọn: màn hình nhỏ thì thu nhỏ). */
function getZoom(board) {
  if (board.zoom) return board.zoom;
  return window.innerWidth < 720 ? 0.6 : 0.9;
}

/** Vị trí trống gần giữa vùng đang nhìn thấy, để thả thẻ mới vào. */
export function suggestPosition(board) {
  const z = getZoom(board);
  const n = board.cards.length;
  if (!currentViewport || !currentViewport.isConnected) {
    // Không đứng ở tab Bảng (vd ghim từ modal manh mối) → xếp theo lưới
    return { x: 40 + (n % 6) * 250, y: 40 + (Math.floor(n / 6) % 4) * 230 };
  }
  const cx = (currentViewport.scrollLeft + currentViewport.clientWidth / 2) / z;
  const cy = (currentViewport.scrollTop + currentViewport.clientHeight / 2) / z;
  // Rải nhẹ để các thẻ thêm liên tiếp không chồng khít lên nhau
  const jitter = (n % 5) * 26;
  return {
    x: clamp(cx - CARD_W / 2 + jitter - 52, 10, BOARD_W - CARD_W - 10),
    y: clamp(cy - 70 + jitter - 52, 10, BOARD_H - 160),
  };
}

/** Điểm đinh ghim của thẻ (nơi dây đỏ bám vào). */
const pinPoint = (card) => ({ x: card.x + CARD_W / 2, y: card.y + 10 });

/** Đường dây võng nhẹ xuống giữa như dây thật. */
function stringPath(a, b) {
  const p1 = pinPoint(a);
  const p2 = pinPoint(b);
  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const sag = Math.min(70, dist * 0.18);
  const mx = (p1.x + p2.x) / 2;
  const my = (p1.y + p2.y) / 2 + sag;
  return { d: `M${p1.x} ${p1.y} Q${mx} ${my} ${p2.x} ${p2.y}`, mid: { x: mx, y: (p1.y + p2.y) / 2 + sag / 2 } };
}

/** Nội dung hiển thị của một thẻ theo loại. */
function cardContent(app, card) {
  if (card.kind === 'clue') {
    const cl = findClue(app, card.ref);
    if (!cl) return { label: 'Manh mối', title: '(không còn tồn tại)' };
    return { label: clueNo(cl), title: cl.title, img: cl.icon, cls: 'is-clue' };
  }
  if (card.kind === 'person') {
    const s = app.caseData.suspects.find((x) => x.id === card.ref);
    const v = app.caseData.victim;
    if (s) return { label: 'Nghi phạm', title: s.name, img: s.portrait, cls: 'is-person' };
    if (card.ref === v.id) return { label: 'Nạn nhân', title: v.name, img: v.portrait, cls: 'is-person is-victim' };
    return { label: 'Nhân vật', title: '?' };
  }
  return { label: 'Ghi chú', title: card.text || '…', cls: 'is-note' };
}

export function renderBoard(app, actions) {
  const board = app.progress.board;
  let z = getZoom(board);

  const viewport = el('div', {
    class: 'board-viewport',
    onScroll: (e) => { lastScroll = { left: e.target.scrollLeft, top: e.target.scrollTop }; },
  });
  const sizer = el('div', { class: 'board-sizer' });
  const surface = el('div', { class: 'board-surface', style: { width: `${BOARD_W}px`, height: `${BOARD_H}px` } });
  const strings = svg('svg', { class: 'board-strings', viewBox: `0 0 ${BOARD_W} ${BOARD_H}`, width: BOARD_W, height: BOARD_H });
  sizer.append(surface);
  viewport.append(sizer);
  currentViewport = viewport;

  const zoomLabel = el('span', { class: 'board-zoom__value' });
  const modeHint = el('p', { class: 'board-hint' });

  function applyZoom() {
    sizer.style.width = `${BOARD_W * z}px`;
    sizer.style.height = `${BOARD_H * z}px`;
    surface.style.transform = `scale(${z})`;
    zoomLabel.textContent = `${Math.round(z * 100)}%`;
  }

  function updateHint() {
    modeHint.textContent = connectMode
      ? (connectFrom ? 'Chọn thẻ thứ hai để căng dây. Bấm lại thẻ đang chọn để huỷ.' : 'Chế độ nối dây: chọn thẻ thứ nhất.')
      : 'Kéo thẻ để sắp xếp. Bấm vào thẻ để xem chi tiết, bấm vào dây để ghi nhãn hoặc gỡ dây.';
    connectBtn.setAttribute('aria-pressed', String(connectMode));
  }

  // ----- Vẽ dây -----
  function drawStrings() {
    strings.replaceChildren();
    const byId = new Map(board.cards.map((c) => [c.id, c]));
    for (const link of board.links) {
      const a = byId.get(link.from);
      const b = byId.get(link.to);
      if (!a || !b) continue;
      const { d, mid } = stringPath(a, b);
      const g = svg('g', { class: 'string' });
      g.append(
        svg('path', { d, class: 'string__shadow' }),
        svg('path', { d, class: 'string__line' }),
        svg('path', { d, class: 'string__hit' }));
      if (link.label) {
        const t = svg('text', { x: mid.x, y: mid.y, class: 'string__label', 'text-anchor': 'middle' });
        t.textContent = link.label;
        g.append(t);
      }
      g.addEventListener('click', () => openLinkEditor(link));
      strings.append(g);
    }
  }

  // ----- Vẽ thẻ -----
  function cardNode(card) {
    const info = cardContent(app, card);
    const node = el('div', {
      class: `board-card ${info.cls || ''}${connectFrom === card.id ? ' is-selected' : ''}`,
      style: { left: `${card.x}px`, top: `${card.y}px`, width: `${CARD_W}px` },
      role: 'button',
      tabindex: '0',
      'aria-label': `${info.label}: ${info.title}`,
      onKeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tapCard(card); } },
    },
    el('span', { class: 'board-card__pin', 'aria-hidden': 'true' }),
    el('button', {
      type: 'button',
      class: 'board-card__remove',
      'aria-label': `Gỡ “${info.title}” khỏi bảng`,
      onClick: (e) => { e.stopPropagation(); actions.boardRemoveCard(card.id); draw(); },
    }, '×'),
    info.img && el('img', { class: 'board-card__img', src: info.img, alt: '', draggable: 'false' }),
    el('div', { class: 'board-card__label', text: info.label }),
    el('div', { class: 'board-card__title', text: info.title }));

    // Kéo thả bằng Pointer Events
    node.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      node.setPointerCapture(e.pointerId);
      const start = { px: e.clientX, py: e.clientY, x: card.x, y: card.y };
      let moved = false;
      const onMove = (ev) => {
        const dx = (ev.clientX - start.px) / z;
        const dy = (ev.clientY - start.py) / z;
        if (!moved && Math.hypot(ev.clientX - start.px, ev.clientY - start.py) < 6) return;
        moved = true;
        node.classList.add('is-dragging');
        card.x = Math.round(clamp(start.x + dx, 0, BOARD_W - CARD_W));
        card.y = Math.round(clamp(start.y + dy, 0, BOARD_H - 60));
        node.style.left = `${card.x}px`;
        node.style.top = `${card.y}px`;
        drawStrings();
      };
      const onEnd = () => {
        node.removeEventListener('pointermove', onMove);
        node.removeEventListener('pointerup', onEnd);
        node.removeEventListener('pointercancel', onEnd);
        node.classList.remove('is-dragging');
        if (moved) actions.boardMoved();
        else tapCard(card);
      };
      node.addEventListener('pointermove', onMove);
      node.addEventListener('pointerup', onEnd);
      node.addEventListener('pointercancel', onEnd);
    });
    return node;
  }

  function tapCard(card) {
    if (connectMode) {
      if (!connectFrom) connectFrom = card.id;
      else if (connectFrom === card.id) connectFrom = null;
      else {
        actions.boardAddLink(connectFrom, card.id);
        connectFrom = null;
      }
      draw();
      updateHint();
      return;
    }
    if (card.kind === 'clue') openClue(app, card.ref, actions);
    else if (card.kind === 'person' && card.ref !== app.caseData.victim.id) openSuspect(app, card.ref, actions);
    else if (card.kind === 'note') openNoteEditor(card);
  }

  function draw() {
    const nodes = board.cards.map(cardNode);
    const empty = board.cards.length ? null : el('div', { class: 'board-empty' },
      el('p', { text: 'Bảng đang trống.' }),
      el('p', { text: 'Bấm “＋ Thêm thẻ” để ghim nghi phạm, manh mối — hoặc dùng nút “📌 Ghim lên bảng” khi xem một manh mối.' }));
    mount(surface, nodes, strings, empty);
    drawStrings();
  }

  // ----- Hộp sửa dây / giấy note -----
  function openLinkEditor(link) {
    if (connectMode) return;
    const input = el('input', { class: 'field', type: 'text', maxlength: '40', placeholder: 'vd: nói dối, cùng giờ, động cơ…', 'aria-label': 'Nhãn của dây' });
    input.value = link.label || '';
    const save = () => { actions.boardUpdateLink(link.id, input.value.trim()); closeModal(); draw(); };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
    openModal({
      title: 'Sợi dây',
      body: [el('label', { class: 'field-label', text: 'Ghi nhãn cho mối liên hệ này' }), input],
      foot: [
        el('button', { type: 'button', class: 'btn btn--paper', onClick: () => { actions.boardRemoveLink(link.id); closeModal(); draw(); } }, 'Gỡ dây'),
        el('span', { style: { flex: '1' } }),
        el('button', { type: 'button', class: 'btn btn--primary', onClick: save }, 'Lưu'),
      ],
    });
    setTimeout(() => input.focus(), 50);
  }

  function openNoteEditor(card) {
    const area = el('textarea', { class: 'field field--note', rows: '4', maxlength: '160', 'aria-label': 'Nội dung giấy note' });
    area.value = card.text || '';
    openModal({
      title: 'Giấy note',
      body: area,
      foot: [
        el('button', { type: 'button', class: 'btn btn--paper', onClick: () => { actions.boardRemoveCard(card.id); closeModal(); draw(); } }, 'Gỡ khỏi bảng'),
        el('span', { style: { flex: '1' } }),
        el('button', { type: 'button', class: 'btn btn--primary', onClick: () => { actions.boardUpdateNote(card.id, area.value.trim()); closeModal(); draw(); } }, 'Lưu'),
      ],
    });
    setTimeout(() => area.focus(), 50);
  }

  // ----- Hộp chọn thẻ để thêm -----
  function openPicker() {
    const onBoard = (kind, ref) => board.cards.some((c) => c.kind === kind && c.ref === ref);
    const item = (kind, ref, img, small, title) => {
      const has = onBoard(kind, ref);
      return el('button', {
        type: 'button',
        class: `picker__item${has ? ' is-done' : ''}`,
        disabled: has,
        onClick: () => { actions.boardAddCard(kind, ref); closeModal(); draw(); },
      }, el('img', { src: img, alt: '' }), el('span', {}, el('small', { text: has ? '✓ Đã trên bảng' : small }), title));
    };
    const v = app.caseData.victim;
    openModal({
      title: 'Thêm thẻ lên bảng',
      body: [
        el('h3', { class: 'picker__group', text: 'Nhân vật' }),
        el('div', { class: 'picker' },
          item('person', v.id, v.portrait, 'Nạn nhân', v.name),
          app.caseData.suspects.map((s) => item('person', s.id, s.portrait, 'Nghi phạm', s.name))),
        el('h3', { class: 'picker__group', text: 'Manh mối' }),
        el('div', { class: 'picker' }, allClues(app).map((cl) => item('clue', cl.id, cl.icon, clueNo(cl), cl.title))),
      ],
      foot: el('button', { type: 'button', class: 'btn btn--paper', 'data-close': true }, 'Đóng'),
    });
  }

  // ----- Thanh công cụ -----
  const setZoom = (dir) => {
    const i = ZOOMS.findIndex((v) => v >= z - 0.001);
    const next = ZOOMS[clamp((i < 0 ? ZOOMS.length - 1 : i) + dir, 0, ZOOMS.length - 1)];
    // Giữ nguyên điểm ở giữa khung nhìn khi đổi zoom
    const cx = (viewport.scrollLeft + viewport.clientWidth / 2) / z;
    const cy = (viewport.scrollTop + viewport.clientHeight / 2) / z;
    z = next;
    actions.boardSetZoom(z);
    applyZoom();
    viewport.scrollLeft = cx * z - viewport.clientWidth / 2;
    viewport.scrollTop = cy * z - viewport.clientHeight / 2;
  };

  const connectBtn = el('button', {
    type: 'button',
    class: 'btn btn--ghost btn--small board-connect',
    onClick: () => { connectMode = !connectMode; connectFrom = null; viewport.classList.toggle('is-connecting', connectMode); draw(); updateHint(); },
  }, '〰 Nối dây');

  const toolbar = el('div', { class: 'board-toolbar' },
    el('button', { type: 'button', class: 'btn btn--primary btn--small', onClick: openPicker }, '＋ Thêm thẻ'),
    el('button', {
      type: 'button',
      class: 'btn btn--ghost btn--small',
      onClick: () => { const card = actions.boardAddCard('note', null, 'Ghi chú mới'); draw(); openNoteEditor(card); },
    }, '✎ Giấy note'),
    connectBtn,
    el('div', { class: 'board-zoom', role: 'group', 'aria-label': 'Thu phóng bảng' },
      el('button', { type: 'button', class: 'btn btn--ghost btn--small', 'aria-label': 'Thu nhỏ', onClick: () => setZoom(-1) }, '−'),
      zoomLabel,
      el('button', { type: 'button', class: 'btn btn--ghost btn--small', 'aria-label': 'Phóng to', onClick: () => setZoom(1) }, '+')));

  viewport.classList.toggle('is-connecting', connectMode);
  applyZoom();
  draw();
  updateHint();

  // Khôi phục vị trí cuộn sau khi gắn vào trang (vd quay lại từ modal manh mối)
  requestAnimationFrame(() => {
    viewport.scrollLeft = lastScroll.left;
    viewport.scrollTop = lastScroll.top;
  });

  return [
    el('h2', { class: 'panel__title', text: 'Bảng suy luận' }),
    toolbar,
    modeHint,
    viewport,
  ];
}
