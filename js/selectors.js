/**
 * Các hàm "chọn dữ liệu" dùng chung, chỉ đọc từ `app`, không đổi state.
 *
 * Manh mối có 3 nguồn:
 *  - caseData.clues          — công khai, có từ đầu
 *  - app.unlocked.clues      — mở khóa khi trình đúng bằng chứng lúc thẩm vấn
 *  - app.revealedClues       — sau khi nộp bài, lời giải tiết lộ nốt các manh mối bị khóa
 * Mọi chỗ hiển thị danh sách manh mối phải đi qua allClues() để không sót nguồn nào.
 */

/** Gán số thứ tự MM-xx cho manh mối công khai (manh mối bị khóa tự mang trường "no"). */
export function numberBaseClues(caseData) {
  caseData.clues.forEach((c, i) => { if (c.no === undefined) c.no = i + 1; });
}

/** Toàn bộ manh mối người chơi đang được thấy, sắp theo số thứ tự. */
export function allClues(app) {
  const seen = new Set();
  const list = [];
  const extra = [...(app.unlocked?.clues || []), ...(app.revealedClues || [])];
  for (const c of [...app.caseData.clues, ...extra]) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    list.push(c);
  }
  return list.sort((a, b) => a.no - b.no);
}

export const findClue = (app, id) => allClues(app).find((c) => c.id === id);

export const clueNo = (clue) => `MM-${String(clue.no).padStart(2, '0')}`;

/** Số manh mối bị khóa mà người chơi chưa mở được. */
export function lockedRemaining(app) {
  if (app.progress.submission) return 0;
  return Math.max(0, (app.caseData.lockedClues || 0) - (app.unlocked?.clues.length || 0));
}

/** Tổng số gợi ý đã mở. */
export function hintsUsedTotal(app) {
  return Object.values(app.progress.hintsUsed || {}).reduce((s, v) => s + (v || 0), 0);
}
