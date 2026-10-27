const DATABASE_NAME = 'chengxiaoyou-personal-attachments';
const STORE_NAME = 'files';
export const PERSONAL_ATTACHMENT_LIMITS = Object.freeze({count: 5, bytes: 10 * 1024 * 1024, previewCharacters: 30000});

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('当前浏览器无法使用本地附件存储。'));
      return;
    }
    let settled = false;
    const request = indexedDB.open(DATABASE_NAME, 1);
    const fail = error => { if (!settled) { settled = true; reject(error); } };
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, {keyPath: 'id'});
    };
    request.onerror = () => fail(request.error || new Error('无法打开本地附件存储。'));
    request.onblocked = () => fail(new Error('本地附件存储正被其他页面占用，请关闭旧页面后重试。'));
    request.onsuccess = () => {
      if (settled) { request.result.close(); return; }
      settled = true;
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
  });
}

async function transact(mode, operation) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode);
      let result;
      // Only a committed transaction counts as stored; request success alone does not.
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = () => reject(transaction.error || new Error('附件存储事务已取消。'));
      transaction.onerror = () => reject(transaction.error || new Error('附件存储失败。'));
      const request = operation(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => { result = request.result; };
    });
  } finally {
    db.close();
  }
}

const indexedFileStore = {
  put: (id, blob) => transact('readwrite', store => store.put({id, blob})),
  get: async id => (await transact('readonly', store => store.get(id)))?.blob || null,
  delete: id => transact('readwrite', store => store.delete(id)),
};

function isTextFile(file) {
  const mime = (file.type || '').split(';')[0].toLowerCase();
  return mime.startsWith('text/') || /^(application\/(json|ld\+json|xml|javascript|x-javascript|yaml|x-yaml|toml))$/.test(mime)
    || ((!mime || mime === 'application/octet-stream') && /\.(txt|md|markdown|csv|tsv|json|jsonl|xml|html?|css|js|mjs|ts|tsx|jsx|py|sh|sql|ya?ml|toml|log)$/i.test(file.name || ''));
}

async function textPreview(blob) {
  const limit = PERSONAL_ATTACHMENT_LIMITS.previewCharacters;
  const decoder = new TextDecoder('utf-8');
  let text = '', offset = 0;
  // Bound each read by the remaining characters, and stop without reading the rest of the file.
  while (offset < blob.size && text.length < limit) {
    const end = Math.min(blob.size, offset + Math.min(8192, limit - text.length));
    const bytes = await blob.slice(offset, end).arrayBuffer();
    text += decoder.decode(bytes, {stream: end < blob.size});
    offset = end;
  }
  text = text.slice(0, limit);
  // Do not leave half of an emoji at the truncation boundary.
  if (/[\uD800-\uDBFF]$/.test(text)) text = text.slice(0, -1);
  return text;
}

function newId() {
  return 'personal-file-' + (globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
}

function failure(name, code, message) { return {name, code, message}; }
function storageMessage(error) {
  if (error?.name === 'QuotaExceededError') return '本地存储空间不足，请删除不再需要的附件后重试。';
  if (error?.name === 'SecurityError') return '浏览器禁止访问本地附件存储，请检查浏览器权限。';
  return error?.message || '本地附件存储失败，请重试。';
}

/** The optional store implements async put(id, Blob), get(id), and delete(id). */
export async function importPersonalFiles(files, {store = indexedFileStore} = {}) {
  const attachments = [], errors = [];
  let selected;
  try { selected = Array.from(files || []); }
  catch { return {attachments, errors: [failure('', 'invalid_files', '无法读取选择的文件，请重新选择。')]}; }
  for (const [index, file] of selected.entries()) {
    const name = typeof file?.name === 'string' && file.name.trim() ? file.name : '未命名附件';
    if (index >= PERSONAL_ATTACHMENT_LIMITS.count) {
      errors.push(failure(name, 'too_many', `每次最多添加 ${PERSONAL_ATTACHMENT_LIMITS.count} 个附件。`));
      continue;
    }
    if (!(file instanceof Blob)) {
      errors.push(failure(name, 'invalid_file', '这个附件不是有效文件，请重新选择。'));
      continue;
    }
    if (file.size > PERSONAL_ATTACHMENT_LIMITS.bytes) {
      errors.push(failure(name, 'too_large', '单个附件不能超过 10 MB。'));
      continue;
    }
    let preview;
    if (isTextFile(file)) {
      try { preview = await textPreview(file); }
      catch { errors.push(failure(name, 'read_failed', '无法读取这个文本文件，请重新选择。')); continue; }
    }
    const id = newId();
    try { await store.put(id, file); }
    catch (error) { errors.push(failure(name, 'storage_failed', storageMessage(error))); continue; }
    attachments.push({id, name, size: file.size, mime: file.type || 'application/octet-stream', stored: true, ...(preview === undefined ? {} : {textPreview: preview})});
  }
  return {attachments, errors};
}

export async function getPersonalFile(id, {store = indexedFileStore} = {}) {
  if (typeof id !== 'string' || !id.trim()) return null;
  const blob = await store.get(id);
  return blob instanceof Blob ? blob : null;
}

export async function deletePersonalFile(id, {store = indexedFileStore} = {}) {
  if (typeof id !== 'string' || !id.trim()) return;
  await store.delete(id);
}

export function formatAttachmentSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const unit = bytes < 1024 * 1024 ? 'KB' : 'MB';
  const value = bytes / (unit === 'KB' ? 1024 : 1024 * 1024);
  return `${Number(value.toFixed(1))} ${unit}`;
}
