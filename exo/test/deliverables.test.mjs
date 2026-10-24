import test from 'node:test';
import assert from 'node:assert/strict';
import { canSubmitDeliverable, validateDeliverable, uploadDeliverable, listDeliverables, getDownloadUrl, MAX_FILE_SIZE } from '../src/services/deliverableService.js';
import { apiRequest, saveToken, getToken } from '../src/services/api.js';

const memory = () => {
  const values = new Map();
  return { getItem: (key) => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
};
globalThis.sessionStorage = memory();
globalThis.localStorage = memory();
const developer = { id: 'developer', role: 'FREELANCER' };
const project = { id: 'project', freelancerId: 'developer', status: 'ACTIVE' };

test('only assigned freelancers on active projects with no deliverable can submit', () => {
  assert.equal(canSubmitDeliverable(developer, project, []), true);
  assert.equal(canSubmitDeliverable({ id: 'client', role: 'CLIENT' }, project, []), false);
  assert.equal(canSubmitDeliverable({ id: 'other', role: 'FREELANCER' }, project, []), false);
  assert.equal(canSubmitDeliverable(null, project, []), false);
  for (const status of ['DRAFT', 'COMPLETED', 'CANCELLED', 'DISPUTED']) {
    assert.equal(canSubmitDeliverable(developer, { ...project, status }, []), false);
  }
  assert.equal(canSubmitDeliverable(developer, project, [{ category: 'DELIVERABLE' }]), false);
});

test('validates size, supported formats, empty files and MIME mismatches', () => {
  for (const [name, type] of [['work.zip', 'application/zip'], ['work.pdf', 'application/pdf'], ['work.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], ['work.png', 'image/png'], ['work.jpeg', 'image/jpeg'], ['work.jpg', 'image/jpeg']]) {
    assert.equal(validateDeliverable({ name, type, size: 100 }), '');
  }
  assert.ok(validateDeliverable({ name: 'work.exe', type: '', size: 100 }));
  assert.ok(validateDeliverable({ name: 'work.pdf', type: 'image/png', size: 100 }));
  assert.ok(validateDeliverable({ name: 'work.zip', type: '', size: MAX_FILE_SIZE + 1 }));
  assert.ok(validateDeliverable({ name: 'work.zip', type: '', size: 0 }));
  assert.equal(validateDeliverable({ name: 'work.zip', type: '', size: MAX_FILE_SIZE }), '');
});

test('missing and expired authentication are handled and failed sessions cleared', async () => {
  await assert.rejects(uploadDeliverable('project', new File(['test'], 'work.pdf', { type: 'application/pdf' })), /log in/);
  saveToken('expired', false);
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ success: false }) });
  await assert.rejects(apiRequest('/auth/me'), /expired/);
  assert.equal(getToken(), null);
});

test('listing filters deliverables and downloads request fresh authorized metadata', async () => {
  saveToken('valid', false);
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({ success: true, data: url.endsWith('/files')
      ? { files: [{ id: 'work', category: 'DELIVERABLE' }, { category: 'PAYMENT_RECEIPT' }] }
      : { file: { accessUrl: 'https://res.cloudinary.com/signed-file' } } }) };
  };
  assert.equal((await listDeliverables('project')).length, 1);
  assert.equal(await getDownloadUrl('work'), 'https://res.cloudinary.com/signed-file');
  assert.equal(calls[1].url, '/api/files/work');
  assert.equal(calls[1].options.headers.Authorization, 'Bearer valid');
});

test('upload uses verified endpoint, multipart file, bearer token and upload progress', async () => {
  saveToken('valid', false);
  let request;
  globalThis.XMLHttpRequest = class {
    upload = {};
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(key, value) { this.header = [key, value]; }
    send(form) {
      request = this; this.form = form;
      this.upload.onprogress({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = 201; this.responseText = JSON.stringify({ success: true, data: { file: { id: 'uploaded' } } });
      this.onload();
    }
  };
  let progress;
  const result = await uploadDeliverable('project', new File(['%PDF-test'], 'work.pdf', { type: 'application/pdf' }), (value) => { progress = value; });
  assert.equal(result.id, 'uploaded');
  assert.equal(request.method, 'POST');
  assert.equal(request.url, '/api/projects/project/files/deliverable');
  assert.deepEqual(request.header, ['Authorization', 'Bearer valid']);
  assert.equal(request.form.get('file').name, 'work.pdf');
  assert.equal(progress, 50);
});

test('server validation errors and network failures never report successful upload', async () => {
  for (const network of [false, true]) {
    globalThis.XMLHttpRequest = class {
      upload = {};
      open() {}
      setRequestHeader() {}
      send() {
        if (network) { this.onerror(); return; }
        this.status = 400;
        this.responseText = JSON.stringify({ success: false, error: { message: 'File validation failed.', details: { signature: 'Spoofed file.' } } });
        this.onload();
      }
    };
    await assert.rejects(uploadDeliverable('project', new File(['test'], 'work.pdf', { type: 'application/pdf' })), network ? /Connection lost/ : /Spoofed file/);
  }
});

test('incorrect login credentials preserve the real error and do not claim session expiry', async () => {
  saveToken('existing', false);
  globalThis.fetch = async () => ({ ok: false, status: 401, json: async () => ({ success: false, error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' } }) });
  await assert.rejects(apiRequest('/auth/login', { token: null }), /^Error: Invalid email or password\.$/);
  assert.equal(getToken(), 'existing');
});

test('unreachable backend and empty proxy error responses explain connection failures', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(apiRequest('/auth/login', { token: null }), /Cannot connect to the server/);
  globalThis.fetch = async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError('empty'); } });
  await assert.rejects(apiRequest('/auth/register', { token: null }), /backend is running/);
});

test('test users enter without any backend call and never receive an API token', async () => {
  const { startDemoSession, getDemoUser, clearDemoSession } = await import('../src/services/demoSession.js');
  globalThis.fetch = () => { throw new Error('Demo must not call the backend'); };
  saveToken('real-token', false);
  startDemoSession({ name: ' Tester ', email: 'any-test-name', role: 'developer' });
  assert.equal(getDemoUser().name, 'Tester');
  assert.equal(getDemoUser().role, 'developer');
  assert.equal(getToken(), null);
  assert.equal('password' in getDemoUser(), false);
  clearDemoSession();
  assert.equal(getDemoUser(), null);
  startDemoSession({ name: '', email: '', role: 'client' });
  assert.equal(getDemoUser().name, 'Test user');
  assert.equal(getDemoUser().role, 'client');
  clearDemoSession();
});

test('demo project completion requires a real current submission and client review', async () => {
  const { canUploadDemoWork, canApproveDemoWork, saveDemoFile } = await import('../src/services/demoDeliverables.js');
  const funded = { id: 'project', clientId: 'me', developerId: 'me', status: 'funded' };
  assert.equal(canUploadDemoWork(funded, 'developer'), true);
  assert.equal(canUploadDemoWork(funded, 'client'), false);
  assert.equal(canUploadDemoWork({ ...funded, developerId: 'other' }, 'developer'), false);
  const submitted = { ...funded, status: 'delivered', deliverable: { id: 'file-one' } };
  assert.equal(canUploadDemoWork(submitted, 'developer'), false);
  assert.equal(canApproveDemoWork(submitted, 'client', 'file-one'), true);
  assert.equal(canApproveDemoWork(submitted, 'developer', 'file-one'), false);
  assert.equal(canApproveDemoWork(submitted, 'client', 'old-file'), false);
  assert.equal(canApproveDemoWork(submitted, 'client', null), false);
  assert.equal(canApproveDemoWork({ ...submitted, deliverable: undefined }, 'client', 'file-one'), false);
  assert.equal(canApproveDemoWork({ ...submitted, clientId: 'other' }, 'client', 'file-one'), false);
  assert.equal(canApproveDemoWork({ ...submitted, status: 'released' }, 'client', 'file-one'), false);
  await assert.rejects(saveDemoFile(funded, 'client', null), /assigned developer/);
  await assert.rejects(saveDemoFile(funded, 'developer', { name: 'bad.exe', size: 10, type: '' }), /Choose a ZIP/);
  await assert.rejects(saveDemoFile(funded, 'developer', { name: 'work.zip', size: MAX_FILE_SIZE + 1, type: '' }), /10 MB/);
});
