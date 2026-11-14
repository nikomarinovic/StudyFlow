/* 24-hour ("military") time inputs everywhere.
   Native <input type="time"> follows the device locale and shows AM/PM on many phones,
   so every time input is swapped for a masked HH:MM text field. */
(() => {
  const PATTERN = '([01][0-9]|2[0-3]):[0-5][0-9]';
  function format(raw) {
    const value = raw.replace(/[^\d:]/g, '').slice(0, 5);
    if (value.includes(':')) {
      const [hours, minutes = ''] = value.split(':');
      return hours.slice(0, 2) + ':' + minutes.slice(0, 2);
    }
    const digits = value.slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ':' + digits.slice(2);
  }
  function normalise(value) {
    const m = String(value || '').match(/^(\d{1,2}):?(\d{2})?/);
    if (!m) return '';
    let h = Math.min(23, Number(m[1])), min = Math.min(59, Number(m[2] || 0));
    return String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0');
  }
  function enhance(input) {
    if (input.dataset.military === '1') return;
    if (input.type === 'time') {
      const value = input.value;
      input.type = 'text';
      input.value = value;
    } else if (!input.classList.contains('military-time')) return;
    input.dataset.military = '1';
    input.classList.add('military-time');
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'off');
    input.setAttribute('maxlength', '5');
    input.setAttribute('pattern', PATTERN);
    input.setAttribute('placeholder', input.getAttribute('placeholder') || 'HH:MM');
    input.setAttribute('title', '24-hour time, e.g. 07:30 or 18:45');
    input.addEventListener('input', e => {
      if (e.inputType && e.inputType.startsWith('delete')) return;
      const next = format(input.value);
      if (next !== input.value) input.value = next;
    });
    input.addEventListener('blur', () => { if (input.value) input.value = normalise(input.value); });
  }
  const scan = root => (root.querySelectorAll ? root : document).querySelectorAll('input[type="time"], input.military-time').forEach(enhance);
  const start = () => {
    scan(document);
    new MutationObserver(list => list.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) { if (n.matches?.('input')) enhance(n); scan(n); } }))).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
