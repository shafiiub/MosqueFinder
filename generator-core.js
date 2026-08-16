'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');

const STATES = ['act', 'nsw', 'nt', 'qld', 'sa', 'tas', 'vic', 'wa'];
const STATE_SET = new Set(STATES);
const TOKEN_RE = /\{\{[A-Za-z][A-Za-z0-9]*\}\}/g;

function roots() {
  const sourceRoot = path.resolve(process.env.MOSQUE_FINDER_SOURCE_ROOT || __dirname);
  const outputRoot = path.resolve(process.env.MOSQUE_FINDER_OUTPUT_ROOT || path.join(sourceRoot, 'public'));
  return { sourceRoot, outputRoot };
}

function fail(message) {
  throw new Error(message);
}

function requireString(value, label, { empty = false } = {}) {
  if (typeof value !== 'string' || (!empty && value.trim() === '')) {
    fail(`${label} must be ${empty ? 'a string' : 'a non-empty string'}`);
  }
  return value;
}

function optionalString(value, label) {
  if (value !== null && value !== undefined && typeof value !== 'string') {
    fail(`${label} must be a string or null`);
  }
  return value || '';
}

function finiteCoordinate(value, label, min = -Infinity, max = Infinity) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    fail(`${label} must be a finite coordinate`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    fail(`${label} must be a finite coordinate${Number.isFinite(min) ? ` between ${min} and ${max}` : ''}`);
  }
  return number;
}

function stringArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  value.forEach((item, index) => requireString(item, `${label}[${index}]`));
  return value;
}

function safeDestination(outputRoot, relativePath) {
  requireString(relativePath, 'destination path');
  if (path.isAbsolute(relativePath) || relativePath.includes('\\') || /[\0\r\n]/.test(relativePath)) {
    fail(`Unsafe destination path: ${JSON.stringify(relativePath)}`);
  }
  const parts = relativePath.split('/');
  if (parts.some((part) => part === '' || part === '.' || part === '..')) {
    fail(`Unsafe destination path: ${JSON.stringify(relativePath)}`);
  }
  const root = path.resolve(outputRoot);
  const destination = path.resolve(root, ...parts);
  if (destination === root || !destination.startsWith(root + path.sep)) {
    fail(`Destination escapes output root: ${JSON.stringify(relativePath)}`);
  }
  return destination;
}

function validateInternalPath(value, label) {
  requireString(value, label);
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || /[\0\r\n?#]/.test(value)) {
    fail(`${label} must be an expected internal path`);
  }
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { fail(`${label} contains invalid URL encoding`); }
  if (decoded.split('/').some((part) => part === '.' || part === '..')) {
    fail(`${label} contains path traversal`);
  }
  return value;
}

function safeWebsiteUrl(value, label) {
  optionalString(value, label);
  if (!value) return null;
  try {
    const url = new URL(value);
    if ((url.protocol === 'http:' || url.protocol === 'https:') && !url.username && !url.password) return url.href;
  } catch {}
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function safeJson(value) {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}

function render(template, replacements, label) {
  let output = template;
  for (const [token, value] of Object.entries(replacements)) {
    output = output.replaceAll(`{{${token}}}`, String(value));
  }
  const unresolved = [...new Set(output.match(TOKEN_RE) || [])];
  if (unresolved.length) fail(`${label} has unresolved required token(s): ${unresolved.join(', ')}`);
  if (output.length === 0) fail(`${label} rendered an empty required artifact`);
  return output;
}

async function readText(sourceRoot, relativePath) {
  const source = path.resolve(sourceRoot, relativePath);
  if (!source.startsWith(path.resolve(sourceRoot) + path.sep)) fail(`Source path escapes source root: ${relativePath}`);
  const delay = Number(process.env.MOSQUE_FINDER_TEST_TEMPLATE_DELAY_MS || 0);
  if (delay > 0 && relativePath.startsWith('_templates/')) {
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  return fs.readFile(source, 'utf8');
}

async function readJson(sourceRoot, relativePath) {
  const text = await readText(sourceRoot, relativePath);
  try { return { value: JSON.parse(text), text }; }
  catch (error) { throw new Error(`Invalid JSON in ${relativePath}: ${error.message}`); }
}

function validateSuburb(record, index) {
  const label = `Suburblist[${index}]`;
  if (!record || typeof record !== 'object' || Array.isArray(record)) fail(`${label} must be an object`);
  const suburb = requireString(record.Suburb, `${label}.Suburb`);
  const state = requireString(record.State, `${label}.State`).toLowerCase();
  if (!STATE_SET.has(state)) fail(`${label}.State is unsupported: ${record.State}`);
  const postcode = requireString(record.Postcode, `${label}.Postcode`);
  if (!/^\d{4}$/.test(postcode)) fail(`${label}.Postcode must contain exactly four digits`);
  const latitude = finiteCoordinate(record.Latitude, `${label}.Latitude`, -90, 90);
  const longitude = finiteCoordinate(record.Longitude, `${label}.Longitude`, -180, 180);
  const route = requireString(record.url, `${label}.url`).replaceAll("'", '-');
  const expectedPrefix = `${state}/${postcode}/`;
  if (!route.startsWith(expectedPrefix) || !/^(act|nsw|nt|qld|sa|tas|vic|wa)\/\d{4}\/[A-Za-z0-9][A-Za-z0-9 &().-]*$/.test(route)) {
    fail(`${label}.url is not an expected state/postcode route: ${JSON.stringify(record.url)}`);
  }
  safeDestination(path.join(path.parse(process.cwd()).root, 'mosque-finder-output'), `${route}/index.html`);
  return { ...record, suburb, state, postcode, latitude, longitude, route, index };
}

function suburbIdentity(record) {
  return JSON.stringify([
    record.suburb, record.state, record.postcode,
    record.latitude, record.longitude, record.route,
  ]);
}

function validateAndDedupeSuburbs(value) {
  if (!Array.isArray(value)) fail('Suburblist.json must contain an array');
  const unique = new Map();
  let duplicateCount = 0;
  value.forEach((raw, index) => {
    const record = validateSuburb(raw, index);
    const prior = unique.get(record.route);
    if (!prior) unique.set(record.route, record);
    else if (suburbIdentity(prior) === suburbIdentity(record)) duplicateCount += 1;
    else fail(`Conflicting suburb route ${JSON.stringify(record.route)} at records ${prior.index} (id ${prior.id}) and ${index} (id ${record.id})`);
  });
  return { records: [...unique.values()], duplicateCount };
}

function validateMosques(value) {
  if (!Array.isArray(value)) fail('mosque_json.json must contain an array');
  const destinations = new Map();
  return value.map((record, index) => {
    const label = `mosque_json[${index}]`;
    if (!record || typeof record !== 'object' || Array.isArray(record)) fail(`${label} must be an object`);
    const required = ['Title', 'URLSegment', 'ListingType', 'Address', 'Suburb', 'State', 'Postcode'];
    required.forEach((field) => requireString(record[field], `${label}.${field}`));
    ['Teaser', 'Content'].forEach((field) => optionalString(record[field], `${label}.${field}`));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.URLSegment)) fail(`${label}.URLSegment is unsafe: ${record.URLSegment}`);
    const state = record.State.toLowerCase();
    if (!STATE_SET.has(state)) fail(`${label}.State is unsupported: ${record.State}`);
    if (!/^\s?\d{3,4}$/.test(record.Postcode)) fail(`${label}.Postcode must be a three- or four-digit postcode string`);
    const latitude = finiteCoordinate(record.Latitude, `${label}.Latitude`);
    const longitude = finiteCoordinate(record.Longitude, `${label}.Longitude`);
    ['Phone', 'Email', 'Website', 'JummahDescription', 'JummahTime', 'JummahAddress'].forEach((field) => optionalString(record[field], `${label}.${field}`));
    const gallery = stringArray(record.gallery, `${label}.gallery`);
    gallery.forEach((item, itemIndex) => validateInternalPath(item, `${label}.gallery[${itemIndex}]`));
    const features = stringArray(record.features, `${label}.features`);
    const destination = `mosque/${record.URLSegment}/index.html`;
    if (destinations.has(destination)) fail(`Duplicate mosque destination ${JSON.stringify(destination)} at records ${destinations.get(destination)} and ${index}`);
    destinations.set(destination, index);
    return { ...record, Teaser: record.Teaser || '', Content: record.Content || '', state, latitude, longitude, gallery, features, destination, index };
  });
}

function preflightPlans(outputRoot, plans) {
  const seen = new Map();
  for (const plan of plans) {
    if (!plan || typeof plan.content !== 'string' || plan.content.length === 0) fail(`Empty required artifact: ${plan?.relativePath || '<unknown>'}`);
    const destination = safeDestination(outputRoot, plan.relativePath);
    if (seen.has(destination)) fail(`Duplicate planned destination: ${plan.relativePath}`);
    seen.set(destination, plan);
    plan.destination = destination;
  }
  return plans;
}

async function writePlans(outputRoot, plans) {
  preflightPlans(outputRoot, plans);
  if (process.env.MOSQUE_FINDER_DRY_RUN === '1') return plans.length;
  await Promise.all(plans.map(async (plan) => {
    await fs.mkdir(path.dirname(plan.destination), { recursive: true });
    const temporary = `${plan.destination}.tmp-${process.pid}`;
    await fs.writeFile(temporary, plan.content, 'utf8');
    await fs.rename(temporary, plan.destination);
    const stat = await fs.stat(plan.destination);
    if (!stat.isFile() || stat.size === 0) fail(`Required artifact is empty after write: ${plan.relativePath}`);
  }));
  return plans.length;
}

function suburbPage(template, record) {
  return render(template, {
    title: escapeHtml(`Prayer time for ${record.suburb}, ${record.State}-${record.postcode}`),
    state: escapeHtml(record.state), suburb: escapeHtml(record.suburb), postcode: escapeHtml(record.postcode),
    latitude: escapeHtml(record.Latitude), longitude: escapeHtml(record.Longitude),
    stateJson: safeJson(record.state), latitudeJson: safeJson(record.latitude), longitudeJson: safeJson(record.longitude),
  }, `suburb page ${record.route}`);
}

async function loadSuburbs(sourceRoot) {
  const { value } = await readJson(sourceRoot, '_data/Suburblist.json');
  return validateAndDedupeSuburbs(value);
}

async function generateSuburbPages() {
  const { sourceRoot, outputRoot } = roots();
  const [template, suburbs] = await Promise.all([
    readText(sourceRoot, '_templates/suburb-prayertime.html'), loadSuburbs(sourceRoot),
  ]);
  const plans = suburbs.records.map((record) => ({ relativePath: `${record.route}/index.html`, content: suburbPage(template, record) }));
  const count = await writePlans(outputRoot, plans);
  if (process.env.MOSQUE_FINDER_DRY_RUN !== '1') console.log(`Generated ${count} suburb pages; deduplicated ${suburbs.duplicateCount} identical route records.`);
}

async function copyDataFiles() {
  const { sourceRoot, outputRoot } = roots();
  const [suburbsFile, mosquesFile, homeFile] = await Promise.all([
    readJson(sourceRoot, '_data/Suburblist.json'), readJson(sourceRoot, '_data/mosque_json.json'), readJson(sourceRoot, '_data/mosque_home.json'),
  ]);
  validateAndDedupeSuburbs(suburbsFile.value);
  validateMosques(mosquesFile.value);
  if (!homeFile.value || typeof homeFile.value !== 'object' || !Array.isArray(homeFile.value.data)) fail('mosque_home.json must contain a data array');
  const plans = [
    ['assets/json/Suburblist.json', suburbsFile.text], ['assets/json/mosque_json.json', mosquesFile.text], ['assets/json/mosque_home.json', homeFile.text],
  ].map(([relativePath, content]) => ({ relativePath, content }));
  await writePlans(outputRoot, plans);
  if (process.env.MOSQUE_FINDER_DRY_RUN !== '1') console.log('Copied and validated 3 JSON data files.');
}

function xmlDocument(entries) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`;
}

function sitemapEntry(url) {
  return `<url><loc>${escapeXml(url)}</loc><changefreq>weekly</changefreq></url>`;
}

async function generateStatePrayerTimeSitemap() {
  const { sourceRoot, outputRoot } = roots();
  const [pageTemplate, listTemplate, suburbs] = await Promise.all([
    readText(sourceRoot, '_templates/suburb-prayertime.html'), readText(sourceRoot, '_templates/state-listing.html'), loadSuburbs(sourceRoot),
  ]);
  const grouped = Object.fromEntries(STATES.map((state) => [state, []]));
  suburbs.records.forEach((record) => grouped[record.state].push(record));
  const plans = suburbs.records.map((record) => ({ relativePath: `${record.route}/index.html`, content: suburbPage(pageTemplate, record) }));
  for (const state of STATES) {
    const sitemap = grouped[state].map((record) => sitemapEntry(`https://mosque-finder.com.au/${record.route}/index.html`));
    plans.push({ relativePath: `${state}/sitemap.xml`, content: xmlDocument(sitemap) });
    const items = grouped[state].map((record) => `<li><a href="${escapeHtml(`https://mosque-finder.com.au/${record.route}/index.html`)}">postcode: ${escapeHtml(record.postcode)} - Suburb: ${escapeHtml(record.suburb)}</a></li>`).join('');
    plans.push({ relativePath: `${state}/postcode.html`, content: render(listTemplate, {
      title: escapeHtml(`${state.toUpperCase()} Postcode and Suburb list`), state: escapeHtml(state), statelist: `<ul class="bullets">${items}</ul>`,
    }, `${state} postcode list`) });
  }
  const count = await writePlans(outputRoot, plans);
  if (process.env.MOSQUE_FINDER_DRY_RUN !== '1') console.log(`Generated ${count} suburb/state artifacts; deduplicated ${suburbs.duplicateCount} identical route records.`);
}

function stateListingItem(record) {
  const route = `/mosque/${record.URLSegment}/index.html`;
  validateInternalPath(route, `mosque_json[${record.index}] generated route`);
  const imagePath = record.gallery[0] || '/assets/img/items/1.jpg';
  validateInternalPath(imagePath, `mosque_json[${record.index}] listing image`);
  return '<div class="col-md-3 col-sm-4"><div class="item "><div class="image">' +
    '<div class="quick-view" data-toggle="modal" data-target="#modal-bar"><i class="fa fa-eye"></i><span>Quick View</span></div>' +
    `<a href="${escapeHtml(route)}"><div class="overlay"><div class="inner"><div class="content"><h4>Description</h4><p>${escapeHtml(record.Teaser)}</p></div></div></div>` +
    `<img src="${escapeHtml(imagePath)}" alt=""></a></div><div class="wrapper"><a href="${escapeHtml(route)}"><h3>${escapeHtml(record.URLSegment)}</h3></a>` +
    `<figure>${escapeHtml(record.Address)}, ${escapeHtml(record.Suburb)}</figure><div class="info"><div class="type"><i><img src="/assets/icons/tourism/cult-religion/mosquee.png" alt=""></i>` +
    `<span>${escapeHtml(record.ListingType)}</span></div></div></div></div></div>`;
}

async function generateStateLists() {
  const { sourceRoot, outputRoot } = roots();
  const [template, mosqueFile] = await Promise.all([
    readText(sourceRoot, '_templates/state-listing.html'), readJson(sourceRoot, '_data/mosque_json.json'),
  ]);
  const mosques = validateMosques(mosqueFile.value);
  const grouped = Object.fromEntries(STATES.map((state) => [state, []]));
  mosques.forEach((record) => grouped[record.state].push(stateListingItem(record)));
  const plans = STATES.map((state) => ({ relativePath: `${state}/index.html`, content: render(template, {
    title: escapeHtml(`${state.toUpperCase()} Prayer location`), state: escapeHtml(state), statelist: grouped[state].join(''),
  }, `${state} state listing`) }));
  await writePlans(outputRoot, plans);
  if (process.env.MOSQUE_FINDER_DRY_RUN !== '1') console.log(`Generated ${plans.length} state listing pages.`);
}

function websiteMarkup(record) {
  if (!record.Website) return '';
  const safe = safeWebsiteUrl(record.Website, `mosque_json[${record.index}].Website`);
  if (!safe) return `<div class="info"><i class="fa fa-globe"></i><span>${escapeHtml(record.Website)}</span></div>`;
  return `<div class="info"><i class="fa fa-globe"></i><a href="${escapeHtml(safe)}" target="_blank" rel="noopener noreferrer">${escapeHtml(record.Website)}</a></div>`;
}

function mosquePage(template, record) {
  const images = record.gallery.length ? record.gallery : ['/assets/img/items/1.jpg'];
  const gallery = images.map((image, index) => `<div class="slide"><img src="${escapeHtml(image)}" data-hash="${index + 1}" alt=""></div>`).join('');
  const thumbs = images.map((image, index) => `<a href="#${index + 1}" id="thumbnail-${index + 1}" class="${index === 0 ? 'active' : ''}"><img src="${escapeHtml(image)}" alt=""></a>`).join('');
  const features = record.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('');
  const jummah = record.JummahDescription ? `<section><header><h3>Jummah Time</h3></header><figure><div class="expandable-content collapsed show-60" id="detail-sidebar-event"><div class="content">${escapeHtml(record.JummahDescription)}</div></div><a href="#" class="show-more expand-content" data-expand="#detail-sidebar-event">Show More</a></figure></section>` : '';
  const jummahLoc = record.JummahLocation === '1' ? `<article class="block"><header><h2>Jummah location details</h2></header><p>${escapeHtml(record.JummahDescription || '')}</p><ul class="bullets"><li>Jummah salat Time: ${escapeHtml(record.JummahTime || '')}</li><li>Jummah Address: ${escapeHtml(record.JummahAddress || '')}</li></ul></article>` : '';
  const jummahOther = record.JummahLocation === '1' ? `<section><header><h3>Jummah Address</h3></header><address><div>${escapeHtml(record.JummahAddress || '')}</div><figure><div class="info">Jummah salat Time: <span>${escapeHtml(record.JummahTime || '')}</span></div></figure></address></section>` : '';
  return render(template, {
    title: escapeHtml(record.Title), address: escapeHtml(record.Address), state: escapeHtml(record.state), suburb: escapeHtml(record.Suburb),
    postcode: escapeHtml(record.Postcode), latitude: escapeHtml(record.Latitude), longitude: escapeHtml(record.Longitude), category: escapeHtml(record.ListingType),
    content: record.Content, jummah, phone: record.Phone ? `<div class="info"><i class="fa fa-mobile"></i><span>${escapeHtml(record.Phone)}</span></div>` : '',
    website: websiteMarkup(record), email: record.Email ? `<div class="info"><i class="fa fa-envelope"></i><span>${escapeHtml(record.Email.replace('@', '[at]'))}</span></div>` : '',
    gallery, thumbs, features, jummahloc: jummahLoc, jummahOther,
    stateJson: safeJson(record.state), latitudeJson: safeJson(record.latitude), longitudeJson: safeJson(record.longitude),
  }, `mosque page ${record.URLSegment}`);
}

async function generateMosqueDetails() {
  const { sourceRoot, outputRoot } = roots();
  const [template, mosqueFile] = await Promise.all([
    readText(sourceRoot, '_templates/mosque-detail.html'), readJson(sourceRoot, '_data/mosque_json.json'),
  ]);
  const mosques = validateMosques(mosqueFile.value);
  const plans = mosques.map((record) => ({ relativePath: record.destination, content: mosquePage(template, record) }));
  const staticUrls = ['', ...STATES.map((state) => `${state}/postcode.html`)];
  const sitemap = staticUrls.map((route) => sitemapEntry(`https://mosque-finder.com.au/${route}`));
  sitemap.push(...mosques.map((record) => sitemapEntry(`https://mosque-finder.com.au/mosque/${record.URLSegment}`)));
  plans.push({ relativePath: 'mosque/sitemap.xml', content: xmlDocument(sitemap) });
  await writePlans(outputRoot, plans);
  if (process.env.MOSQUE_FINDER_DRY_RUN !== '1') console.log(`Generated and verified ${mosques.length} non-empty mosque pages and 1 sitemap.`);
}

async function preflightBuild() {
  const previous = process.env.MOSQUE_FINDER_DRY_RUN;
  process.env.MOSQUE_FINDER_DRY_RUN = '1';
  try {
    await generateSuburbPages();
    await copyDataFiles();
    await generateStatePrayerTimeSitemap();
    await generateStateLists();
    await generateMosqueDetails();
  } finally {
    if (previous === undefined) delete process.env.MOSQUE_FINDER_DRY_RUN;
    else process.env.MOSQUE_FINDER_DRY_RUN = previous;
  }
  console.log('Preflight passed: all required inputs, renders, and destinations are valid; no files written.');
}

async function runCli(action) {
  try { await action(); }
  catch (error) {
    console.error(`Build failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  STATES, roots, safeDestination, validateInternalPath, safeWebsiteUrl, escapeHtml, escapeXml, safeJson, render,
  validateAndDedupeSuburbs, validateMosques, preflightPlans, writePlans,
  generateSuburbPages, copyDataFiles, generateStatePrayerTimeSitemap, generateStateLists, generateMosqueDetails, preflightBuild, runCli,
};
