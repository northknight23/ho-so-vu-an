/**
 * Lưu tiến trình người chơi vào localStorage, mỗi vụ án một key: "phaan:v2:<caseId>".
 *
 * v1 → v2: thêm thẩm vấn, bảng suy luận, gợi ý; danh sách "đánh dấu" (pinnedClues)
 * của v1 được chuyển thành các thẻ trên bảng suy luận. Xem migrateV1().
 *
 * Nếu localStorage bị chặn (ẩn danh, trình duyệt cấm lưu trữ…) thì lùi về bộ nhớ
 * tạm trong phiên → game vẫn chơi được, chỉ là không lưu lại.
 */

const PREFIX = 'phaan:v2:';
const LEGACY_PREFIX = 'phaan:v1:';
const memoryFallback = new Map();

/** Trạng thái mặc định khi người chơi mới mở vụ án. */
export function defaultProgress() {
  return {
    started: false,
    lastTab: 'overview',
    viewedClues: [],     // id manh mối đã mở xem
    viewedHotspots: [],  // id điểm hiện trường đã xem
    notes: '',           // nội dung sổ tay
    interrogation: {},   // { [suspectId]: { log: [ {k:'ask',t} | {k:'present',t,c,ok,f?,dup?} ] } }
    board: { cards: [], links: [], zoom: null }, // bảng suy luận (zoom null = tự chọn theo màn hình)
    grid: null,          // lưới loại trừ { columns: [{id,label}], cells: { "nghiPhạm|cột": "yes"|"no"|"maybe" } }; null = chưa dùng
    hintsUsed: { culprit: 0, motive: 0, method: 0 },
    timed: { log: [] },  // chế độ có đồng hồ: [{ t, p, l, q }] — mọi thứ khác tính lại từ nhật ký
    submission: null,    // { <phần>: lựa chọn, ..., submittedAt } — các phần theo partsOf(caseData)
                         // chế độ có đồng hồ: { h, proof: { [suspectId]: [clueId…] }, giveUp?, submittedAt }
    result: null,        // { score, max, parts }; chế độ có đồng hồ: { ending }
    updatedAt: null,
  };
}

function read(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }
}

function write(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    memoryFallback.set(key, value);
  }
}

function remove(key) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* bỏ qua */
  }
  memoryFallback.delete(key);
}

/** Chuyển tiến trình v1 sang v2: giữ nguyên các trường cũ, ghim → thẻ trên bảng. */
function migrateV1(old) {
  const p = { ...defaultProgress(), ...old };
  const pinned = Array.isArray(old.pinnedClues) ? old.pinnedClues : [];
  p.board = {
    cards: pinned.map((id, i) => ({
      id: `m${i}`,
      kind: 'clue',
      ref: id,
      x: 60 + (i % 5) * 230,
      y: 60 + Math.floor(i / 5) * 200,
    })),
    links: [],
    zoom: null,
  };
  delete p.pinnedClues;
  return p;
}

/** Đọc tiến trình; dữ liệu hỏng hoặc thiếu trường sẽ được bù bằng giá trị mặc định. */
export function loadProgress(caseId) {
  const base = defaultProgress();
  const raw = read(PREFIX + caseId);
  if (raw) {
    try {
      const saved = JSON.parse(raw);
      return {
        ...base,
        ...saved,
        board: { ...base.board, ...saved.board },
        hintsUsed: { ...base.hintsUsed, ...saved.hintsUsed },
        timed: { ...base.timed, ...saved.timed },
      };
    } catch {
      return base;
    }
  }
  // Chưa có v2 → thử chuyển từ v1
  const legacy = read(LEGACY_PREFIX + caseId);
  if (legacy) {
    try {
      const migrated = migrateV1(JSON.parse(legacy));
      saveProgress(caseId, migrated);
      remove(LEGACY_PREFIX + caseId);
      return migrated;
    } catch {
      /* dữ liệu cũ hỏng → bắt đầu mới */
    }
  }
  return base;
}

export function saveProgress(caseId, progress) {
  progress.updatedAt = new Date().toISOString();
  write(PREFIX + caseId, JSON.stringify(progress));
}

export function clearProgress(caseId) {
  remove(PREFIX + caseId);
  remove(LEGACY_PREFIX + caseId);
}
