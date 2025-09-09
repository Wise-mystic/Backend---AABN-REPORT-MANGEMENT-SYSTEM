const store = new Map();

export function setCache(key, value, ttlMs = 30000) {
  const expires = Date.now() + ttlMs;
  store.set(key, { value, expires });
}

export function getCache(key) {
  const item = store.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    store.delete(key);
    return null;
  }
  return item.value;
}


