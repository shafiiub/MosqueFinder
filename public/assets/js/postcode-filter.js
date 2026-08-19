(function () {
  'use strict';
  var directory = document.querySelector('[data-postcode-directory]');
  if (!directory) return;
  var input = directory.querySelector('[data-postcode-filter]');
  var tools = directory.querySelector('[data-postcode-tools]');
  var items = Array.prototype.slice.call(directory.querySelectorAll('[data-postcode-item]'));
  var count = directory.querySelector('[data-visible-count]');
  var empty = directory.querySelector('[data-postcode-empty]');
  if (!input || !tools || !count || !empty) return;
  tools.hidden = false;
  function filterLocations() {
    var query = input.value.trim().toLocaleLowerCase();
    var visible = 0;
    items.forEach(function (item) {
      var matches = !query || item.textContent.toLocaleLowerCase().indexOf(query) !== -1;
      item.hidden = !matches;
      if (matches) visible += 1;
    });
    count.textContent = String(visible);
    empty.hidden = visible !== 0;
  }
  input.addEventListener('input', filterLocations);
}());
