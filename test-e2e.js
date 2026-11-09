// Comprehensive automated test runner for CloudNotes
// Can run against an existing running server or automatically spin up a temporary wrangler dev server.

import { spawn } from 'node:child_process';

const BASE_URL = 'http://127.0.0.1:8787';

let passed = 0;
let failed = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName} ${details}`);
    failed++;
  }
}

async function isServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
}

async function startWranglerServer() {
  console.log('⚡ Launching local wrangler dev server on port 8787...');
  const proc = spawn('npx', ['wrangler', 'dev', '--port', '8787', '--ip', '127.0.0.1'], {
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Wait up to 30 seconds for server to respond to health check
  const start = Date.now();
  while (Date.now() - start < 30000) {
    if (await isServerRunning()) {
      console.log('⚡ Wrangler dev server is online.\n');
      return proc;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  proc.kill('SIGTERM');
  throw new Error('Timed out waiting for wrangler dev server to become ready');
}

async function runTests() {
  let serverProcess = null;
  const running = await isServerRunning();

  if (!running) {
    serverProcess = await startWranglerServer();
  } else {
    console.log('⚡ Connected to existing wrangler server on port 8787.\n');
  }

  try {
    console.log('--- Starting CloudNotes Local E2E Tests ---\n');

    // 1. Health check
    console.log('[1] Testing Health Check');
    const healthRes = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'GET /api/health returns 200');
    assert(healthData.status === 'ok', 'Health status is "ok"');
    assert(healthData.database === 'connected', 'Database is "connected"');
    assert(healthRes.headers.get('x-content-type-options') === 'nosniff', 'Security header X-Content-Type-Options present');
    assert(healthRes.headers.get('x-frame-options') === 'DENY', 'Security header X-Frame-Options present');

    // 2. Static Asset Serving
    console.log('\n[2] Testing Static Asset Serving (SPA)');
    const spaRes = await fetch(`${BASE_URL}/`);
    const spaText = await spaRes.text();
    assert(spaRes.status === 200, 'GET / returns 200');
    assert(spaText.includes('<div id="root"></div>'), 'GET / serves React index.html');

    // 3. Initial Empty / Existing state
    console.log('\n[3] Testing Initial Notes Fetch');
    const initialRes = await fetch(`${BASE_URL}/api/notes`);
    const initialData = await initialRes.json();
    assert(initialRes.status === 200, 'GET /api/notes returns 200');
    assert(Array.isArray(initialData.notes), 'Response contains notes array');

    // 4. Create Note 1
    console.log('\n[4] Testing Create Note 1');
    const create1Res = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cloudflare Edge Architecture',
        content: 'Workers run on V8 isolates distributed across 330+ cities worldwide.',
      }),
    });
    const create1Data = await create1Res.json();
    assert(create1Res.status === 201, 'POST /api/notes returns 201 Created');
    assert(create1Data.note?.id > 0, 'Created note has valid ID');
    assert(create1Data.note?.title === 'Cloudflare Edge Architecture', 'Title matches');
    const note1Id = create1Data.note.id;

    // 5. Create Note 2
    console.log('\n[5] Testing Create Note 2');
    const create2Res = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'D1 Database Capabilities',
        content: 'Cloudflare D1 is built on SQLite and provides serverless SQL at the edge.',
      }),
    });
    const create2Data = await create2Res.json();
    assert(create2Res.status === 201, 'POST /api/notes note 2 returns 201 Created');
    const note2Id = create2Data.note.id;

    // 6. Retrieve All Notes
    console.log('\n[6] Testing Retrieve All Notes');
    const allRes = await fetch(`${BASE_URL}/api/notes`);
    const allData = await allRes.json();
    assert(allRes.status === 200, 'GET /api/notes returns 200');
    assert(allData.total >= 2, `Total notes count >= 2 (got ${allData.total})`);
    assert(allData.notes.some(n => n.id === note1Id), 'Note 1 present in list');
    assert(allData.notes.some(n => n.id === note2Id), 'Note 2 present in list');

    // 7. Retrieve Specific Note
    console.log('\n[7] Testing Retrieve Specific Note');
    const getSingleRes = await fetch(`${BASE_URL}/api/notes/${note1Id}`);
    const getSingleData = await getSingleRes.json();
    assert(getSingleRes.status === 200, `GET /api/notes/${note1Id} returns 200`);
    assert(getSingleData.note?.id === note1Id, 'Returned note ID matches');
    assert(getSingleData.note?.title === 'Cloudflare Edge Architecture', 'Title matches');

    // 8. Update Note
    console.log('\n[8] Testing Update Note');
    const updateRes = await fetch(`${BASE_URL}/api/notes/${note1Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Cloudflare Edge Architecture (Updated)',
        content: 'Updated content: Workers deploy in under 5 milliseconds globally.',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, `PUT /api/notes/${note1Id} returns 200`);
    assert(updateData.note?.title === 'Cloudflare Edge Architecture (Updated)', 'Updated title matches');
    assert(updateData.note?.content.includes('5 milliseconds'), 'Updated content matches');

    // 9. Search Notes
    console.log('\n[9] Testing Search Notes');
    const searchRes1 = await fetch(`${BASE_URL}/api/notes?q=SQLite`);
    const searchData1 = await searchRes1.json();
    assert(searchRes1.status === 200, 'GET /api/notes?q=SQLite returns 200');
    assert(searchData1.notes.some(n => n.id === note2Id), 'Search found Note 2 by content');

    const searchRes2 = await fetch(`${BASE_URL}/api/notes?q=Architecture`);
    const searchData2 = await searchRes2.json();
    assert(searchRes2.status === 200, 'GET /api/notes?q=Architecture returns 200');
    assert(searchData2.notes.some(n => n.id === note1Id), 'Search found Note 1 by title');

    const searchRes3 = await fetch(`${BASE_URL}/api/notes?q=NonExistentKeywordXYZ`);
    const searchData3 = await searchRes3.json();
    assert(searchRes3.status === 200, 'GET /api/notes?q=NonExistentKeywordXYZ returns 200');
    assert(searchData3.notes.length === 0, 'Search for non-existent keyword returns 0 results');

    // 10. Delete Note
    console.log('\n[10] Testing Delete Note');
    const deleteRes = await fetch(`${BASE_URL}/api/notes/${note1Id}`, {
      method: 'DELETE',
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, `DELETE /api/notes/${note1Id} returns 200`);
    assert(deleteData.success === true, 'Delete response success is true');

    // 11. Verify Deletion
    console.log('\n[11] Verifying Deletion');
    const verifyDeleteRes = await fetch(`${BASE_URL}/api/notes/${note1Id}`);
    assert(verifyDeleteRes.status === 404, 'GET deleted note returns 404 Not Found');

    // Clean up Note 2
    await fetch(`${BASE_URL}/api/notes/${note2Id}`, { method: 'DELETE' });

    // 12. Error and Validation Cases
    console.log('\n[12] Testing Validation & Error Responses');

    // Empty title
    const errEmptyTitle = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: '', content: 'Valid content' }),
    });
    assert(errEmptyTitle.status === 400, 'Empty title returns 400 Bad Request');

    // Empty content
    const errEmptyContent = await fetch(`${BASE_URL}/api/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Valid Title', content: '' }),
    });
    assert(errEmptyContent.status === 400, 'Empty content returns 400 Bad Request');

    // Invalid ID format
    const errInvalidId = await fetch(`${BASE_URL}/api/notes/abc`);
    assert(errInvalidId.status === 400, 'Invalid ID string returns 400 Bad Request');

    // Non-existent ID for GET
    const errNotFoundGet = await fetch(`${BASE_URL}/api/notes/999999`);
    assert(errNotFoundGet.status === 404, 'Non-existent ID on GET returns 404 Not Found');

    // Non-existent ID for PUT
    const errNotFoundPut = await fetch(`${BASE_URL}/api/notes/999999`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Should fail' }),
    });
    assert(errNotFoundPut.status === 404, 'Non-existent ID on PUT returns 404 Not Found');

    // Non-existent ID for DELETE
    const errNotFoundDel = await fetch(`${BASE_URL}/api/notes/999999`, {
      method: 'DELETE',
    });
    assert(errNotFoundDel.status === 404, 'Non-existent ID on DELETE returns 404 Not Found');

    // Unsupported HTTP method
    const errMethodNotAllowed = await fetch(`${BASE_URL}/api/notes`, {
      method: 'PATCH',
    });
    assert(errMethodNotAllowed.status === 405, 'Unsupported PATCH method returns 405 Method Not Allowed');

    // Non-existent API route
    const errRouteNotFound = await fetch(`${BASE_URL}/api/nonexistent`);
    assert(errRouteNotFound.status === 404, 'Unknown API route returns 404 Not Found');

    console.log(`\n========================================`);
    console.log(`Results: ${passed} passed, ${failed} failed`);
    console.log(`========================================`);

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    if (serverProcess) {
      console.log('🧹 Shutting down temporary wrangler dev server...');
      serverProcess.kill('SIGTERM');
    }
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
