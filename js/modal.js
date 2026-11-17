/**
 * Modal dùng chung (một <dialog id="modal"> duy nhất trong index.html).
 *
 * openModal() khi modal đang mở sẽ THAY nội dung chứ không mở chồng.
 * Phần tử có thuộc tính data-close sẽ đóng modal khi bấm.
 */
import { el, mount, para } from './dom.js';

const modal = () => document.getElementById('modal');
let onModalClose = null;

/** Gắn sự kiện cho modal — gọi một lần khi khởi động. */
export function initModal() {
  const dlg = modal();
  dlg.addEventListener('click', (e) => {
    // Bấm ra ngoài khung (vào backdrop) hoặc vào nút có data-close → đóng
    if (e.target === dlg || e.target.closest('[data-close]')) dlg.close();
  });
  dlg.addEventListener('close', () => {
    const cb = onModalClose;
    onModalClose = null;
    document.body.style.overflow = '';
    if (cb) cb(dlg.returnValue);
  });
}

/**
 * Mở (hoặc thay nội dung) modal.
 * @param {{title:string, body:Node|Node[], foot?:Node|Node[], onClose?:Function, wide?:boolean}} opts
 */
export function openModal({ title, body, foot = [], onClose = null, wide = false }) {
  const dlg = modal();
  document.getElementById('modal-title').textContent = title;
  mount(document.getElementById('modal-body'), body);
  mount(document.getElementById('modal-foot'), foot);
  dlg.classList.toggle('modal--wide', wide);
  onModalClose = onClose;
  if (!dlg.open) {
    dlg.returnValue = '';
    dlg.showModal();
    document.body.style.overflow = 'hidden';
  }
  document.getElementById('modal-body').scrollTop = 0;
}

export function closeModal() {
  if (modal().open) modal().close();
}

/** Hộp xác nhận. Trả về Promise<boolean>. */
export function confirmDialog({ title, message, okLabel = 'Đồng ý', cancelLabel = 'Huỷ' }) {
  return new Promise((resolve) => {
    let answered = false;
    const finish = (val) => { answered = true; resolve(val); closeModal(); };
    openModal({
      title,
      body: (Array.isArray(message) ? message : [message]).map((m) => para(m)),
      foot: [
        el('button', { type: 'button', class: 'btn btn--paper', onClick: () => finish(false) }, cancelLabel),
        el('button', { type: 'button', class: 'btn btn--primary', onClick: () => finish(true) }, okLabel),
      ],
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}
