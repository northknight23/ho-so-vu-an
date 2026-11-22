/**
 * Chế độ có đồng hồ: màn buộc tội kèm chứng minh và màn kết cục.
 *
 * Đáp án là cặp (h, π) — docs/case-03-logic.md mục 2.4:
 *   h  = người bị buộc tội
 *   π  = với MỖI nghi phạm, tập manh mối người chơi đưa ra:
 *        - với h: chứng minh có tội (phải chứa đủ các manh mối then chốt)
 *        - với người khác: chứng minh vô tội (phải chứa một tập minh oan hợp lệ)
 * Hợp lệ(h, π) ⇔ h = hung thủ ∧ π(h) ⊇ K ∧ ∀y ≠ h: ∃P ∈ proofs[y]: P ⊆ π(y)
 * Mọi manh mối trong π phải là manh mối người chơi đã thực sự có (giao diện chỉ cho chọn những cái đó).
 *
 * Dữ liệu chấm (hung thủ, K, proofs, kết cục) nằm trong lời giải mã hóa,
 * chỉ giải mã sau khi đã buộc tội — giống cơ chế nộp bài của vụ thường.
 */
import { el, mount, para, rich } from './dom.js';
import { confirmDialog } from './modal.js';
import { allClues, clueNo } from './selectors.js';
import { renderSolutionArticle } from './ui.js';

const root = () => document.getElementById('app');

/** Chọn kết cục cho một lần buộc tội. Trả về khóa kết cục. */
export function gradeAccusation(solution, submission, heldIds) {
  const T = solution.timed;
  if (submission.giveUp) return 'timeout';
  if (submission.h !== T.culprit) return `wrong:${submission.h}`;
  const held = new Set(heldIds);
  const proof = submission.proof || {};
  const subset = (P, Q) => P.every((x) => Q.includes(x));
  const guiltOk = subset(T.keys, proof[T.culprit] || []);
  const othersOk = Object.entries(T.proofs).every(([y, options]) => options.some((P) => subset(P, proof[y] || [])));
  const usedOk = Object.values(proof).flat().every((id) => held.has(id));
  if (guiltOk && othersOk && usedOk) return 'good';
  const missing = T.keys.filter((k) => !held.has(k));
  return missing.length ? `missing:${missing[0]}` : 'unproven';
}

/** Nội dung kết cục theo khóa. */
export function endingFor(solution, key) {
  const E = solution.timed.endings;
  const [kind, arg] = key.split(':');
  if (kind === 'wrong') return E.wrong?.[arg] || E.unproven;
  if (kind === 'missing') return E.missing?.[arg] || E.unproven;
  return E[kind] || E.unproven;
}

// ---------------------------------------------------------------------
// Màn buộc tội
// ---------------------------------------------------------------------
export function renderAccuse(app, actions) {
  const { caseData: c, progress: p } = app;
  document.body.classList.remove('has-tabbar');
  const clues = allClues(app);
  const draft = { h: p.draft?.h || '', proof: { ...(p.draft?.proof || {}) } };
  const msg = el('span', { class: 'submit-bar__msg', text: 'Chỉ được buộc tội một lần. Tòa chỉ chấp nhận khi mọi người khác đều đã được minh oan bằng chứng cứ.' });
  const save = () => actions.saveDraft({ h: draft.h, proof: draft.proof });

  const rowFor = (s) => {
    const guilty = draft.h === s.id;
    const chosen = new Set(draft.proof[s.id] || []);
    return el('div', { class: `proof-row${guilty ? ' is-guilty' : ''}` },
      el('div', { class: 'proof-row__who' },
        el('img', { src: s.portrait, alt: '' }),
        el('div', {},
          el('strong', { text: s.name }),
          el('span', { text: guilty ? 'Chứng minh CÓ TỘI bằng:' : 'Minh oan bằng:' }))),
      el('div', { class: 'proof-row__clues' }, clues.map((cl) => {
        const input = el('input', {
          type: 'checkbox',
          checked: chosen.has(cl.id),
          onChange: (e) => {
            const set = new Set(draft.proof[s.id] || []);
            if (e.target.checked) set.add(cl.id); else set.delete(cl.id);
            draft.proof[s.id] = [...set];
            save();
          },
        });
        return el('label', { class: 'proof-chip', title: cl.title }, input, el('span', { text: clueNo(cl) }));
      })));
  };

  const rows = el('div', { class: 'proof-rows' });
  const drawRows = () => { rows.replaceChildren(...c.suspects.map(rowFor)); };
  drawRows();

  const culprit = el('div', { class: 'options options--suspects' }, c.suspects.map((s) => {
    const input = el('input', {
      type: 'radio',
      name: 'h',
      value: s.id,
      checked: draft.h === s.id,
      onChange: () => { draft.h = s.id; save(); drawRows(); },
    });
    return el('label', { class: 'option' }, input, el('span', { class: 'option__radio', 'aria-hidden': 'true' }),
      el('img', { src: s.portrait, alt: '' }), el('span', { text: s.name }));
  }));

  const legend = el('details', { class: 'paper-card proof-legend' },
    el('summary', { text: `Danh sách ${clues.length} manh mối bạn đang có` }),
    el('ul', {}, clues.map((cl) => el('li', {}, el('strong', { text: `${clueNo(cl)} ` }), cl.title))));

  const submit = async () => {
    if (!draft.h) {
      msg.textContent = 'Hãy chọn người bị buộc tội.';
      msg.classList.add('is-error');
      return;
    }
    const empty = c.suspects.filter((s) => !(draft.proof[s.id] || []).length);
    if (empty.length) {
      msg.textContent = `Còn ${empty.length} người chưa có chứng cứ: ${empty.map((s) => s.name).join(', ')}.`;
      msg.classList.add('is-error');
      return;
    }
    const s = c.suspects.find((x) => x.id === draft.h);
    const ok = await confirmDialog({
      title: `Buộc tội ${s.name}?`,
      message: ['Hồ sơ sẽ được chuyển cho Viện kiểm sát. Không thể rút lại.'],
      okLabel: 'Buộc tội',
      cancelLabel: 'Xem lại',
    });
    if (ok) actions.accuse({ h: draft.h, proof: draft.proof });
  };

  const giveUp = async () => {
    const ok = await confirmDialog({
      title: 'Thả tất cả nghi phạm?',
      message: ['Bạn chấp nhận không đủ căn cứ buộc tội ai. Vụ án sẽ khép lại.'],
      okLabel: 'Thả tất cả',
      cancelLabel: 'Quay lại',
    });
    if (ok) actions.accuse({ giveUp: true });
  };

  mount(root(), el('section', { class: 'panel' },
    el('h2', { class: 'panel__title', text: 'Buộc tội' }),
    el('p', { class: 'panel__intro', text: 'Chọn người bị buộc tội. Sau đó, với từng nghi phạm, chọn các manh mối chứng minh họ vô tội — hoặc, với người bị buộc tội, chứng minh có tội. Đoán đúng mà thiếu chứng cứ thì nghi phạm vẫn được thả.' }),
    el('fieldset', { class: 'question' }, el('legend', {}, el('span', { class: 'question__no', text: '1.' }), 'Ai là hung thủ?'), culprit),
    el('fieldset', { class: 'question' }, el('legend', {}, el('span', { class: 'question__no', text: '2.' }), 'Chứng cứ cho từng người'), legend, rows),
    el('div', { class: 'submit-bar' },
      el('button', { type: 'button', class: 'btn btn--primary', onClick: submit }, 'Buộc tội'),
      el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go(`#/case/${p.lastTab || 'investigate'}`) }, 'Quay lại hồ sơ'),
      el('button', { type: 'button', class: 'btn btn--ghost', onClick: giveUp }, 'Thả tất cả'),
      msg)));
}

// ---------------------------------------------------------------------
// Màn kết cục
// ---------------------------------------------------------------------
export function renderEnding(app, solution, actions) {
  const { caseData: c, progress: p } = app;
  document.body.classList.remove('has-tabbar');
  const key = p.result.ending;
  const ending = endingFor(solution, key);
  const good = key === 'good';
  const accused = c.suspects.find((s) => s.id === p.submission.h);

  mount(root(), el('section', { class: 'panel' },
    el('div', { class: `paper-card ending ${good ? 'is-good' : 'is-bad'}` },
      el('div', { class: 'ending__tag', text: good ? 'KẾT CỤC ĐÚNG' : 'KẾT CỤC XẤU' }),
      el('h2', { class: 'ending__title', text: ending.title }),
      accused && el('p', { class: 'ending__who' }, rich(`Bạn đã buộc tội **${accused.name}**.`)),
      (ending.text || []).map((t) => para(t))),
    renderSolutionArticle(app, solution, actions),
    el('div', { class: 'result-actions' },
      el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go(`#/case/${p.lastTab || 'overview'}`) }, 'Xem lại hồ sơ'),
      el('button', { type: 'button', class: 'btn btn--ghost', onClick: () => actions.go('#/') }, 'Về trang bìa'),
      el('button', { type: 'button', class: 'btn btn--primary', onClick: () => actions.reset() }, 'Chơi lại từ đầu'))));
}
