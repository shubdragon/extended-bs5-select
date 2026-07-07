(function () {
  "use strict";

  /* ---------- Reusable factory: window.NCS.createSelect ---------- */
  window.NCS = window.NCS || {};

  NCS.createSelect = function (mountEl, options) {
    var items = options.items || [];               // [{value, label}]
    var placeholder = options.placeholder || "Select an option";
    var onChange = options.onChange || function () {};
    var selected = null;
    var highlightedIndex = -1;
    var filtered = items.slice();
    var api; // populated at the end of this function; referenced by selectItem()

    var wrapper = document.createElement("div");
    wrapper.className = "ncs-select-wrapper";

    wrapper.innerHTML =
      '<div class="ncs-control" tabindex="0" role="button" aria-haspopup="listbox">' +
        '<span class="ncs-control-value ncs-placeholder">' + placeholder + '</span>' +
        '<svg class="ncs-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
          '<path d="M6 9l6 6 6-6"/>' +
        '</svg>' +
      '</div>' +
      '<div class="ncs-panel">' +
        '<div class="ncs-search-box">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>' +
          '</svg>' +
          '<input type="text" class="ncs-search-input" placeholder="Search..." autocomplete="off">' +
        '</div>' +
        '<div class="ncs-options" role="listbox"></div>' +
      '</div>';

    mountEl.appendChild(wrapper);

    var controlEl = wrapper.querySelector(".ncs-control");
    var valueEl = wrapper.querySelector(".ncs-control-value");
    var searchInput = wrapper.querySelector(".ncs-search-input");
    var optionsEl = wrapper.querySelector(".ncs-options");

    function renderOptions() {
      optionsEl.innerHTML = "";
      if (filtered.length === 0) {
        var empty = document.createElement("div");
        empty.className = "ncs-empty";
        empty.textContent = "No results found";
        optionsEl.appendChild(empty);
        return;
      }
      filtered.forEach(function (item, idx) {
        var opt = document.createElement("div");
        opt.className = "ncs-option" +
          (selected && selected.value === item.value ? " ncs-selected" : "") +
          (idx === highlightedIndex ? " ncs-highlighted" : "");
        opt.setAttribute("role", "option");
        opt.dataset.index = idx;
        opt.innerHTML =
          '<span>' + item.label + '</span>' +
          '<svg class="ncs-option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M20 6L9 17l-5-5"/>' +
          '</svg>';
        opt.addEventListener("click", function () {
          selectItem(item);
        });
        optionsEl.appendChild(opt);
      });
    }

    function selectItem(item) {
      selected = item;
      valueEl.textContent = item.label;
      valueEl.classList.remove("ncs-placeholder");
      close();
      renderOptions();
      onChange(item, { el: mountEl, wrapper: wrapper, instance: api });
    }

    function open() {
      wrapper.classList.add("ncs-open");
      searchInput.value = "";
      filtered = items.slice();
      highlightedIndex = selected ? filtered.findIndex(function (i) { return i.value === selected.value; }) : -1;
      renderOptions();
      setTimeout(function () { searchInput.focus(); }, 0);
    }

    function close() {
      wrapper.classList.remove("ncs-open");
    }

    function toggle() {
      if (wrapper.classList.contains("ncs-open")) close(); else open();
    }

    controlEl.addEventListener("click", toggle);
    controlEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });

    searchInput.addEventListener("input", function () {
      var q = searchInput.value.trim().toLowerCase();
      filtered = items.filter(function (i) {
        return i.label.toLowerCase().indexOf(q) !== -1;
      });
      highlightedIndex = filtered.length ? 0 : -1;
      renderOptions();
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, filtered.length - 1);
        renderOptions();
        scrollHighlightedIntoView();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, 0);
        renderOptions();
        scrollHighlightedIntoView();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filtered[highlightedIndex]) selectItem(filtered[highlightedIndex]);
      } else if (e.key === "Escape") {
        close();
        controlEl.focus();
      }
    });

    function scrollHighlightedIntoView() {
      var el = optionsEl.querySelector(".ncs-highlighted");
      if (el) el.scrollIntoView({ block: "nearest" });
    }

    document.addEventListener("click", function (e) {
      if (!wrapper.contains(e.target)) close();
    });

    renderOptions();

    api = {
      getValue: function () { return selected; },
      setValue: function (value) {
        var found = items.find(function (i) { return i.value === value; });
        if (found) selectItem(found);
      },
      disable: function () { wrapper.classList.add("ncs-disabled"); },
      enable: function () { wrapper.classList.remove("ncs-disabled"); }
    };
    return api;
  };

  /* ---------- Multi-mount helper ----------
     Accepts: a CSS selector string, a jQuery collection,
     a NodeList, an array of elements, or a single element.
     Mounts one independent NCS instance per element and
     returns an array of instances (same order as matched).

     Usage:
       NCS.createSelectAll('.icon-select', { items: countries, ... });
       NCS.createSelectAll($('.icon-select'), { items: countries, ... });
  */
  NCS.createSelectAll = function (target, options) {
    var els;

    if (typeof target === "string") {
      els = document.querySelectorAll(target);
    } else if (target && typeof target.jquery === "string") {
      // jQuery object -> plain array of DOM elements
      els = target.toArray();
    } else if (target instanceof NodeList || Array.isArray(target)) {
      els = target;
    } else if (target instanceof HTMLElement) {
      els = [target];
    } else {
      els = [];
    }

    var instances = [];
    els.forEach(function (el) {
      // Guard: skip null/undefined entries or elements no longer in the DOM
      // (can happen with Alpine x-if/x-for timing, or stale references)
      if (!el || !(el instanceof HTMLElement) || !el.isConnected) return;
      // Avoid double-mounting if called twice on the same element
      if (el.dataset.ncsMounted === "1") return;
      el.dataset.ncsMounted = "1";
      instances.push(NCS.createSelect(el, options));
    });

    return instances;
  };
})();
