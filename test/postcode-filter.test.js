'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

function runFilterScript(labels) {
  let inputHandler;
  const input = { value: '', addEventListener(event, handler) { if (event === 'input') inputHandler = handler; } };
  const tools = { hidden: true };
  const count = { textContent: String(labels.length) };
  const empty = { hidden: true };
  const items = labels.map((textContent) => ({ textContent, hidden: false }));
  const selectors = {
    '[data-postcode-filter]': input, '[data-postcode-tools]': tools,
    '[data-visible-count]': count, '[data-postcode-empty]': empty,
  };
  const directory = {
    querySelector(selector) { return selectors[selector]; },
    querySelectorAll(selector) { return selector === '[data-postcode-item]' ? items : []; },
  };
  const document = { querySelector(selector) { return selector === '[data-postcode-directory]' ? directory : null; } };
  const source = fs.readFileSync(path.join(__dirname, '../public/assets/js/postcode-filter.js'), 'utf8');
  vm.runInNewContext(source, { document, Array, String });
  return { input, tools, count, empty, items, filter: inputHandler };
}

test('postcode filter progressively enables and matches postcode or suburb', () => {
  const page = runFilterScript(['2000 Sydney', '2150 Parramatta']);
  assert.equal(page.tools.hidden, false);
  assert.equal(typeof page.filter, 'function');

  page.input.value = 'parra';
  page.filter();
  assert.deepEqual(page.items.map((item) => item.hidden), [true, false]);
  assert.equal(page.count.textContent, '1');
  assert.equal(page.empty.hidden, true);

  page.input.value = '9999';
  page.filter();
  assert.deepEqual(page.items.map((item) => item.hidden), [true, true]);
  assert.equal(page.count.textContent, '0');
  assert.equal(page.empty.hidden, false);

  page.input.value = '';
  page.filter();
  assert.deepEqual(page.items.map((item) => item.hidden), [false, false]);
});
