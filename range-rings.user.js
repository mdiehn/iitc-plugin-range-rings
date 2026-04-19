// ==UserScript==
// @author         Mike Diehn
// @name           Range Rings
// @category       Layer
// @version        1.0.1
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

  // --------------------------------------------------------------------------
  // constants / defaults
  // --------------------------------------------------------------------------

  rr.constants = {
    storageKey: 'plugin-range-rings-settings',
    layerName: 'Range Rings',
    panelTitle: 'Range Rings',
    minSpacingMeters: 0,
    maxSpacingMeters: 1000000,
    minCircleCount: 1,
    maxCircleCount: 50,
    minLineWeight: 1,
    maxLineWeight: 10
  };

  rr.defaults = {
    ringSet: {
      center: null,
      spacingMeters: 5000,
      circleCount: 5,
      color: '#00ffff',
      lineWeight: 1,
      lineStyle: 'solid'
    },
    panelPosition: {
      left: 20,
      top: 20
    },
    panelCollapsed: false
  };

  // --------------------------------------------------------------------------
  // state
  // --------------------------------------------------------------------------

  rr.state = {
    layerGroup: null,
    isLayerEnabled: true,
    defaultMarkerIcon: null,

    panel: null,
    panelBody: null,

    ringSets: [],
    activeSetId: null
  };

  // --------------------------------------------------------------------------
  // utilities
  // --------------------------------------------------------------------------

  rr.util = {};

  rr.util.clampInteger = function (value, minValue, maxValue, fallbackValue) {
    const n = parseInt(value, 10);
    if (!Number.isFinite(n)) return fallbackValue;
    if (n < minValue) return minValue;
    if (n > maxValue) return maxValue;
    return n;
  };

  rr.util.isValidColor = function (value) {
    return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  };

  rr.util.isValidLineStyle = function (value) {
    return ['solid', 'dashed', 'dotted'].indexOf(value) !== -1;
  };

  rr.util.getDashArray = function (lineStyle) {
    switch (lineStyle) {
      case 'dashed':
        return '10,6';
      case 'dotted':
        return '2,6';
      case 'solid':
      default:
        return null;
    }
  };

  rr.util.makeSetId = function () {
    return 'set-' + Date.now() + '-' + Math.floor(Math.random() * 1000000);
  };

  // --------------------------------------------------------------------------
  // model
  // --------------------------------------------------------------------------

  rr.model = {};

  rr.model.createRingSet = function (overrides) {
    const set = {
      id: rr.util.makeSetId(),
      center: rr.defaults.ringSet.center,
      spacingMeters: rr.defaults.ringSet.spacingMeters,
      circleCount: rr.defaults.ringSet.circleCount,
      color: rr.defaults.ringSet.color,
      lineWeight: rr.defaults.ringSet.lineWeight,
      lineStyle: rr.defaults.ringSet.lineStyle,

      marker: null,
      circles: []
    };

    if (overrides && typeof overrides === 'object') {
      if (overrides.id) set.id = overrides.id;

      if (
        overrides.center &&
        typeof overrides.center.lat === 'number' &&
        typeof overrides.center.lng === 'number'
      ) {
        set.center = {
          lat: overrides.center.lat,
          lng: overrides.center.lng
        };
      }

      if (rr.util.isValidColor(overrides.color)) {
        set.color = overrides.color;
      }

      if (rr.util.isValidLineStyle(overrides.lineStyle)) {
        set.lineStyle = overrides.lineStyle;
      }

      set.spacingMeters = rr.util.clampInteger(
        overrides.spacingMeters,
        rr.constants.minSpacingMeters,
        rr.constants.maxSpacingMeters,
        set.spacingMeters
      );

      set.circleCount = rr.util.clampInteger(
        overrides.circleCount,
        rr.constants.minCircleCount,
        rr.constants.maxCircleCount,
        set.circleCount
      );

      set.lineWeight = rr.util.clampInteger(
        overrides.lineWeight,
        rr.constants.minLineWeight,
        rr.constants.maxLineWeight,
        set.lineWeight
      );
    }

    return set;
  };

  rr.model.getActiveSet = function () {
    if (!rr.state.activeSetId) return null;

    for (let i = 0; i < rr.state.ringSets.length; i += 1) {
      if (rr.state.ringSets[i].id === rr.state.activeSetId) {
        return rr.state.ringSets[i];
      }
    }

    return null;
  };

  rr.model.ensureActiveSet = function () {
    let activeSet = rr.model.getActiveSet();

    if (activeSet) {
      return activeSet;
    }

    if (rr.state.ringSets.length === 0) {
      const newSet = rr.model.createRingSet();
      rr.state.ringSets.push(newSet);
      rr.state.activeSetId = newSet.id;
      return newSet;
    }

    rr.state.activeSetId = rr.state.ringSets[0].id;
    return rr.state.ringSets[0];
  };

  rr.model.getSetCenterLatLng = function (set) {
    if (
      set.center &&
      typeof set.center.lat === 'number' &&
      typeof set.center.lng === 'number'
    ) {
      return L.latLng(set.center.lat, set.center.lng);
    }

    const mapCenter = window.map.getCenter();
    set.center = {
      lat: mapCenter.lat,
      lng: mapCenter.lng
    };
    rr.storage.save();
    return mapCenter;
  };

  rr.model.setCenter = function (set, latlng) {
    set.center = {
      lat: latlng.lat,
      lng: latlng.lng
    };
    rr.storage.save();
    rr.render.redrawAll();
    rr.ui.syncPanel();
  };

  // --------------------------------------------------------------------------
  // storage
  // --------------------------------------------------------------------------

  rr.storage = {};

  rr.storage.load = function () {
    const raw = localStorage.getItem(rr.constants.storageKey);
    if (!raw) {
      rr.state.ringSets = [rr.model.createRingSet()];
      rr.state.activeSetId = rr.state.ringSets[0].id;
      return;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('invalid saved data');
      }

      const panelPosition = parsed.panelPosition;
      if (
        panelPosition &&
        typeof panelPosition.left === 'number' &&
        typeof panelPosition.top === 'number'
      ) {
        rr.defaults.panelPosition = {
          left: panelPosition.left,
          top: panelPosition.top
        };
      }

      if (typeof parsed.panelCollapsed === 'boolean') {
        rr.defaults.panelCollapsed = parsed.panelCollapsed;
      }

      if (Array.isArray(parsed.ringSets) && parsed.ringSets.length > 0) {
        rr.state.ringSets = parsed.ringSets.map(function (savedSet) {
          return rr.model.createRingSet(savedSet);
        });

        rr.state.activeSetId = parsed.activeSetId || rr.state.ringSets[0].id;
        rr.model.ensureActiveSet();
        return;
      }

      // Backward-compatible load of older single-set format
      const oldStyleSet = rr.model.createRingSet({
        center: parsed.center,
        spacingMeters: parsed.radiusMeters,
        circleCount: parsed.circleCount,
        color: parsed.color,
        lineWeight: parsed.lineWeight,
        lineStyle: parsed.lineStyle
      });

      rr.state.ringSets = [oldStyleSet];
      rr.state.activeSetId = oldStyleSet.id;
    } catch (err) {
      console.warn('range-rings: failed to parse settings', err);
      rr.state.ringSets = [rr.model.createRingSet()];
      rr.state.activeSetId = rr.state.ringSets[0].id;
    }
  };

  rr.storage.save = function () {
    const payload = {
      ringSets: rr.state.ringSets.map(function (set) {
        return {
          id: set.id,
          center: set.center,
          spacingMeters: set.spacingMeters,
          circleCount: set.circleCount,
          color: set.color,
          lineWeight: set.lineWeight,
          lineStyle: set.lineStyle
        };
      }),
      activeSetId: rr.state.activeSetId,
      panelPosition: rr.ui.getPanelPosition(),
      panelCollapsed: rr.ui.isPanelCollapsed()
    };

    localStorage.setItem(rr.constants.storageKey, JSON.stringify(payload));
  };

  // --------------------------------------------------------------------------
  // rendering
  // --------------------------------------------------------------------------

  rr.render = {};

  rr.render.clearSet = function (set) {
    if (set.marker) {
      rr.state.layerGroup.removeLayer(set.marker);
      set.marker.off();
      set.marker = null;
    }

    set.circles.forEach(function (circle) {
      rr.state.layerGroup.removeLayer(circle);
    });
    set.circles = [];
  };

  rr.render.clearAll = function () {
    rr.state.ringSets.forEach(function (set) {
      rr.render.clearSet(set);
    });
  };

  rr.render.createMarker = function (set, center) {
    set.marker = L.marker(center, {
      draggable: true,
      autoPan: true,
      keyboard: false,
      title: 'Range Rings center',
      icon: rr.state.defaultMarkerIcon
    });

    set.marker.on('drag', function (event) {
      rr.render.updateCirclePositions(set, event.target.getLatLng());
    });

    set.marker.on('dragend', function (event) {
      rr.model.setCenter(set, event.target.getLatLng());
    });

    rr.state.layerGroup.addLayer(set.marker);
  };

  rr.render.updateCirclePositions = function (set, center) {
    set.circles.forEach(function (circle) {
      circle.setLatLng(center);
    });
  };

  rr.render.drawSet = function (set) {
    const center = rr.model.getSetCenterLatLng(set);
    const dashArray = rr.util.getDashArray(set.lineStyle);

    rr.render.clearSet(set);
    rr.render.createMarker(set, center);

    for (let i = 1; i <= set.circleCount; i += 1) {
      const circle = L.circle(center, {
        radius: set.spacingMeters * i,
        color: set.color,
        weight: set.lineWeight,
        opacity: 0.8,
        fill: false,
        interactive: false,
        dashArray: dashArray
      });

      rr.state.layerGroup.addLayer(circle);
      set.circles.push(circle);
    }
  };

  rr.render.redrawAll = function () {
    if (!rr.state.layerGroup) return;

    if (!rr.state.isLayerEnabled) {
      rr.render.clearAll();
      return;
    }

    rr.state.ringSets.forEach(function (set) {
      rr.render.drawSet(set);
    });
  };

  // --------------------------------------------------------------------------
  // UI
  // --------------------------------------------------------------------------

  rr.ui = {};

  rr.ui.getPanelPosition = function () {
    if (!rr.state.panel) {
      return {
        left: rr.defaults.panelPosition.left,
        top: rr.defaults.panelPosition.top
      };
    }

    return {
      left: parseInt(rr.state.panel.style.left || rr.defaults.panelPosition.left, 10),
      top: parseInt(rr.state.panel.style.top || rr.defaults.panelPosition.top, 10)
    };
  };

  rr.ui.isPanelCollapsed = function () {
    if (!rr.state.panelBody) {
      return rr.defaults.panelCollapsed;
    }

    return rr.state.panelBody.style.display === 'none';
  };

  rr.ui.injectStyles = function () {
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
        min-width: 260px;
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

      .range-rings-count-label {
        margin-bottom: 2px;
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

      .range-rings-action-button {
        margin-top: 4px;
      }
    `;
    document.head.appendChild(style);
  };

  rr.ui.syncPanel = function () {
    if (!rr.state.panel) return;

    const activeSet = rr.model.ensureActiveSet();
    const panel = rr.state.panel;

    const spacingInput = panel.querySelector('.range-rings-spacing');
    const countInput = panel.querySelector('.range-rings-count');
    const countValue = panel.querySelector('.range-rings-count-value');
    const colorInput = panel.querySelector('.range-rings-color');
    const weightInput = panel.querySelector('.range-rings-weight');
    const styleInput = panel.querySelector('.range-rings-style');
    const collapseButton = panel.querySelector('.range-rings-collapse');

    if (spacingInput) spacingInput.value = String(activeSet.spacingMeters);
    if (countInput) countInput.value = String(activeSet.circleCount);
    if (countValue) countValue.textContent = String(activeSet.circleCount);
    if (colorInput) colorInput.value = activeSet.color;
    if (weightInput) weightInput.value = String(activeSet.lineWeight);
    if (styleInput) styleInput.value = activeSet.lineStyle;

    if (rr.state.panelBody) {
      rr.state.panelBody.style.display = rr.defaults.panelCollapsed ? 'none' : 'block';
    }

    if (collapseButton) {
      collapseButton.textContent = rr.defaults.panelCollapsed ? '+' : '−';
      collapseButton.title = rr.defaults.panelCollapsed ? 'Show panel' : 'Hide panel';
    }

    panel.style.left = rr.defaults.panelPosition.left + 'px';
    panel.style.top = rr.defaults.panelPosition.top + 'px';
  };

  rr.ui.togglePanelCollapsed = function () {
    rr.defaults.panelCollapsed = !rr.defaults.panelCollapsed;
    rr.storage.save();
    rr.ui.syncPanel();
  };

  rr.ui.installPanel = function () {
    const mapContainer = window.map.getContainer();
    if (!mapContainer) return;

    if (window.getComputedStyle(mapContainer).position === 'static') {
      mapContainer.style.position = 'relative';
    }

    const panel = document.createElement('div');
    panel.className = 'range-rings-panel';
    panel.innerHTML = `
      <div class="range-rings-header">
        <span>${rr.constants.panelTitle}</span>
        <div class="range-rings-header-buttons">
          <button type="button" class="range-rings-collapse" title="Hide panel">−</button>
        </div>
      </div>
      <div class="range-rings-body">
        <div class="range-rings-top-row">
          <label>
            Ring Spacing (meters)
            <input class="range-rings-spacing" type="number" min="0" step="500">
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
            Line Color
            <input class="range-rings-color" type="color">
          </label>

          <label>
            Line Width
            <input class="range-rings-weight" type="number" min="1" max="10" step="1">
          </label>

          <label>
            Line Style
            <select class="range-rings-style">
              <option value="solid">solid</option>
              <option value="dashed">dashed</option>
              <option value="dotted">dotted</option>
            </select>
          </label>
        </div>

        <button class="range-rings-action-button range-rings-use-center" type="button">Center on Map Center</button>
      </div>
    `;

    mapContainer.appendChild(panel);

    L.DomEvent.disableClickPropagation(panel);
    L.DomEvent.disableScrollPropagation(panel);

    rr.state.panel = panel;
    rr.state.panelBody = panel.querySelector('.range-rings-body');

    const header = panel.querySelector('.range-rings-header');
    const collapseButton = panel.querySelector('.range-rings-collapse');
    const spacingInput = panel.querySelector('.range-rings-spacing');
    const countInput = panel.querySelector('.range-rings-count');
    const colorInput = panel.querySelector('.range-rings-color');
    const weightInput = panel.querySelector('.range-rings-weight');
    const styleInput = panel.querySelector('.range-rings-style');
    const useCenterButton = panel.querySelector('.range-rings-use-center');

    [
      header,
      collapseButton,
      spacingInput,
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
      rr.ui.togglePanelCollapsed();
    });

    spacingInput.addEventListener('change', function () {
      rr.actions.setSpacing(spacingInput.value);
    });

    spacingInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        rr.actions.setSpacing(spacingInput.value);
      }
    });

    countInput.addEventListener('input', function () {
      rr.actions.setCircleCount(countInput.value);
    });

    colorInput.addEventListener('input', function () {
      rr.actions.setColor(colorInput.value);
    });

    weightInput.addEventListener('change', function () {
      rr.actions.setLineWeight(weightInput.value);
    });

    weightInput.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        rr.actions.setLineWeight(weightInput.value);
      }
    });

    styleInput.addEventListener('change', function () {
      rr.actions.setLineStyle(styleInput.value);
    });

    useCenterButton.addEventListener('click', function () {
      rr.actions.centerOnMapCenter();
    });

    rr.interaction.makePanelDraggable(header, panel);
    rr.ui.syncPanel();
  };

  // --------------------------------------------------------------------------
  // actions
  // --------------------------------------------------------------------------

  rr.actions = {};

  rr.actions.setSpacing = function (value) {
    const activeSet = rr.model.ensureActiveSet();
    activeSet.spacingMeters = rr.util.clampInteger(
      value,
      rr.constants.minSpacingMeters,
      rr.constants.maxSpacingMeters,
      activeSet.spacingMeters
    );
    rr.storage.save();
    rr.render.redrawAll();
    rr.ui.syncPanel();
  };

  rr.actions.setCircleCount = function (value) {
    const activeSet = rr.model.ensureActiveSet();
    activeSet.circleCount = rr.util.clampInteger(
      value,
      rr.constants.minCircleCount,
      rr.constants.maxCircleCount,
      activeSet.circleCount
    );
    rr.storage.save();
    rr.render.redrawAll();
    rr.ui.syncPanel();
  };

  rr.actions.setColor = function (value) {
    const activeSet = rr.model.ensureActiveSet();
    if (!rr.util.isValidColor(value)) return;
    activeSet.color = value;
    rr.storage.save();
    rr.render.redrawAll();
    rr.ui.syncPanel();
  };

  rr.actions.setLineWeight = function (value) {
    const activeSet = rr.model.ensureActiveSet();
    activeSet.lineWeight = rr.util.clampInteger(
      value,
      rr.constants.minLineWeight,
      rr.constants.maxLineWeight,
      activeSet.lineWeight
    );
    rr.storage.save();
    rr.render.redrawAll();
    rr.ui.syncPanel();
  };

  rr.actions.setLineStyle = function (value) {
    const activeSet = rr.model.ensureActiveSet();
    if (!rr.util.isValidLineStyle(value)) return;
    activeSet.lineStyle = value;
    rr.storage.save();
    rr.render.redrawAll();
    rr.ui.syncPanel();
  };

  rr.actions.centerOnMapCenter = function () {
    const activeSet = rr.model.ensureActiveSet();
    rr.model.setCenter(activeSet, window.map.getCenter());
  };

  // --------------------------------------------------------------------------
  // interaction
  // --------------------------------------------------------------------------

  rr.interaction = {};

  rr.interaction.makePanelDraggable = function (handle, panel) {
    let dragging = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startLeft = 0;
    let startTop = 0;

    const onMouseMove = function (event) {
      if (!dragging) return;

      const newLeft = startLeft + (event.clientX - startMouseX);
      const newTop = startTop + (event.clientY - startMouseY);

      rr.defaults.panelPosition.left = Math.max(0, newLeft);
      rr.defaults.panelPosition.top = Math.max(0, newTop);

      panel.style.left = rr.defaults.panelPosition.left + 'px';
      panel.style.top = rr.defaults.panelPosition.top + 'px';
    };

    const onMouseUp = function () {
      if (!dragging) return;
      dragging = false;
      rr.storage.save();
      document.removeEventListener('mousemove', onMouseMove, true);
      document.removeEventListener('mouseup', onMouseUp, true);
    };

    handle.addEventListener('mousedown', function (event) {
      if (event.button !== 0) return;
      if (event.target.tagName === 'BUTTON') return;

      dragging = true;
      startMouseX = event.clientX;
      startMouseY = event.clientY;
      startLeft = rr.defaults.panelPosition.left;
      startTop = rr.defaults.panelPosition.top;

      document.addEventListener('mousemove', onMouseMove, true);
      document.addEventListener('mouseup', onMouseUp, true);

      event.preventDefault();
      event.stopPropagation();
    });
  };

  rr.interaction.onLayerAdd = function () {
    rr.state.isLayerEnabled = true;
    rr.render.redrawAll();
  };

  rr.interaction.onLayerRemove = function () {
    rr.state.isLayerEnabled = false;
    rr.render.clearAll();
  };

  rr.interaction.setupLayerTracking = function () {
    window.map.on('layeradd', function (event) {
      if (event.layer === rr.state.layerGroup) {
        rr.interaction.onLayerAdd();
      }
    });

    window.map.on('layerremove', function (event) {
      if (event.layer === rr.state.layerGroup) {
        rr.interaction.onLayerRemove();
      }
    });
  };

  // --------------------------------------------------------------------------
  // lifecycle
  // --------------------------------------------------------------------------

  rr.setup = function () {
    rr.storage.load();
    rr.model.ensureActiveSet();

    rr.ui.injectStyles();

    rr.state.defaultMarkerIcon = new L.Icon.Default();
    rr.state.layerGroup = new L.LayerGroup();

    rr.interaction.setupLayerTracking();
    window.addLayerGroup(rr.constants.layerName, rr.state.layerGroup, true);
    rr.ui.installPanel();

    rr.state.isLayerEnabled = window.map.hasLayer(rr.state.layerGroup);
    if (rr.state.isLayerEnabled) {
      rr.render.redrawAll();
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