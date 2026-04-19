// ==UserScript==
// @author         Mike Diehn
// @name           Range Rings
// @category       Layer
// @version        1.0.0
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
    radiusMeters: 5000,
    circleCount: 5,
    center: null,
    color: '#00ffff',
    lineWeight: 1,
    lineStyle: 'solid',
    panelPosition: {
      left: 20,
      top: 20
    },
    panelCollapsed: false
  };

  rr.layerGroup = null;
  rr.centerMarker = null;
  rr.circles = [];
  rr.panel = null;
  rr.panelBody = null;
  rr.isLayerEnabled = true;
  rr.defaultMarkerIcon = null;

  rr.clampInteger = function (value, minValue, maxValue, fallbackValue) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallbackValue;
    if (n < minValue) return minValue;
    if (n > maxValue) return maxValue;
    return n;
  };

  rr.getDashArray = function () {
    switch (rr.settings.lineStyle) {
      case 'dashed':
        return '10,6';
      case 'dotted':
        return '2,6';
      case 'solid':
      default:
        return null;
    }
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

      if (parsed.panelPosition &&
          typeof parsed.panelPosition.left === 'number' &&
          typeof parsed.panelPosition.top === 'number') {
        rr.settings.panelPosition = {
          left: parsed.panelPosition.left,
          top: parsed.panelPosition.top
        };
      }

      if (typeof parsed.panelCollapsed === 'boolean') {
        rr.settings.panelCollapsed = parsed.panelCollapsed;
      }

      if (typeof parsed.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.color)) {
        rr.settings.color = parsed.color;
      }

      if (typeof parsed.lineStyle === 'string' &&
          ['solid', 'dashed', 'dotted'].indexOf(parsed.lineStyle) !== -1) {
        rr.settings.lineStyle = parsed.lineStyle;
      }

      rr.settings.radiusMeters = rr.clampInteger(parsed.radiusMeters, 1, 1000000, rr.settings.radiusMeters);
      rr.settings.circleCount = rr.clampInteger(parsed.circleCount, 1, 50, rr.settings.circleCount);
      rr.settings.lineWeight = rr.clampInteger(parsed.lineWeight, 1, 10, rr.settings.lineWeight);
    } catch (err) {
      console.warn('range-rings: failed to parse settings', err);
    }
  };

  rr.saveSettings = function () {
    localStorage.setItem(rr.storageKey, JSON.stringify(rr.settings));
  };

  rr.getCenter = function () {
    if (rr.settings.center &&
        typeof rr.settings.center.lat === 'number' &&
        typeof rr.settings.center.lng === 'number') {
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
    rr.syncPanel();
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
    const dashArray = rr.getDashArray();

    rr.clearDrawnItems();
    rr.createMarker(center);

    for (let i = 1; i <= rr.settings.circleCount; i += 1) {
      const circle = L.circle(center, {
        radius: rr.settings.radiusMeters * i,
        color: rr.settings.color,
        weight: rr.settings.lineWeight,
        opacity: 0.8,
        fill: false,
        interactive: false,
        dashArray: dashArray
      });

      rr.layerGroup.addLayer(circle);
      rr.circles.push(circle);
    }
  };

  rr.setRadius = function (value) {
    rr.settings.radiusMeters = rr.clampInteger(value, 0, 1000000, rr.settings.radiusMeters);
    rr.saveSettings();
    rr.redraw();
    rr.syncPanel();
  };

  rr.setCircleCount = function (value) {
    rr.settings.circleCount = rr.clampInteger(value, 1, 50, rr.settings.circleCount);
    rr.saveSettings();
    rr.redraw();
    rr.syncPanel();
  };

  rr.setColor = function (value) {
    if (!/^#[0-9a-fA-F]{6}$/.test(value)) return;
    rr.settings.color = value;
    rr.saveSettings();
    rr.redraw();
    rr.syncPanel();
  };

  rr.setLineWeight = function (value) {
    rr.settings.lineWeight = rr.clampInteger(value, 1, 10, rr.settings.lineWeight);
    rr.saveSettings();
    rr.redraw();
    rr.syncPanel();
  };

  rr.setLineStyle = function (value) {
    if (['solid', 'dashed', 'dotted'].indexOf(value) === -1) return;
    rr.settings.lineStyle = value;
    rr.saveSettings();
    rr.redraw();
    rr.syncPanel();
  };

  rr.useMapCenter = function () {
    rr.setCenter(window.map.getCenter());
  };

  rr.syncPanel = function () {
    if (!rr.panel) return;

    const radiusInput = rr.panel.querySelector('.range-rings-radius');
    const countInput = rr.panel.querySelector('.range-rings-count');
    const countValue = rr.panel.querySelector('.range-rings-count-value');
    const colorInput = rr.panel.querySelector('.range-rings-color');
    const weightInput = rr.panel.querySelector('.range-rings-weight');
    const styleInput = rr.panel.querySelector('.range-rings-style');
    const collapseButton = rr.panel.querySelector('.range-rings-collapse');

    if (radiusInput) radiusInput.value = String(rr.settings.radiusMeters);
    if (countInput) countInput.value = String(rr.settings.circleCount);
    if (countValue) countValue.textContent = String(rr.settings.circleCount);
    if (colorInput) colorInput.value = rr.settings.color;
    if (weightInput) weightInput.value = String(rr.settings.lineWeight);
    if (styleInput) styleInput.value = rr.settings.lineStyle;

    if (rr.panelBody) {
      rr.panelBody.style.display = rr.settings.panelCollapsed ? 'none' : 'block';
    }

    if (collapseButton) {
      collapseButton.textContent = rr.settings.panelCollapsed ? '+' : '−';
      collapseButton.title = rr.settings.panelCollapsed ? 'Show panel' : 'Hide panel';
    }

    rr.panel.style.left = rr.settings.panelPosition.left + 'px';
    rr.panel.style.top = rr.settings.panelPosition.top + 'px';
  };

  rr.togglePanelCollapsed = function () {
    rr.settings.panelCollapsed = !rr.settings.panelCollapsed;
    rr.saveSettings();
    rr.syncPanel();
  };

  rr.injectStyles = function () {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = `
      .range-rings-panel {
        position: absolute;
        z-index: 5000;
        background: rgba(8, 48, 78, 0.95);
        color: #fff;
        font-size: 12px;
        line-height: 1.4;
        min-width: 240px;
        border: 1px solid rgba(255,255,255,0.2);
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        user-select: none;
      }

      .range-rings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: move;
        padding: 6px 8px;
        font-weight: bold;
        background: rgba(255,255,255,0.08);
      }

      .range-rings-header-buttons {
        display: flex;
        gap: 4px;
      }

      .range-rings-header button {
        width: 22px;
        height: 22px;
        padding: 0;
        border: 1px solid rgba(255,255,255,0.25);
        background: rgba(255,255,255,0.08);
        color: #fff;
        cursor: pointer;
      }

      .range-rings-body {
        padding: 8px;
      }

      .range-rings-body label {
        display: block;
        margin-bottom: 8px;
      }

      .range-rings-body input,
      .range-rings-body select,
      .range-rings-body button {
        width: 100%;
        box-sizing: border-box;
        font-size: 12px;
      }

      .range-rings-count-label {
        margin-bottom: 2px;
      }

      .range-rings-action-button {
        margin-top: 4px;
      }

      .range-rings-style-row {
        display: flex;
        gap: 8px;
        align-items: end;
        margin-bottom: 8px;
      }

      .range-rings-style-row label {
        flex: 1 1 0;
        margin-bottom: 0;
      }

      .range-rings-style-row input,
      .range-rings-style-row select {
        width: 100%;
      }
      
      .range-rings-top-row {
        display: flex;
        gap: 8px;
        align-items: end;
        margin-bottom: 8px;
      }

      .range-rings-top-row > label,
      .range-rings-top-row > .range-rings-count-group {
        flex: 1 1 0;
        margin-bottom: 0;
      }

      .range-rings-count-group label {
        display: block;
        margin-bottom: 0;
      }
    `;
    document.head.appendChild(style);
  };

  rr.installPanel = function () {
    const mapContainer = window.map.getContainer();
    if (!mapContainer) return;

    if (window.getComputedStyle(mapContainer).position === 'static') {
      mapContainer.style.position = 'relative';
    }

    const panel = document.createElement('div');
    panel.className = 'range-rings-panel';
    panel.innerHTML = `
      <div class="range-rings-header">
        <span>Range Rings</span>
        <div class="range-rings-header-buttons">
          <button type="button" class="range-rings-collapse" title="Hide panel">−</button>
        </div>
      </div>
      <div class="range-rings-body">
      
        <div class="range-rings-top-row">
            <label>
                Ring Spacing (meters)
                <input class="range-rings-radius" type="number" min="0" step="500">
            </label>

            <div class="range-rings-count-group">
                <div class="range-rings-count-label">
                No. of Circles: <span class="range-rings-count-value"></span>
                </div>
                <label>
                <input class="range-rings-count" type="range" min="1" max="50" step="1">
                </label>
            </div>
        </div>

        <div class="range-rings-style-row">
          <label>
            Line color
            <input class="range-rings-color" type="color">
          </label>

          <label>
            Line width
            <input class="range-rings-weight" type="number" min="1" max="10" step="1">
          </label>

          <label>
            Line style
            <select class="range-rings-style">
              <option value="solid">solid</option>
              <option value="dashed">dashed</option>
              <option value="dotted">dotted</option>
            </select>
          </label>
        </div>

        <button class="range-rings-action-button range-rings-use-center" type="button">Center on map center</button>
      </div>
    `;

    mapContainer.appendChild(panel);

    L.DomEvent.disableClickPropagation(panel);
    L.DomEvent.disableScrollPropagation(panel);

    rr.panel = panel;
    rr.panelBody = panel.querySelector('.range-rings-body');

    const header = panel.querySelector('.range-rings-header');
    const collapseButton = panel.querySelector('.range-rings-collapse');
    const radiusInput = panel.querySelector('.range-rings-radius');
    const countInput = panel.querySelector('.range-rings-count');
    const colorInput = panel.querySelector('.range-rings-color');
    const weightInput = panel.querySelector('.range-rings-weight');
    const styleInput = panel.querySelector('.range-rings-style');
    const useCenterButton = panel.querySelector('.range-rings-use-center');

    [
      header,
      collapseButton,
      radiusInput,
      countInput,
      colorInput,
      weightInput,
      styleInput,
      useCenterButton
    ].forEach(function (el) {
      if (!el) return;
      L.DomEvent.on(el, 'mousedown touchstart pointerdown wheel', function (event) {
        L.DomEvent.stopPropagation(event);
      });
    });

    collapseButton.addEventListener('click', function (event) {
      event.stopPropagation();
      rr.togglePanelCollapsed();
    });

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

    colorInput.addEventListener('input', function () {
      rr.setColor(colorInput.value);
    });

    weightInput.addEventListener('change', function () {
      rr.setLineWeight(weightInput.value);
    });

    weightInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        rr.setLineWeight(weightInput.value);
      }
    });

    styleInput.addEventListener('change', function () {
      rr.setLineStyle(styleInput.value);
    });

    useCenterButton.addEventListener('click', function () {
      rr.useMapCenter();
    });

    rr.makePanelDraggable(header, panel);
    rr.syncPanel();
  };

  rr.makePanelDraggable = function (handle, panel) {
    let dragging = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onMouseMove = function (event) {
      if (!dragging) return;

      const newLeft = startLeft + (event.clientX - startMouseX);
      const newTop = startTop + (event.clientY - startMouseY);

      rr.settings.panelPosition.left = Math.max(0, newLeft);
      rr.settings.panelPosition.top = Math.max(0, newTop);

      panel.style.left = rr.settings.panelPosition.left + 'px';
      panel.style.top = rr.settings.panelPosition.top + 'px';
    };

    const onMouseUp = function () {
      if (!dragging) return;
      dragging = false;
      rr.saveSettings();
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
    };

    handle.addEventListener('mousedown', function (event) {
      if (event.button !== 0) return;
      if (event.target.tagName === 'BUTTON') return;

      dragging = true;
      startMouseX = event.clientX;
      startMouseY = event.clientY;
      startLeft = rr.settings.panelPosition.left;
      startTop = rr.settings.panelPosition.top;

      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);

      event.preventDefault();
      event.stopPropagation();
    });
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
    rr.installPanel();

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
