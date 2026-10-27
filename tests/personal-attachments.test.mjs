import assert from 'node:assert/strict';
import {importPersonalFiles, getPersonalFile, deletePersonalFile, formatAttachmentSize, PERSONAL_ATTACHMENT_LIMITS} from '../frontend/src/personal-attachments.js';

let checks = 0;
async function check(name, run) { await run(); checks++; console.log('✓ ' + name); }
const file = (name, content, type = '') => Object.assign(new Blob([content], {type}), {name});
function memoryStore() {
  const blobs = new Map();
  return {blobs, async put(id, blob) { blobs.set(id, blob); }, async get(id) { return blobs.get(id) || null; }, async delete(id) { blobs.delete(id); }};
}

await check('text metadata and original blob are stored separately and retrieved intact', async () => {
  const store = memoryStore(), original = file('记录.txt', '完整原文件\n第二行', 'text/plain');
  const {attachments, errors} = await importPersonalFiles([original], {store});
  assert.deepEqual(errors, []);
  const attachment = attachments[0];
  assert.deepEqual(Object.keys(attachment).sort(), ['id', 'mime', 'name', 'size', 'stored', 'textPreview'].sort());
  assert.equal(attachment.stored, true);
  assert.equal(attachment.name, original.name);
  assert.equal(attachment.size, original.size);
  assert.equal(attachment.textPreview, '完整原文件\n第二行');
  assert.equal(await getPersonalFile(attachment.id, {store}), original);
  assert.equal(await (await getPersonalFile(attachment.id, {store})).text(), '完整原文件\n第二行');
});
await check('binary files retain all bytes without a text preview', async () => {
  const store = memoryStore(), original = file('图片.png', new Uint8Array([0, 255, 19, 0]), 'image/png');
  const {attachments} = await importPersonalFiles([original], {store});
  assert.equal('textPreview' in attachments[0], false);
  assert.deepEqual(new Uint8Array(await (await getPersonalFile(attachments[0].id, {store})).arrayBuffer()), new Uint8Array([0, 255, 19, 0]));
});
await check('text preview stops at 30000 characters while preserving the complete original', async () => {
  const store = memoryStore(), text = '甲'.repeat(30000) + '完整文件末尾';
  const {attachments} = await importPersonalFiles([file('long.md', text)], {store});
  assert.equal(attachments[0].textPreview, '甲'.repeat(30000));
  assert.equal(await (await getPersonalFile(attachments[0].id, {store})).text(), text);
});
await check('preview avoids a broken surrogate pair and never reads the whole oversized text', async () => {
  const original = file('emoji.txt', 'a'.repeat(29999) + '😀' + 'z'.repeat(100000), 'text/plain');
  let bytesRead = 0;
  const slice = original.slice.bind(original);
  original.slice = (start, end) => { bytesRead += end - start; return slice(start, end); };
  const {attachments} = await importPersonalFiles([original], {store: memoryStore()});
  assert.equal(attachments[0].textPreview, 'a'.repeat(29999));
  assert.ok(bytesRead < original.size);
  assert.ok(bytesRead <= 30003);
});
await check('only the first five selected files can be imported and every extra file has an error', async () => {
  const store = memoryStore();
  const result = await importPersonalFiles(Array.from({length: 7}, (_, i) => file(`${i}.txt`, 'x')), {store});
  assert.equal(result.attachments.length, 5);
  assert.deepEqual(result.errors.map(error => [error.name, error.code]), [['5.txt', 'too_many'], ['6.txt', 'too_many']]);
  assert.equal(store.blobs.size, 5);
  assert.equal(new Set(result.attachments.map(item => item.id)).size, 5);
});
await check('the 10 MB boundary is inclusive and oversized files never reach storage', async () => {
  const store = memoryStore(), max = PERSONAL_ATTACHMENT_LIMITS.bytes;
  const result = await importPersonalFiles([file('allowed.bin', new Uint8Array(max)), file('oversize.bin', new Uint8Array(max + 1))], {store});
  assert.equal(result.attachments.length, 1);
  assert.equal(result.attachments[0].name, 'allowed.bin');
  assert.deepEqual(result.errors.map(error => [error.name, error.code]), [['oversize.bin', 'too_large']]);
  assert.equal(store.blobs.size, 1);
});
await check('failed writes cannot produce success metadata and do not stop other selected files', async () => {
  const store = memoryStore(), put = store.put.bind(store);
  store.put = async (id, blob) => { if (blob.name === '失败.txt') { const error = new Error('quota'); error.name = 'QuotaExceededError'; throw error; } return put(id, blob); };
  const result = await importPersonalFiles([file('失败.txt', 'x'), file('成功.txt', 'y')], {store});
  assert.deepEqual(result.attachments.map(item => item.name), ['成功.txt']);
  assert.equal(result.errors[0].code, 'storage_failed');
  assert.match(result.errors[0].message, /空间不足/);
  assert.equal(store.blobs.size, 1);
});
await check('text read failures return an error and do not write or claim success', async () => {
  const original = file('不可读.txt', 'x', 'text/plain'), store = memoryStore();
  original.slice = () => ({arrayBuffer: async () => { throw new Error('read failed'); }});
  const result = await importPersonalFiles([original], {store});
  assert.deepEqual(result.attachments, []);
  assert.equal(result.errors[0].code, 'read_failed');
  assert.equal(store.blobs.size, 0);
});
await check('invalid files are rejected and empty selections are harmless', async () => {
  const store = memoryStore();
  assert.deepEqual(await importPersonalFiles([], {store}), {attachments: [], errors: []});
  const result = await importPersonalFiles([{name: 'not-a-file', size: 1}], {store});
  assert.equal(result.errors[0].code, 'invalid_file');
  assert.equal(result.attachments.length, 0);
});
await check('deletion removes bytes and missing records return null', async () => {
  const store = memoryStore(), {attachments} = await importPersonalFiles([file('delete.txt', 'x')], {store});
  await deletePersonalFile(attachments[0].id, {store});
  assert.equal(await getPersonalFile(attachments[0].id, {store}), null);
  assert.equal(await getPersonalFile('', {store}), null);
  assert.equal(store.blobs.size, 0);
});
await check('retrieval and deletion failures are surfaced instead of being reported as success', async () => {
  const store = {async get() { throw new Error('read storage failed'); }, async delete() { throw new Error('delete storage failed'); }};
  await assert.rejects(getPersonalFile('id', {store}), /read storage failed/);
  await assert.rejects(deletePersonalFile('id', {store}), /delete storage failed/);
});
await check('missing IndexedDB produces a concrete import error in Node', async () => {
  assert.equal(typeof globalThis.indexedDB, 'undefined');
  const result = await importPersonalFiles([file('local.txt', 'x')]);
  assert.deepEqual(result.attachments, []);
  assert.equal(result.errors[0].code, 'storage_failed');
  assert.match(result.errors[0].message, /无法使用本地附件存储/);
});
await check('size labels stay concise at common file boundaries', async () => {
  assert.deepEqual([0, 512, 1024, 1536, 1048576, 10485760, NaN].map(formatAttachmentSize), ['0 B', '512 B', '1 KB', '1.5 KB', '1 MB', '10 MB', '0 B']);
});

console.log(`\n${checks} attachment checks passed.`);
