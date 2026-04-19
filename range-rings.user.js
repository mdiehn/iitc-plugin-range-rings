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

  if (typeof window.plugin !== 'function') {
    window.plugin = function () {};
  }

  window.plugin.rangeRings = {};
  const rr = window.plugin.rangeRings;

  rr.pluginInfo = plugin_info;
  rr.storageKey = 'plugin-range-rings-settings';

  rr.settings = {
    radiusMeters: 500,
    circleCount: 5,
    center: null
  };

  rr.layerGroup = null;
  rr.centerMarker = null;
  rr.circles = [];
  rr.control = null;
  rr.isLayerEnabled = true;

  rr.defaultMarkerIcon = null;

  rr.clampInteger = function (value, minValue, maxValue, fallbackValue) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallbackValue;
    if (n < minValue) return minValue;
    if (n > maxValue) return maxValue;
    return n;
  };

  rr.loadSettings = function () {
    const raw = localStorage.getItem(rr.storageKey);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;

      if (parsed.center && typeof parsed.center.lat === 'number' && typeof parsed.center.lng === 'number') {
        rr.settings.center = {
          lat: parsed.center.lat,
          lng: parsed.center.lng
        };
      }

      rr.settings.radiusMeters = rr.clampInteger(parsed.radiusMeters, 1, 1000000, rr.settings.radiusMeters);
      rr.settings.circleCount = rr.clampInteger(parsed.circleCount, 1, 50, rr.settings.circleCount);
    } catch (err) {
      console.warn('range-rings: failed to parse settings', err);
    }
  };

  rr.saveSettings = function () {
    localStorage.setItem(rr.storageKey, JSON.stringify(rr.settings));
  };

  rr.getCenter = function () {
    if (rr.settings.center && typeof rr.settings.center.lat === 'number' && typeof rr.settings.center.lng === 'number') {
      return L.latLng(rr.settings.center.lat, rr.settings.center.lng);
    }

    const mapCenter = window.map.getCenter();
    rr.settings.center = {
      lat: mapCenter.lat,
      lng: mapCenter.lng
    };
    rr.saveSettings();
    return mapCenter;
  };

  rr.setCenter = function (latlng) {
    rr.settings.center = {
      lat: latlng.lat,
      lng: latlng.lng
    };
    rr.saveSettings();
    rr.redraw();
    rr.syncControl();
  };

  rr.clearDrawnItems = function () {
    if (rr.centerMarker) {
      rr.layerGroup.removeLayer(rr.centerMarker);
      rr.centerMarker.off();
      rr.centerMarker = null;
    }

    rr.circles.forEach(function (circle) {
      rr.layerGroup.removeLayer(circle);
    });
    rr.circles = [];
  };

  rr.createMarker = function (center) {
    rr.centerMarker = L.marker(center, {
      draggable: true,
      autoPan: true,
      keyboard: false,
      title: 'Range Rings center',
      icon: rr.defaultMarkerIcon
    });

    rr.centerMarker.on('drag', function (event) {
      rr.updateCirclePositions(event.target.getLatLng());
    });

    rr.centerMarker.on('dragend', function (event) {
      rr.setCenter(event.target.getLatLng());
    });

    rr.layerGroup.addLayer(rr.centerMarker);
  };

  rr.updateCirclePositions = function (center) {
    rr.circles.forEach(function (circle) {
      circle.setLatLng(center);
    });
  };

  rr.redraw = function () {
    if (!rr.layerGroup) return;
    if (!rr.isLayerEnabled) {
      rr.clearDrawnItems();
      return;
    }

    const center = rr.getCenter();

    rr.clearDrawnItems();
    rr.createMarker(center);

    for (let i = 1; i <= rr.settings.circleCount; i += 1) {
      const circle = L.circle(center, {
        radius: rr.settings.radiusMeters * i,
        color: '#00ffff',
        weight: 1,
        opacity: 0.8,
        fill: false,
        interactive: false
      });

      rr.layerGroup.addLayer(circle);
      rr.circles.push(circle);
    }
  };

  rr.syncControl = function () {
    if (!rr.control || !rr.control._container) return;

    const container = rr.control._container;
    const radiusInput = container.querySelector('.range-rings-radius');
    const countInput = container.querySelector('.range-rings-count');
    const countValue = container.querySelector('.range-rings-count-value');

    if (radiusInput) {
      radiusInput.value = String(rr.settings.radiusMeters);
    }

    if (countInput) {
      countInput.value = String(rr.settings.circleCount);
    }

    if (countValue) {
      countValue.textContent = String(rr.settings.circleCount);
    }
  };

  rr.setRadius = function (value) {
    rr.settings.radiusMeters = rr.clampInteger(value, 1, 1000000, rr.settings.radiusMeters);
    rr.saveSettings();
    rr.redraw();
    rr.syncControl();
  };

  rr.setCircleCount = function (value) {
    rr.settings.circleCount = rr.clampInteger(value, 1, 50, rr.settings.circleCount);
    rr.saveSettings();
    rr.redraw();
    rr.syncControl();
  };

  rr.useMapCenter = function () {
    rr.setCenter(window.map.getCenter());
  };

  rr.injectStyles = function () {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = `
      .range-rings-control {
        background: rgba(8, 48, 78, 0.95);
        color: #fff;
        padding: 8px;
        min-width: 220px;
        font-size: 12px;
        line-height: 1.4;
      }

      .range-rings-control .range-rings-title {
        font-weight: bold;
        margin-bottom: 6px;
      }

      .range-rings-control label {
        display: block;
        margin-bottom: 6px;
      }

      .range-rings-control input,
      .range-rings-control button {
        width: 100%;
        box-sizing: border-box;
        font-size: 12px;
      }

      .range-rings-control button {
        margin-top: 2px;
      }

      .range-rings-control .range-rings-count-label {
        margin-bottom: 2px;
      }
    `;
    document.head.appendChild(style);
  };

  rr.installControl = function () {
    const RangeRingsControl = L.Control.extend({
      options: {
        position: 'topright'
      },

      onAdd: function () {
        const container = L.DomUtil.create('div', 'leaflet-bar range-rings-control');

        container.innerHTML = `
          <div class="range-rings-title">Range Rings</div>

          <label>
            radius (m)
            <input class="range-rings-radius" type="number" min="1" step="1">
          </label>

          <div class="range-rings-count-label">
            circles: <span class="range-rings-count-value"></span>
          </div>
          <label>
            <input class="range-rings-count" type="range" min="1" max="50" step="1">
          </label>

          <button class="range-rings-use-center" type="button">use map center</button>
        `;

        L.DomEvent.disableClickPropagation(container);
        L.DomEvent.disableScrollPropagation(container);

        const radiusInput = container.querySelector('.range-rings-radius');
        const countInput = container.querySelector('.range-rings-count');
        const useCenterButton = container.querySelector('.range-rings-use-center');

        radiusInput.addEventListener('change', function () {
          rr.setRadius(radiusInput.value);
        });

        radiusInput.addEventListener('keydown', function (event) {
          if (event.key === 'Enter') {
            rr.setRadius(radiusInput.value);
          }
        });

        countInput.addEventListener('input', function () {
          rr.setCircleCount(countInput.value);
        });

        useCenterButton.addEventListener('click', function () {
          rr.useMapCenter();
        });

        return container;
      }
    });

    rr.control = new RangeRingsControl();
    window.map.addControl(rr.control);
    rr.syncControl();
  };

  rr.onLayerAdd = function () {
    rr.isLayerEnabled = true;
    rr.redraw();
  };

  rr.onLayerRemove = function () {
    rr.isLayerEnabled = false;
    rr.clearDrawnItems();
  };

  rr.setupLayerTracking = function () {
    window.map.on('layeradd', function (event) {
      if (event.layer === rr.layerGroup) {
        rr.onLayerAdd();
      }
    });

    window.map.on('layerremove', function (event) {
      if (event.layer === rr.layerGroup) {
        rr.onLayerRemove();
      }
    });
  };

  rr.setup = function () {
    rr.loadSettings();
    rr.injectStyles();

    rr.defaultMarkerIcon = new L.Icon.Default();
    rr.layerGroup = new L.LayerGroup();

    rr.setupLayerTracking();
    window.addLayerGroup('Range Rings', rr.layerGroup, true);
    rr.installControl();

    rr.isLayerEnabled = window.map.hasLayer(rr.layerGroup);
    if (rr.isLayerEnabled) {
      rr.redraw();
    }
  };

  const setup = rr.setup;
  setup.info = plugin_info;

  if (!window.bootPlugins) {
    window.bootPlugins = [];
  }
  window.bootPlugins.push(setup);

  if (window.iitcLoaded && typeof setup === 'function') {
    setup();
  }
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