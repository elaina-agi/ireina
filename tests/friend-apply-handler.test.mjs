import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from '../src/friends/handler.js';
import api from '../api/friend-apply.js';
import { validateApplication, LIMITS, APPLY_PATH } from '../src/friends/validate.js';

const ORIGIN = 'https://blog.example.invalid';
const URL_ = ORIGIN + APPLY_PATH;
const env = (extra = {}) => ({ RESEND_API_KEY: 're_test', TURNSTILE_SECRET_KEY: 'secret', MAIL_TO: 'owner@example.invalid', MAIL_FROM: 'Friends <noreply@example.invalid>', ...extra });
const good = { name: '测试站', url: 'https://friend.example.invalid', avatar: 'https://friend.example.invalid/a.png', desc: '一个测试站点', email: 'friend@example.invalid', token: 'tok' };
const post = (body, headers = {}) => new Request(URL_, { method: 'POST', headers: { Origin: ORIGIN, 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.7', ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) });
function fakeFetch({ captcha = true, resendStatus = 200 } = {}) {
  const calls = [];
  const impl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    if (url.includes('siteverify')) return Response.json({ success: captcha });
    return new Response(JSON.stringify({ id: 'x' }), { status: resendStatus });
  };
  return { impl, calls };
}

test('valid application verifies captcha then sends mail with reply-to', async () => {
  const { impl, calls } = fakeFetch();
  const res = await handle(post(good), env(), impl);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0].body, { secret: 'secret', response: 'tok', remoteip: '203.0.113.7' });
  assert.equal(calls[1].url, 'https://api.resend.com/emails');
  assert.equal(calls[1].init.headers.Authorization, 'Bearer re_test');
  assert.equal(calls[1].body.reply_to, 'friend@example.invalid');
  assert.deepEqual(calls[1].body.to, ['owner@example.invalid']);
  assert.equal(calls[1].body.subject, '[友链申请] 测试站');
  assert.match(calls[1].body.text, /https:\/\/friend\.example\.invalid\/a\.png/);
});

test('other origins and methods are rejected without any outbound call', async () => {
  const { impl, calls } = fakeFetch();
  assert.equal((await handle(post(good, { Origin: 'https://evil.example.invalid' }), env(), impl)).status, 403);
  assert.equal((await handle(new Request(URL_, { method: 'POST', body: JSON.stringify(good) }), env(), impl)).status, 403);
  assert.equal((await handle(new Request(URL_, { headers: { Origin: ORIGIN } }), env(), impl)).status, 405);
  assert.equal(calls.length, 0);
});

test('origin is compared with the host the visitor used, so preview and local addresses need no config', async () => {
  const { impl } = fakeFetch();
  // Vercel 上 request.url 可能是内部地址,以 x-forwarded-host / host 为准
  const viaProxy = new Request('https://internal.example.invalid' + APPLY_PATH, { method: 'POST', headers: { Origin: 'https://preview.example.invalid', 'x-forwarded-host': 'preview.example.invalid' }, body: JSON.stringify(good) });
  assert.equal((await handle(viaProxy, env(), impl)).status, 200);
  const local = new Request('http://localhost:4321' + APPLY_PATH, { method: 'POST', headers: { Origin: 'http://localhost:4321' }, body: JSON.stringify(good) });
  assert.equal((await handle(local, env(), impl)).status, 200);
});

test('without a forwarded IP the captcha check sends no remoteip', async () => {
  const { impl, calls } = fakeFetch();
  await handle(new Request(URL_, { method: 'POST', headers: { Origin: ORIGIN }, body: JSON.stringify(good) }), env(), impl);
  assert.deepEqual(calls[0].body, { secret: 'secret', response: 'tok' });
});

test('invalid fields are reported and nothing is sent', async () => {
  const { impl, calls } = fakeFetch();
  const res = await handle(post({ ...good, url: 'javascript:alert(1)', email: 'nope', name: '' }), env(), impl);
  assert.equal(res.status, 400);
  assert.deepEqual((await res.json()).fields, { name: 'required', url: 'url', email: 'email' });
  assert.equal((await handle(post('not json'), env(), impl)).status, 400);
  assert.equal((await handle(post('x'.repeat(9000)), env(), impl)).status, 413);
  assert.equal(calls.length, 0);
});

test('failed or missing captcha never reaches Resend', async () => {
  const { impl, calls } = fakeFetch({ captcha: false });
  const res = await handle(post(good), env(), impl);
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'captcha');
  assert.equal(calls.length, 1);
  assert.equal((await handle(post({ ...good, token: '' }), env(), impl)).status, 400);
  assert.equal(calls.length, 1);
});

test('honeypot pretends success without sending', async () => {
  const { impl, calls } = fakeFetch();
  const res = await handle(post({ ...good, website: 'https://spam.example.invalid' }), env(), impl);
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('Resend failure and missing secrets surface as server errors without leaking details', async () => {
  const { impl } = fakeFetch({ resendStatus: 422 });
  const failed = await handle(post(good), env(), impl);
  assert.equal(failed.status, 502);
  assert.deepEqual(await failed.json(), { ok: false, error: 'server' });
  const missing = await handle(post(good), env({ RESEND_API_KEY: '' }), impl);
  assert.equal(missing.status, 500);
});

test('line breaks cannot be smuggled into the mail subject', async () => {
  const { impl, calls } = fakeFetch();
  await handle(post({ ...good, name: 'A\r\nBcc: x@example.invalid' }), env(), impl);
  assert.equal(calls[1].body.subject, '[友链申请] A Bcc: x@example.invalid');
});

test('shared validation enforces length limits and trims', () => {
  const { values, errors } = validateApplication({ ...good, name: '  站  ', desc: 'x'.repeat(LIMITS.desc + 1) });
  assert.equal(values.name, '站');
  assert.deepEqual(errors, { desc: 'too_long' });
});

test('the Vercel entry runs the same handler with process.env', async () => {
  assert.equal(typeof api.fetch, 'function');
  const res = await api.fetch(new Request(URL_, { headers: { Origin: ORIGIN } }));
  assert.equal(res.status, 405);
  assert.equal((await api.fetch(post(good, { Origin: 'https://evil.example.invalid' }))).status, 403);
});
