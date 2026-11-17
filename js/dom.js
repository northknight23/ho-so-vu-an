/**
 * Tiện ích DOM nhỏ gọn.
 *
 * Quy ước quan trọng: KHÔNG dùng innerHTML với dữ liệu vụ án. Mọi nội dung
 * đi qua el()/rich() đều được chèn dưới dạng text node → an toàn khi sau này
 * có người viết vụ án mới chứa ký tự < > &.
 */

/**
 * Tạo phần tử: el('div', { class: 'x', onClick: fn, 'aria-label': '…' }, con1, con2…)
 * - props bắt đầu bằng "on" → gắn sự kiện
 * - class / text / dataset được xử lý riêng; còn lại thành attribute
 * - con có thể là chuỗi, Node, mảng, hoặc null/false (bị bỏ qua)
 */
export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'style' && typeof value === 'object') {
      // setProperty để hỗ trợ cả biến CSS (vd '--pct'), Object.assign không làm được
      for (const [prop, v] of Object.entries(value)) {
        if (prop.startsWith('--')) node.style.setProperty(prop, v);
        else node.style[prop] = v;
      }
    }
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, value);
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else node.append(child instanceof Node ? child : String(child));
  }
}

/** Xoá hết con và gắn nội dung mới. */
export function mount(target, ...children) {
  target.replaceChildren();
  append(target, children);
  return target;
}

/**
 * Định dạng chữ đơn giản và an toàn trong văn bản vụ án:
 *   **đậm**   ~~gạch bỏ~~   _nghiêng_
 * Trả về mảng Node để chèn vào phần tử cha.
 */
export function rich(text) {
  const out = [];
  const re = /\*\*(.+?)\*\*|~~(.+?)~~|_(.+?)_/g;
  let last = 0;
  let m;
  const str = String(text ?? '');
  while ((m = re.exec(str))) {
    if (m.index > last) out.push(document.createTextNode(str.slice(last, m.index)));
    if (m[1] !== undefined) out.push(el('strong', { text: m[1] }));
    else if (m[2] !== undefined) out.push(el('s', { class: 'letter__strike', text: m[2] }));
    else out.push(el('em', { text: m[3] }));
    last = re.lastIndex;
  }
  if (last < str.length) out.push(document.createTextNode(str.slice(last)));
  return out;
}

/** Đoạn văn <p> có định dạng rich(). */
export const para = (text, props = {}) => el('p', props, rich(text));

/** Chữ cái đầu của tên gọi (từ cuối cùng) — dùng làm avatar trong khung chat. */
export function initials(name) {
  const parts = String(name).trim().split(/\s+/);
  return (parts[parts.length - 1] || '?').charAt(0).toUpperCase();
}
