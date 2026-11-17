/**
 * Điểm khởi động của game.
 *
 * Luồng: tải vụ án → đọc tiến trình → tính phần đã mở khóa → định tuyến theo hash:
 *   #/                    màn mở đầu (bìa hồ sơ)
 *   #/case/<tab>          màn hồ sơ; tab ∈ overview | suspects | clues | scene | board | notes
 *   #/interrogate/<id>    thẩm vấn một nghi phạm (nằm trong khung màn hồ sơ, tab Nghi phạm)
 *   #/submit              form nộp kết luận
 *   #/result              điểm + lời giải (chỉ vào được sau khi đã nộp)
 *
 * Chọn vụ án qua query string: index.html?case=case-02 (mặc định case-01).
 * Trang bìa liệt kê các vụ trong cases/index.json để người chơi chuyển qua lại.
 */
import { loadCase, loadLibrary } from './caseLoader.js';
import { loadProgress, saveProgress, clearProgress, defaultProgress } from './storage.js';
import { gradeSubmission, decodeSolution, rankFor, contradictionHash } from './answer.js';
import { initModal, closeModal, confirmDialog } from './modal.js';
import { numberBaseClues } from './selectors.js';
import { computeUnlocks } from './interrogation.js';
import { suggestPosition } from './board.js';
import * as ui from './ui.js';

const DEFAULT_CASE = 'case-01';

/** Trạng thái toàn cục duy nhất của ứng dụng. */
const app = {
  caseData: null,
  progress: null,
  unlocked: null,       // tính từ nhật ký thẩm vấn (computeUnlocks)
  solution: null,       // lời giải đã giải mã (chỉ có sau khi nộp bài)
  revealedClues: [],    // manh mối bị khóa, lộ ra sau khi nộp bài
  rank: null,
  library: [],          // danh sách vụ án cho trang bìa (cases/index.json)
};

const DEFAULT_GRID_COLUMNS = ['Động cơ', 'Cơ hội', 'Ngoại phạm'];
const MAX_GRID_COLUMNS = 6;
const GRID_CYCLE = { '': 'yes', yes: 'no', no: 'maybe', maybe: '' };

/** Lưới loại trừ của vụ hiện tại (tạo mặc định khi dùng lần đầu). */
function ensureGrid() {
  const p = app.progress;
  if (!p.grid || !Array.isArray(p.grid.columns)) {
    p.grid = { columns: DEFAULT_GRID_COLUMNS.map((label, i) => ({ id: `g${i + 1}`, label })), cells: {} };
  }
  p.grid.cells ||= {};
  return p.grid;
}

const persist = () => saveProgress(app.caseData.id, app.progress);
const addUnique = (arr, id) => { if (!arr.includes(id)) arr.push(id); };
const newId = (prefix) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** Giải mã lời giải (sau khi đã nộp) để lấy đáp án + các manh mối bị khóa. */
function loadSolution() {
  const c = app.caseData;
  app.solution = decodeSolution(c.id, c.answer.salt, c.solution.payload);
  app.revealedClues = app.solution.lockedClues || [];
}

/** Các hành động mà ui.js / interrogation.js / board.js được phép gọi để thay đổi trạng thái. */
const actions = {
  go(hash) {
    if (location.hash === hash) route();
    else location.hash = hash;
  },

  /** Vẽ lại màn hiện tại (giữ nguyên vị trí cuộn). */
  rerender() {
    route({ keepScroll: true });
  },

  markClueViewed(id) {
    addUnique(app.progress.viewedClues, id);
    persist();
  },

  markHotspot(id) {
    addUnique(app.progress.viewedHotspots, id);
    persist();
  },

  saveNotes(text) {
    app.progress.notes = text;
    persist();
  },

  saveDraft(choice) {
    app.progress.draft = choice;
    persist();
  },

  // ----- Gợi ý -----
  useHint(part) {
    if (app.progress.submission) return;
    const max = app.caseData.hints?.[part]?.length || 0;
    app.progress.hintsUsed[part] = Math.min(max, (app.progress.hintsUsed[part] || 0) + 1);
    persist();
    actions.rerender(); // cập nhật số đếm trên header
  },

  // ----- Thẩm vấn -----
  askTopic(sid, tid) {
    const rec = (app.progress.interrogation[sid] ||= { log: [] });
    if (!rec.log.some((e) => e.k === 'ask' && e.t === tid)) rec.log.push({ k: 'ask', t: tid });
    persist();
    actions.rerender();
  },

  /** Trình bằng chứng: so hash của bộ (nghi phạm, câu trả lời, manh mối) với các mâu thuẫn. */
  presentEvidence(sid, tid, cid) {
    const c = app.caseData;
    const rec = (app.progress.interrogation[sid] ||= { log: [] });
    const hash = contradictionHash(c.answer.salt, sid, tid, cid);
    const match = (c.interrogations[sid].contradictions || []).some((x) => x.hash === hash);
    if (!match) {
      rec.log.push({ k: 'present', t: tid, c: cid, ok: false });
    } else if (app.unlocked.solved[sid]?.has(hash)) {
      rec.log.push({ k: 'present', t: tid, c: cid, ok: true, dup: true });
    } else {
      rec.log.push({ k: 'present', t: tid, c: cid, ok: true });
    }
    persist();
    computeUnlocks(app);
    actions.rerender();
  },

  // ----- Lưới loại trừ (tab Sổ tay) -----
  gridCycle(sid, colId) {
    const g = ensureGrid();
    const key = `${sid}|${colId}`;
    const next = GRID_CYCLE[g.cells[key] || ''];
    if (next) g.cells[key] = next;
    else delete g.cells[key];
    persist();
    actions.rerender();
  },

  gridRenameColumn(colId, label) {
    const col = ensureGrid().columns.find((c) => c.id === colId);
    if (!col) return;
    col.label = label.trim().slice(0, 40);
    persist();
  },

  gridAddColumn() {
    const g = ensureGrid();
    if (g.columns.length >= MAX_GRID_COLUMNS) return;
    g.columns.push({ id: newId('g'), label: '' });
    persist();
    actions.rerender();
  },

  gridRemoveColumn(colId) {
    const g = ensureGrid();
    g.columns = g.columns.filter((c) => c.id !== colId);
    for (const key of Object.keys(g.cells)) if (key.endsWith(`|${colId}`)) delete g.cells[key];
    persist();
    actions.rerender();
  },

  gridClear() {
    ensureGrid().cells = {};
    persist();
    actions.rerender();
  },

  // ----- Bảng suy luận -----
  boardAddCard(kind, ref, text) {
    const board = app.progress.board;
    const pos = suggestPosition(board);
    const card = { id: newId('k'), kind, ref, x: pos.x, y: pos.y };
    if (kind === 'note') card.text = text || '';
    board.cards.push(card);
    persist();
    return card;
  },

  boardRemoveCard(id) {
    const board = app.progress.board;
    board.cards = board.cards.filter((c) => c.id !== id);
    board.links = board.links.filter((l) => l.from !== id && l.to !== id);
    persist();
  },

  /** Ghim/gỡ một manh mối hoặc nhân vật (dùng ở modal manh mối, modal nghi phạm). */
  toggleBoardCard(kind, ref) {
    const existing = app.progress.board.cards.find((c) => c.kind === kind && c.ref === ref);
    if (existing) actions.boardRemoveCard(existing.id);
    else actions.boardAddCard(kind, ref);
  },

  /** Thẻ đã được board.js cập nhật toạ độ trực tiếp, chỉ cần lưu. */
  boardMoved() {
    persist();
  },

  boardAddLink(from, to) {
    const links = app.progress.board.links;
    const exists = links.some((l) => (l.from === from && l.to === to) || (l.from === to && l.to === from));
    if (!exists) links.push({ id: newId('l'), from, to, label: '' });
    persist();
  },

  boardUpdateLink(id, label) {
    const link = app.progress.board.links.find((l) => l.id === id);
    if (link) link.label = label;
    persist();
  },

  boardRemoveLink(id) {
    app.progress.board.links = app.progress.board.links.filter((l) => l.id !== id);
    persist();
  },

  boardUpdateNote(id, text) {
    const card = app.progress.board.cards.find((c) => c.id === id);
    if (card) card.text = text;
    persist();
  },

  boardSetZoom(z) {
    app.progress.board.zoom = z;
    persist();
  },

  // ----- Nộp bài -----
  /** Chấm bài (có trừ điểm gợi ý), lưu kết quả rồi chuyển sang màn kết quả. */
  submit(choice) {
    if (app.progress.submission) return; // chỉ cho nộp một lần
    app.progress.submission = { ...choice, submittedAt: new Date().toISOString() };
    app.progress.result = gradeSubmission(app.caseData, choice, app.progress.hintsUsed);
    delete app.progress.draft;
    persist();
    actions.go('#/result');
  },

  async reset() {
    const ok = await confirmDialog({
      title: 'Chơi lại từ đầu?',
      message: 'Toàn bộ tiến trình, ghi chú, bảng suy luận, biên bản thẩm vấn và kết quả của vụ án này sẽ bị xoá.',
      okLabel: 'Xoá và chơi lại',
    });
    if (!ok) return;
    clearProgress(app.caseData.id);
    app.progress = defaultProgress();
    app.solution = null;
    app.rank = null;
    app.revealedClues = [];
    computeUnlocks(app);
    actions.go('#/');
  },
};

const TAB_IDS = ui.TABS.map((t) => t.id);

/** Đọc location.hash và vẽ màn tương ứng. */
function route({ keepScroll = false } = {}) {
  const [screen = '', sub = ''] = location.hash.replace(/^#\/?/, '').split('/');
  const p = app.progress;
  const prevKey = route.lastKey;
  route.lastKey = `${screen}/${sub}`;

  // Đổi màn/tab thì đóng modal đang mở (vd nút Back trên điện thoại)
  if (!keepScroll) closeModal();

  switch (screen) {
    case 'case': {
      const tab = TAB_IDS.includes(sub) ? sub : (p.lastTab || 'overview');
      if (!p.started || p.lastTab !== tab) {
        p.started = true;
        p.lastTab = tab;
        persist();
      }
      ui.renderCase(app, tab, actions);
      break;
    }
    case 'interrogate': {
      if (!app.caseData.interrogations?.[sub]) return actions.go('#/case/suspects');
      p.started = true;
      ui.renderCase(app, 'suspects', actions, { interrogate: sub });
      break;
    }
    case 'submit':
      if (p.submission) return actions.go('#/result');
      ui.renderSubmit(app, actions);
      break;
    case 'result': {
      if (!p.submission || !p.result) return actions.go('#/submit');
      try {
        // Lời giải chỉ được giải mã sau khi đã nộp bài
        if (!app.solution) loadSolution();
      } catch (err) {
        ui.renderError(`Không giải mã được lời giải: ${err.message}`);
        return;
      }
      app.rank = rankFor(app.caseData.ranks, p.result.score, p.result.max);
      ui.renderResult(app, app.solution, actions);
      break;
    }
    default:
      ui.renderIntro(app, actions);
  }

  if (!keepScroll && prevKey !== route.lastKey) window.scrollTo(0, 0);
}

async function init() {
  initModal();
  const caseId = new URLSearchParams(location.search).get('case') || DEFAULT_CASE;
  try {
    [app.caseData, app.library] = await Promise.all([loadCase(caseId), loadLibrary()]);
  } catch (err) {
    ui.renderError(err.message);
    return;
  }
  numberBaseClues(app.caseData);
  app.progress = loadProgress(app.caseData.id);
  // Trạng thái từng vụ để hiện trên kệ hồ sơ ở trang bìa
  for (const item of app.library) {
    const saved = item.id === app.caseData.id ? app.progress : loadProgress(item.id);
    item.status = saved.result ? `Đã nộp · ${saved.result.score}/${saved.result.max}`
      : saved.started ? 'Đang điều tra' : 'Chưa mở';
  }
  computeUnlocks(app);
  if (app.progress.submission) {
    try { loadSolution(); } catch { /* lỗi sẽ hiện khi vào màn kết quả */ }
  }
  document.title = `${app.caseData.title} — Hồ Sơ Vụ Án`;
  window.addEventListener('hashchange', () => route());
  route();
}

init();
