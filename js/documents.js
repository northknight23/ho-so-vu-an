/**
 * Hiển thị manh mối dạng "tài liệu" bằng HTML/CSS thay vì ảnh.
 *
 * Mỗi giá trị của clue.detail.type có một hàm render riêng. Muốn thêm loại mới:
 *   1. viết hàm renderXxx(detail) trả về một phần tử
 *   2. đăng ký vào RENDERERS bên dưới
 *   3. thêm tên loại vào DOC_TYPES trong caseLoader.js
 *   4. viết CSS .doc--xxx trong style.css (mục 7)
 * Cấu trúc dữ liệu của từng loại được mô tả trong ARCHITECTURE.md.
 */
import { el, para, rich, initials } from './dom.js';

const money = new Intl.NumberFormat('vi-VN');
const fmtMoney = (v) => (typeof v === 'number' ? `${money.format(v)}đ` : v);

/** Danh sách cặp nhãn – giá trị dạng <dl>. */
function metaList(meta) {
  if (!meta || !meta.length) return null;
  return el('dl', { class: 'meta-list' },
    meta.map((m) => [el('dt', { text: m.label }), el('dd', {}, rich(m.value))]));
}

/** Đoạn văn bản: chuỗi → <p>; { list: [...] } → <ul>. */
function blocks(items) {
  return (items || []).map((item) =>
    typeof item === 'string'
      ? para(item)
      : el('ul', {}, (item.list || []).map((li) => el('li', {}, rich(li)))));
}

// ---------- text: biên bản, báo cáo đánh máy ----------
function renderText(d) {
  return el('article', { class: 'doc doc--text' },
    d.org && el('div', { class: 'doc__org', text: d.org }),
    d.heading && el('h3', { class: 'doc__heading', text: d.heading }),
    metaList(d.meta),
    blocks(d.paragraphs));
}

// ---------- chat: tin nhắn kiểu Zalo ----------
function renderChat(d) {
  const list = el('div', { class: 'chat__list' });
  for (const m of d.messages || []) {
    if (m.divider) {
      list.append(el('div', { class: 'chat__divider', text: m.divider }));
      continue;
    }
    if (m.text) {
      list.append(el('div', { class: `chat__msg chat__msg--${m.from === 'me' ? 'me' : 'them'}` },
        el('p', {}, rich(m.text)),
        m.time && el('span', { class: 'chat__time', text: m.time })));
    }
    // Dòng trạng thái kiểu "Đã xem 20:41" (có thể đứng riêng, không kèm tin nhắn)
    if (m.status) list.append(el('div', { class: 'chat__status', text: m.status }));
  }
  return el('article', { class: 'doc doc--chat', 'aria-label': `Đoạn chat với ${d.contact}` },
    el('div', { class: 'chat__screen' },
      el('div', { class: 'chat__bar' },
        el('div', { class: 'chat__avatar', 'aria-hidden': 'true', text: d.avatar || initials(d.contact) }),
        el('div', {},
          el('div', { class: 'chat__contact', text: d.contact }),
          d.owner && el('div', { class: 'chat__owner', text: d.owner }))),
      list));
}

// ---------- receipt: hóa đơn in nhiệt ----------
function renderReceipt(d) {
  const rule = () => el('hr', { class: 'receipt__rule' });
  const row = (label, value, cls = '') => el('div', { class: `receipt__row ${cls}` },
    el('span', {}, rich(label)), el('span', { text: fmtMoney(value) }));

  return el('article', { class: 'doc doc--receipt' },
    el('div', { class: 'receipt__shop', text: d.shop }),
    (d.lines || []).map((l) => el('div', { class: 'receipt__center', text: l })),
    rule(),
    d.title && el('div', { class: 'receipt__center', style: { fontWeight: 600 }, text: d.title }),
    (d.meta || []).map((m) => row(m.label, m.value)),
    d.items && [rule(),
      d.items.map((it) => el('div', {},
        el('span', { class: 'receipt__item-name', text: it.name }),
        row(it.qty !== undefined ? `  ${it.qty} x ${fmtMoney(it.unit ?? '')}` : '', it.price)))],
    (d.summary || []).length ? [rule(), d.summary.map((s) => row(s.label, s.value))] : null,
    d.total && [rule(), row(d.total.label, d.total.value, 'receipt__total')],
    (d.footer || []).length ? [rule(), d.footer.map((f) => el('div', { class: 'receipt__center', text: f }))] : null);
}

// ---------- letter: thư tay / trang sổ tay (font viết tay) ----------
function renderLetter(d) {
  return el('article', { class: `doc doc--letter${d.variant === 'notebook' ? ' is-notebook' : ''}` },
    d.date && el('p', { class: 'letter__date' }, rich(d.date)),
    d.greeting && el('p', { style: { textIndent: 0 } }, rich(d.greeting)),
    (d.body || []).map((t) => para(t)),
    d.closing && el('p', { style: { textIndent: 0, marginTop: '8px' } }, rich(d.closing)),
    d.signature && el('div', { class: 'letter__signature' }, rich(d.signature)));
}

// ---------- newspaper: bài báo ----------
function renderNewspaper(d) {
  return el('article', { class: 'doc doc--newspaper' },
    el('div', { class: 'news__mast', text: d.paper }),
    el('div', { class: 'news__dateline' },
      el('span', { text: d.section || '' }), el('span', { text: d.date || '' })),
    el('h3', { class: 'news__headline', text: d.headline }),
    d.lead && para(d.lead, { class: 'news__lead' }),
    d.byline && el('div', { class: 'news__byline', text: d.byline }),
    el('div', { class: 'news__body' }, (d.body || []).map((t) => para(t))));
}

// ---------- notice: thông báo hành chính có con dấu ----------
function renderNotice(d) {
  return el('article', { class: 'doc doc--notice' },
    el('div', { class: 'notice__header' },
      el('div', {},
        (d.org || []).map((line, i) => el(i === (d.org.length - 1) ? 'strong' : 'div', { text: line })),
        d.number && el('div', { class: 'notice__no', text: d.number })),
      el('div', {},
        el('strong', { text: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM' }),
        el('u', {}, el('strong', { text: 'Độc lập – Tự do – Hạnh phúc' })))),
    d.date && el('div', { class: 'notice__date', text: d.date }),
    el('div', { class: 'notice__title', text: d.title }),
    d.subtitle && el('div', { class: 'notice__subtitle', text: d.subtitle }),
    el('div', { class: 'notice__body' }, blocks(d.body)),
    el('div', { class: 'notice__sign' },
      el('strong', { text: d.signerTitle || '' }),
      d.stamp && el('div', { class: 'notice__stamp', 'aria-hidden': 'true', text: d.stamp }),
      el('div', { class: 'notice__signer', text: d.signer || '' })));
}

// ---------- table: bảng nhật ký in từ hệ thống ----------
function renderTable(d) {
  return el('article', { class: 'doc doc--table' },
    d.heading && el('div', { class: 'log__heading', text: d.heading }),
    d.meta && el('div', { class: 'log__meta', text: d.meta }),
    el('div', { class: 'log__scroll', tabindex: '0' },
      el('table', { class: 'log__table' },
        el('thead', {}, el('tr', {}, d.columns.map((c) => el('th', { scope: 'col', text: c })))),
        el('tbody', {}, d.rows.map((r) => el('tr', {}, r.map((cell) => el('td', {}, rich(cell)))))))),
    (d.footnotes || []).map((f) => el('p', { class: 'log__foot' }, rich(f))));
}

const RENDERERS = {
  text: renderText,
  chat: renderChat,
  receipt: renderReceipt,
  letter: renderLetter,
  newspaper: renderNewspaper,
  notice: renderNotice,
  table: renderTable,
};

/** Hiển thị phần chi tiết của một manh mối. */
export function renderDocument(detail) {
  const fn = RENDERERS[detail.type];
  return fn ? fn(detail) : el('p', { text: `Không hiển thị được loại tài liệu "${detail.type}".` });
}
