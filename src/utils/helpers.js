export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function debounce(fn, delay) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export function pluralize(count, singular, plural) {
  return count === 1 ? singular : plural || `${singular}s`;
}

export function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key];
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export function sumBy(arr, fn) {
  return arr.reduce((acc, item) => acc + fn(item), 0);
}

export function marketOpen() {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const time = hour * 100 + minute;

  // Regular US market hours: 9:30 AM - 4:00 PM ET = 13:30-20:00 UTC
  if (day === 0 || day === 6) return false;
  return time >= 1330 && time < 2000;
}

export function generateId() {
  return uid();
}
