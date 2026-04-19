// ==UserScript==
// @author         Mike Diehn
// @name           Range Rings
// @category       Layer
// @version        0.1.0
// @description    Draw concentric range circles from a draggable center point.
// @id             range-rings@mdiehn
// @namespace      https://github.com/mdiehn/iitc-plugin-range-rings
// @downloadURL    https://raw.githubusercontent.com/mdiehn/iitc-plugin-range-rings/main/range-rings.user.js
// @updateURL      https://raw.githubusercontent.com/mdiehn/iitc-plugin-range-rings/main/range-rings.user.js
// @match          https://intel.ingress.com/*
// @grant          none
// ==/UserScript==

function wrapper(plugin_info) {
  'use strict';

  if (typeof window.plugin !== 'function') window.plugin = function () {};

  plugin_info.buildName = 'Range Rings';
  plugin_info.dateTimeVersion = '20260419150000';
  plugin_info.pluginId = 'iitc-plugin-range-rings@mdiehn';

  window.plugin.rangeRings = {};
  const rr = window.plugin.rangeRings;

  rr.layer = null;
  rr.centerMarker = null;
  rr.circles = [];
  rr.control = null;

  rr.settings = {
    enabled: true,
    radiusMeters: 500,
    count: 5,
    center: null
  };

  rr.save = function () {
    localStorage['plugin-range-rings-settings'] = JSON.stringify(rr.settings);
  };

  rr.load = function () {
    const raw = localStorage['plugin-range-rings-settings'];
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        rr.settings = Object.assign({}, rr.settings, parsed);
      }
    } catch (e) {
      console.warn('range-rings: failed to load settings', e);
    }
  };

  rr.ensureCenter = function () {
    if (
      rr.settings.center &&
      typeof rr.settings.center.lat === 'number' &&
      typeof rr.settings.center.lng === 'number'
    ) {
      return L.latLng(rr.settings.center.lat, rr.settings.center.lng);
    }

    const c = window.map.getCenter();
    rr.settings.center = { lat: c.lat, lng: c.lng };
    rr.save();
    return c;
  };

  rr.clearCircles = function () {
    rr.circles.forEach(circle => rr.layer.removeLayer(circle));
    rr.circles = [];
  };

  rr.draw = function () {
    if (!rr.layer) return;

    rr.clearCircles();

    if (!rr.settings.enabled) return;

    const center = rr.ensureCenter();

    for (let i = 1; i <= rr.settings.count; i++) {
      const circle = L.circle(center, {
        radius: rr.settings.radiusMeters * i,
        color: '#00ffff',
        weight: 1,
        opacity: 0.8,
        fill: false,
        interactive: false
      });

      circle.addTo(rr.layer);
      rr.circles.push(circle);
    }

    if (rr.centerMarker) {
      rr.centerMarker.setLatLng(center);
    }
  };

  rr.updateCenter = function (latlng) {
    rr.settings.center = { lat: latlng.lat, lng: latlng.lng };
    rr.save();
    rr.draw();
    rr.syncUI();
  };

  rr.makeCenterMarker = function () {
    const center = rr.ensureCenter();

    rr.centerMarker = L.marker(center, {
      draggable: true,
      autoPan: true,
      title: 'Range Rings center'
    });

    rr.centerMarker.on('drag dragend', function (ev) {
      rr.updateCenter(ev.target.getLatLng());
    });

    rr.centerMarker.addTo(rr.layer);
  };

  rr.syncUI = function () {
    if (!rr.control || !rr.control._container) return;

    const box = rr.control._container;

    const radiusInput = box.querySelector('.range-rings-radius');
    const countInput = box.querySelector('.range-rings-count');
    const countValue = box.querySelector('.range-rings-count-value');
    const enabledInput = box.querySelector('.range-rings-enabled');

    if (radiusInput) radiusInput.value = rr.settings.radiusMeters;
    if (countInput) countInput.value = rr.settings.count;
    if (countValue) countValue.textContent = rr.settings.count;
    if (enabledInput) enabledInput.checked = !!rr.settings.enabled;
  };

  rr.installControl = function () {
    const RangeRingsControl = L.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar range-rings-control');
        div.style.background = 'rgba(8, 48, 78, 0.95)';
        div.style.color = '#fff';
        div.style.padding = '8px';
        div.style.minWidth = '220px';
        div.style.fontSize = '12px';

        div.innerHTML = `
          <div style="font-weight:bold; margin-bottom:6px;">Range Rings</div>

          <label style="display:block; margin-bottom:6px;">
            <input type="checkbox" class="range-rings-enabled" />
            enabled
          </label>

          <label style="display:block; margin-bottom:6px;">
            radius (m)
            <input type="number" class="range-rings-radius" min="1" step="1" style="width:100%; box-sizing:border-box;" />
          </label>

          <label style="display:block; margin-bottom:6px;">
            circles: <span class="range-rings-count-value"></span>
            <input type="range" class="range-rings-count" min="1" max="20" step="1" style="width:100%;" />
          </label>

          <button type="button" class="range-rings-center-map" style="width:100%; margin-bottom:4px;">
            use map center
          </button>
        `;

        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);

        const enabledInput = div.querySelector('.range-rings-enabled');
        const radiusInput = div.querySelector('.range-rings-radius');
        const countInput = div.querySelector('.range-rings-count');
        const centerBtn = div.querySelector('.range-rings-center-map');

        enabledInput.addEventListener('change', function () {
          rr.settings.enabled = enabledInput.checked;
          rr.save();
          rr.draw();
        });

        radiusInput.addEventListener('change', function () {
          const v = parseInt(radiusInput.value, 10);
          if (!Number.isFinite(v) || v < 1) return;
          rr.settings.radiusMeters = v;
          rr.save();
          rr.draw();
        });

        countInput.addEventListener('input', function () {
          const v = parseInt(countInput.value, 10);
          if (!Number.isFinite(v) || v < 1) return;
          rr.settings.count = v;
          rr.save();
          rr.draw();
        });

        centerBtn.addEventListener('click', function () {
          rr.updateCenter(window.map.getCenter());
        });

        return div;
      }
    });

    rr.control = new RangeRingsControl();
    window.map.addControl(rr.control);
    rr.syncUI();
  };

  rr.setupCSS = function () {
    $('<style>')
      .prop('type', 'text/css')
      .html(`
        .range-rings-control input,
        .range-rings-control button {
          font-size: 12px;
        }
      `)
      .appendTo('head');
  };

  rr.setup = function () {
    rr.load();
    rr.setupCSS();

    rr.layer = new L.LayerGroup();
    window.addLayerGroup('Range Rings', rr.layer, true);

    rr.makeCenterMarker();
    rr.draw();
    rr.installControl();
  };

  const setup = rr.setup;
  setup.info = plugin_info;

  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);
  if (window.iitcLoaded && typeof setup === 'function') setup();
}

const script = document.createElement('script');
const info = {};
if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}
script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);