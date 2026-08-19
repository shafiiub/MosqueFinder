'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const core = require('../generator-core');
const repoRoot = path.resolve(__dirname, '..');
const scripts = ['loadDateToPage-v2.js', 'copyDataFiles.js', 'loadStatePrayerTimeSitemap.js', 'loadStateList.js', 'loadMosqueDetails.js'];

const suburbTemplate = '<!doctype html><title>{{title}}</title><p>{{suburb}} {{state}} {{postcode}} {{latitude}} {{longitude}}</p><script>const state={{stateJson}},lat={{latitudeJson}},lon={{longitudeJson}};</script>';
const stateTemplate = '<!doctype html><title>{{title}}</title><main data-state="{{state}}">{{statelist}}</main>';
const postcodeTemplate = '<!doctype html><title>{{title}}</title><main data-state="{{state}}" data-label="{{stateUpper}}" data-count="{{resultCount}}">{{statelist}}</main>';
const mosqueTemplate = '<!doctype html><title>{{title}}</title><p>{{address}} {{suburb}} {{state}} {{postcode}} {{latitude}} {{longitude}} {{category}}</p>{{phone}}{{email}}{{website}}{{jummah}}{{jummahOther}}{{gallery}}{{thumbs}}{{content}}{{jummahloc}}<ul>{{features}}</ul><script>const state={{stateJson}},lat={{latitudeJson}},lon={{longitudeJson}};itemDetailMap({latitude:{{latitudeJson}},longitude:{{longitudeJson}}});</script>';

function suburbs(second = null) {
  const first = { id: '1', Suburb: 'Test & Town', State: 'NSW', Postcode: '2000', Latitude: '-33.1', Longitude: '151.2', url: 'nsw/2000/test-town' };
  return [first, second || { ...first, id: '2' }, { id: '3', Suburb: 'Other', State: 'VIC', Postcode: '3000', Latitude: '-37.8', Longitude: '144.9', url: 'vic/3000/other' }];
}

function mosques(duplicate = false) {
  const first = {
    id: '1', Title: 'A <Mosque>', URLSegment: 'a-mosque', Teaser: 'A & B', ListingType: 'Mosque', Address: '1 < Road',
    Suburb: 'Test', State: 'NSW', Postcode: '2000', Latitude: '-33.1', Longitude: '151.2', Phone: null, Fax: null,
    Email: 'a@example.test', Website: 'https://example.test/a?x=1&y=2', JummahLocation: '0', JummahDescription: null,
    JummahTime: null, JummahAddress: null, JummahLatitude: '0', JummahLongitude: '0', gallery: ['/assets/a.png'],
    features: ['Parking & toilets'], Content: '<p>Trusted rich content</p>',
  };
  const second = { ...first, id: '2', Title: 'B Mosque', URLSegment: duplicate ? 'a-mosque' : 'b-mosque', State: 'VIC', Postcode: '3000', Website: 'javascript:alert(1)', gallery: [], features: [] };
  return [first, second];
}

async function fixture(options = {}) {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'mosquefinder-fixture-'));
  await fsp.mkdir(path.join(root, '_data'), { recursive: true });
  await fsp.mkdir(path.join(root, '_templates'), { recursive: true });
  const data = options.suburbs || suburbs();
  await fsp.writeFile(path.join(root, '_data/Suburblist.json'), options.invalidJson ? '{bad json' : JSON.stringify(data));
  await fsp.writeFile(path.join(root, '_data/mosque_json.json'), JSON.stringify(options.mosques || mosques()));
  await fsp.writeFile(path.join(root, '_data/mosque_home.json'), JSON.stringify({ data: [] }));
  if (!options.missingTemplate) await fsp.writeFile(path.join(root, '_templates/suburb-prayertime.html'), suburbTemplate);
  await fsp.writeFile(path.join(root, '_templates/state-listing.html'), stateTemplate);
  await fsp.writeFile(path.join(root, '_templates/postcode-listing.html'), postcodeTemplate);
  await fsp.writeFile(path.join(root, '_templates/mosque-detail.html'), mosqueTemplate);
  return root;
}

function runScript(script, sourceRoot, outputRoot, extraEnv = {}) {
  return spawnSync(process.execPath, [path.join(repoRoot, script)], {
    cwd: repoRoot, encoding: 'utf8', env: { ...process.env, MOSQUE_FINDER_SOURCE_ROOT: sourceRoot, MOSQUE_FINDER_OUTPUT_ROOT: outputRoot, ...extraEnv },
  });
}

function runBuild(sourceRoot, outputRoot, extraEnv = {}) {
  const results = [];
  for (const script of scripts) {
    const result = runScript(script, sourceRoot, outputRoot, extraEnv);
    results.push(result);
    if (result.status !== 0) break;
  }
  return results;
}

async function filesUnder(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await fsp.readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(absolute);
      else files.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  if (fs.existsSync(root)) await visit(root);
  return files.sort();
}

async function snapshot(root) {
  const result = new Map();
  for (const relative of await filesUnder(root)) result.set(relative, await fsp.readFile(path.join(root, relative)));
  return result;
}

function assertSnapshotsEqual(first, second) {
  assert.deepEqual([...first.keys()], [...second.keys()]);
  for (const key of first.keys()) assert.deepEqual(first.get(key), second.get(key), `byte mismatch: ${key}`);
}

function assertWellFormedGeneratedXml(xml) {
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
  assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length);
  assert.equal((xml.match(/<loc>/g) || []).length, (xml.match(/<\/loc>/g) || []).length);
  assert.doesNotMatch(xml.replaceAll('&amp;', '').replaceAll('&lt;', '').replaceAll('&gt;', '').replaceAll('&quot;', '').replaceAll('&apos;', ''), /&(?!#\d+;|#x[\da-f]+;)/i);
  assert.match(xml, /<\/urlset>$/);
}

test('path boundary rejects absolute paths, traversal, backslashes and encoded internal traversal', () => {
  const output = path.join(os.tmpdir(), 'safe-output');
  assert.throws(() => core.safeDestination(output, '../escape.html'), /Unsafe|escapes/);
  assert.throws(() => core.safeDestination(output, '/absolute.html'), /Unsafe/);
  assert.throws(() => core.safeDestination(output, 'a\\..\\escape.html'), /Unsafe/);
  assert.throws(() => core.validateInternalPath('/assets/%2e%2e/secret', 'asset'), /traversal/);
  assert.equal(core.safeDestination(output, 'nsw/2000/test/index.html'), path.join(output, 'nsw/2000/test/index.html'));
});

test('identical suburb route records deduplicate deterministically; conflicting routes fail actionably', () => {
  const deduped = core.validateAndDedupeSuburbs(suburbs());
  assert.equal(deduped.records.length, 2);
  assert.equal(deduped.duplicateCount, 1);
  const conflict = { ...suburbs()[0], id: '99', Suburb: 'Changed' };
  assert.throws(() => core.validateAndDedupeSuburbs(suburbs(conflict)), /Conflicting suburb route.*records 0.*id 1.*and 1.*id 99/);
});

test('duplicate mosque destinations are rejected before mosque writes', async () => {
  const source = await fixture({ mosques: mosques(true) });
  const output = path.join(source, 'output');
  const result = runScript('loadMosqueDetails.js', source, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate mosque destination/);
  assert.deepEqual(await filesUnder(output), []);
});

test('missing template and invalid JSON exit nonzero without partial output', async () => {
  const missing = await fixture({ missingTemplate: true });
  const missingOutput = path.join(missing, 'output');
  const missingResult = runScript('loadDateToPage-v2.js', missing, missingOutput);
  assert.notEqual(missingResult.status, 0);
  assert.match(missingResult.stderr, /Build failed/);
  assert.deepEqual(await filesUnder(missingOutput), []);

  const invalid = await fixture({ invalidJson: true });
  const invalidOutput = path.join(invalid, 'output');
  const invalidResult = runScript('loadDateToPage-v2.js', invalid, invalidOutput);
  assert.notEqual(invalidResult.status, 0);
  assert.match(invalidResult.stderr, /Invalid JSON/);
  assert.deepEqual(await filesUnder(invalidOutput), []);
});

test('top-level build preflights every generator before writing anything', async () => {
  const source = await fixture({ mosques: mosques(true) });
  const output = path.join(source, 'output');
  const result = runScript('build.js', source, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Duplicate mosque destination/);
  assert.deepEqual(await filesUnder(output), []);
});

test('delayed template reads are awaited and never produce empty pages', async () => {
  const source = await fixture();
  const output = path.join(source, 'output');
  const result = runScript('loadDateToPage-v2.js', source, output, { MOSQUE_FINDER_TEST_TEMPLATE_DELAY_MS: '75' });
  assert.equal(result.status, 0, result.stderr);
  const pages = (await filesUnder(output)).filter((file) => file.endsWith('/index.html'));
  assert.equal(pages.length, 2);
  for (const page of pages) assert.ok((await fsp.stat(path.join(output, page))).size > 0, page);
});

test('rendering escapes contexts, serializes inline data, preserves rich Content, and guards external links', async () => {
  const source = await fixture();
  const output = path.join(source, 'output');
  const result = runScript('loadMosqueDetails.js', source, output);
  assert.equal(result.status, 0, result.stderr);
  const safe = await fsp.readFile(path.join(output, 'mosque/a-mosque/index.html'), 'utf8');
  assert.match(safe, /A &lt;Mosque&gt;/);
  assert.match(safe, /1 &lt; Road/);
  assert.match(safe, /Parking &amp; toilets/);
  assert.match(safe, /<p>Trusted rich content<\/p>/);
  assert.match(safe, /target="_blank" rel="noopener noreferrer"/);
  assert.match(safe, /https:\/\/example\.test\/a\?x=1&amp;y=2/);
  assert.match(safe, /const state="nsw",lat=-33\.1,lon=151\.2/);
  const unsafe = await fsp.readFile(path.join(output, 'mosque/b-mosque/index.html'), 'utf8');
  assert.doesNotMatch(unsafe, /href="javascript:/);
  assert.match(unsafe, /<span>javascript:alert\(1\)<\/span>/);
});

test('unresolved required placeholders fail before writes', async () => {
  const source = await fixture();
  await fsp.appendFile(path.join(source, '_templates/mosque-detail.html'), '{{notProvided}}');
  const output = path.join(source, 'output');
  const result = runScript('loadMosqueDetails.js', source, output);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unresolved required token.*notProvided/);
  assert.deepEqual(await filesUnder(output), []);
});

test('postcode directories use dedicated semantics and root-relative suburb links', async () => {
  const source = await fixture();
  const output = path.join(source, 'output');
  const result = runScript('loadStatePrayerTimeSitemap.js', source, output);
  assert.equal(result.status, 0, result.stderr);
  const nsw = await fsp.readFile(path.join(output, 'nsw/postcode.html'), 'utf8');
  assert.match(nsw, /data-label="NSW" data-count="1"/);
  assert.match(nsw, /class="postcode-list" data-postcode-list/);
  assert.match(nsw, /href="\/nsw\/2000\/test-town\/index\.html"/);
  assert.match(nsw, /postcode-list__code">2000/);
  assert.match(nsw, /postcode-list__suburb">Test &amp; Town/);
  assert.doesNotMatch(nsw, /https:\/\/mosque-finder\.com\.au\/nsw\/2000/);
});

test('fixture build has expected artifacts, non-empty mosque pages, parseable JSON/XML, and no unresolved tokens', async () => {
  const source = await fixture();
  const output = path.join(source, 'output');
  const results = runBuild(source, output);
  assert.equal(results.length, 5);
  results.forEach((result) => assert.equal(result.status, 0, result.stderr));
  const files = await filesUnder(output);
  assert.equal(files.length, 32);
  assert.equal(files.filter((file) => /^mosque\/[^/]+\/index\.html$/.test(file)).length, 2);
  for (const relative of files) {
    const content = await fsp.readFile(path.join(output, relative), 'utf8');
    assert.ok(content.length > 0, relative);
    if (relative.endsWith('.html')) assert.doesNotMatch(content, /\{\{[A-Za-z][A-Za-z0-9]*\}\}/, relative);
    if (relative.endsWith('.json')) assert.doesNotThrow(() => JSON.parse(content), relative);
    if (relative.endsWith('.xml')) assertWellFormedGeneratedXml(content);
  }
});

test('two clean fixture builds are byte-identical', async () => {
  const source = await fixture();
  const firstOutput = path.join(source, 'first');
  const secondOutput = path.join(source, 'second');
  for (const result of runBuild(source, firstOutput)) assert.equal(result.status, 0, result.stderr);
  for (const result of runBuild(source, secondOutput)) assert.equal(result.status, 0, result.stderr);
  assertSnapshotsEqual(await snapshot(firstOutput), await snapshot(secondOutput));
});
