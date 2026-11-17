/**
 * Hệ thống gợi ý 3 cấp cho từng phần đáp án (mỗi câu hỏi trong phần nộp kết luận).
 *
 * - Cấp 1 mơ hồ → cấp 2 rõ hơn → cấp 3 gần như chỉ thẳng; phải mở lần lượt.
 * - Mỗi cấp trừ điểm theo caseData.hintCosts (cộng dồn), chỉ trừ vào phần tương ứng
 *   (xem gradeSubmission trong answer.js).
 * - Nội dung gợi ý được mã hóa trong JSON, chỉ giải mã khi người chơi đã mở cấp đó.
 */
import { el, para, rich } from './dom.js';
import { openModal, confirmDialog } from './modal.js';
import { partsOf, decodeHint, hintPenalty } from './answer.js';

const LEVEL_NAMES = ['Mơ hồ', 'Rõ hơn', 'Gần như chỉ thẳng'];

export function openHints(app, actions) {
  const { caseData: c, progress: p } = app;
  const costs = c.hintCosts || [];
  const locked = Boolean(p.submission);

  const section = (part) => {
    const payloads = c.hints?.[part] || [];
    const used = Math.min(p.hintsUsed[part] || 0, payloads.length);
    const penalty = hintPenalty(costs, used);

    const revealed = [];
    for (let i = 0; i < used; i++) {
      let text;
      try {
        text = decodeHint(c.id, c.answer.salt, part, i, payloads[i]);
      } catch {
        text = '(Không giải mã được gợi ý này.)';
      }
      revealed.push(el('li', { class: 'hint__item' },
        el('span', { class: 'hint__level', text: `Cấp ${i + 1} · ${LEVEL_NAMES[i] || ''}` }),
        el('p', {}, rich(text))));
    }

    let action = null;
    if (used < payloads.length && !locked) {
      const cost = costs[used] ?? 0;
      action = el('button', {
        type: 'button',
        class: 'btn btn--paper btn--small',
        onClick: async () => {
          const ok = await confirmDialog({
            title: `Mở gợi ý cấp ${used + 1}?`,
            message: [
              `Gợi ý cho câu “${c.questions[part].prompt}” — mức “${LEVEL_NAMES[used] || ''}”.`,
              `Nếu bạn trả lời đúng phần này, điểm của nó sẽ bị trừ thêm **${cost} điểm**.`,
            ],
            okLabel: `Mở gợi ý (−${cost})`,
            cancelLabel: 'Thôi',
          });
          if (ok) actions.useHint(part);
          openHints(app, actions); // mở lại bảng gợi ý (đã cập nhật)
        },
      }, `💡 Mở gợi ý cấp ${used + 1} (−${cost} điểm)`);
    } else if (used >= payloads.length && payloads.length) {
      action = el('p', { class: 'hint__done', text: 'Đã mở hết gợi ý cho phần này.' });
    }

    return el('section', { class: 'hint' },
      el('div', { class: 'hint__head' },
        el('h3', { class: 'hint__title', text: c.questions[part].prompt }),
        el('span', { class: `hint__cost${penalty ? ' is-used' : ''}`, text: penalty ? `−${penalty} điểm` : 'Chưa dùng' })),
      revealed.length ? el('ol', { class: 'hint__list' }, revealed) : null,
      action);
  };

  openModal({
    title: 'Gợi ý',
    body: [
      para(locked
        ? 'Bạn đã nộp kết luận. Đây là những gợi ý bạn đã mở trong lượt chơi này.'
        : `Mỗi phần có 3 cấp gợi ý, mở lần lượt. Cấp càng cao càng rõ và trừ càng nhiều điểm (${costs.map((x) => `−${x}`).join(' / ')}), chỉ trừ vào phần tương ứng.`,
      { class: 'hint__intro' }),
      partsOf(c).map(section),
    ],
    foot: el('button', { type: 'button', class: 'btn btn--paper', 'data-close': true }, 'Đóng'),
  });
}
