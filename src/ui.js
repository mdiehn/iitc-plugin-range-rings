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

rr.ui.isPanelVisible = function () {
  if (!rr.state.panel) {
    return rr.defaults.panelVisible !== false;
  }
  return rr.state.panel.style.display !== 'none';
};

rr.ui.togglePanelVisible = function () {
  rr.defaults.panelVisible = !rr.defaults.panelVisible;
  rr.storage.save();
  rr.ui.syncPanel();
};

rr.ui.getResizeHandleIcon = function () {
  return L.divIcon({
    className: 'range-rings-resize-handle-icon',
    html: '<div class="range-rings-resize-handle-square"></div>',
    iconSize: [10, 10],
    iconAnchor: [5, 5]
  });
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
          width: 280px;
          box-sizing: border-box;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          user-select: none;
        }

        .range-rings-show-button {
          position: absolute;
          z-index: 5000;
          top: 0;
          left: 20px;
          width: 28px;
          height: 36px;
          padding: 0;
          border: 1px solid rgba(255,255,255,0.25);
          border-top: none;
          border-radius: 0 0 6px 6px;
          background: rgba(8, 48, 78, 0.95);
          color: #fff;
          font-size: 11px;
          font-weight: bold;
          line-height: 1;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        }

        .range-rings-show-button:hover {
          background: rgba(20, 70, 110, 0.98);
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

        .range-rings-set-row {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          margin-bottom: 8px;
        }

        .range-rings-set-select-wrap label,
        .range-rings-set-controls-wrap label {
          flex: 1 1 0;
          margin-bottom: 0;
        }

        .range-rings-set-row .range-rings-set-select-wrap,
        .range-rings-set-row .range-rings-set-controls-wrap {
          flex: 1 1 0;
          margin-bottom: 0;
        }

        .range-rings-set-controls-buttons {
          display: flex;
          gap: 8px;
        }

        .range-rings-set-controls-buttons button {
          flex: 1 1 0;
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

        .range-rings-actions-row {
          display: flex;
          gap: 8px;
          margin-top: 4px;
        }

        .range-rings-actions-row button {
          flex: 1 1 0;
        }

        .range-rings-resize-handle-icon {
          background: transparent;
          border: none;
        }

        .range-rings-resize-handle-square {
          width: 10px;
          height: 10px;
          box-sizing: border-box;
          background: #ffffff;
          border: 1px solid #000000;
        }
      `;
  document.head.appendChild(style);
};

rr.ui.populateSetSelect = function () {
  if (!rr.state.panel) return;

  const select = rr.state.panel.querySelector('.range-rings-set-select');
  if (!select) return;

  select.innerHTML = '';

  rr.state.ringSets.forEach(function (set, index) {
    const option = document.createElement('option');
    option.value = set.id;
    option.textContent = rr.util.getSetDisplayName(set, index);
    if (set.id === rr.state.activeSetId) {
      option.selected = true;
    }
    select.appendChild(option);
  });
};

rr.ui.hideAllPanelUi = function () {
  if (rr.state.panel) {
    rr.state.panel.style.display = 'none';
  }
  if (rr.state.showButton) {
    rr.state.showButton.style.display = 'none';
  }
};

rr.ui.syncPanel = function () {
  if (!rr.state.panel) return;

  const activeSet = rr.model.ensureActiveSet();
  const panel = rr.state.panel;

  if (!rr.state.isLayerEnabled) {
    rr.ui.hideAllPanelUi();
    return;
  }

  rr.ui.populateSetSelect();

  const spacingInput = panel.querySelector('.range-rings-spacing');
  const countInput = panel.querySelector('.range-rings-count');
  const countValue = panel.querySelector('.range-rings-count-value');
  const colorInput = panel.querySelector('.range-rings-color');
  const weightInput = panel.querySelector('.range-rings-weight');
  const styleInput = panel.querySelector('.range-rings-style');
  const collapseButton = panel.querySelector('.range-rings-collapse');
  const deleteButton = panel.querySelector('.range-rings-delete-set');
  const hideButton = panel.querySelector('.range-rings-hide');
  const showButton = rr.state.showButton;

  if (spacingInput) spacingInput.value = String(activeSet.spacingMeters);
  if (countInput) countInput.value = String(activeSet.circleCount);
  if (countValue) countValue.textContent = String(activeSet.circleCount);
  if (colorInput) colorInput.value = activeSet.color;
  if (weightInput) weightInput.value = String(activeSet.lineWeight);
  if (styleInput) styleInput.value = activeSet.lineStyle;
  if (deleteButton) deleteButton.disabled = rr.state.ringSets.length <= 1;

  if (rr.state.panelBody) {
    rr.state.panelBody.style.display = rr.defaults.panelCollapsed ? 'none' : 'block';
  }

  if (collapseButton) {
    collapseButton.textContent = rr.defaults.panelCollapsed ? '+' : '−';
    collapseButton.title = rr.defaults.panelCollapsed ? 'Show panel' : 'Hide panel';
  }

  if (hideButton) {
    hideButton.title = 'Hide panel';
  }
  const panelVisible = rr.defaults.panelVisible !== false;
  panel.style.display = panelVisible ? 'block' : 'none';
  if (showButton) {
    const mapWidth = panel.parentNode ? panel.parentNode.clientWidth : 0;
    const desiredLeft = rr.defaults.panelPosition.left;
    const maxLeft = Math.max(0, mapWidth - 28);
    const clampedLeft = Math.max(0, Math.min(desiredLeft, maxLeft));

    showButton.style.display = panelVisible ? 'none' : 'block';
    showButton.style.left = clampedLeft + 'px';
    showButton.style.top = '0px';
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

  // Inspired by the restore tab in Zaso's IITC Bookmarks plugin.
  // The panel can tuck away, but a small visible tab remains so the
  // user still has an obvious way to bring it back. Thanks, Zaso!
  const panel = document.createElement('div');
  panel.className = 'range-rings-panel';
  panel.innerHTML = `
        <div class="range-rings-header">
          <span>${rr.constants.panelTitle}</span>
          <div class="range-rings-header-buttons">
            <button type="button" class="range-rings-collapse" title="Hide panel">−</button>
            <button type="button" class="range-rings-hide" title="Hide panel">×</button>
          </div>
        </div>
        <div class="range-rings-body">
          <div class="range-rings-set-row">
            <label class="range-rings-set-select-wrap">
              Ring Set
              <select class="range-rings-set-select"></select>
            </label>
            <div class="range-rings-set-controls-wrap">
              <label>
                Set Controls
                <div class="range-rings-set-controls-buttons">
                  <button type="button" class="range-rings-new-set">New Set</button>
                  <button type="button" class="range-rings-delete-set">Delete</button>
                </div>
              </label>
            </div>
          </div>

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

          <div class="range-rings-actions-row">
            <button class="range-rings-use-center" type="button">Center on Map Center</button>
          </div>
        </div>
      `;

  mapContainer.appendChild(panel);

  const showButton = document.createElement('button');
  showButton.type = 'button';
  showButton.className = 'range-rings-show-button';
  showButton.textContent = 'RR';
  showButton.title = 'Show Range Rings panel';
  showButton.setAttribute('aria-label', 'Show Range Rings panel');
  mapContainer.appendChild(showButton);

  L.DomEvent.disableClickPropagation(panel);
  L.DomEvent.disableScrollPropagation(panel);

  rr.state.panel = panel;
  rr.state.panelBody = panel.querySelector('.range-rings-body');
  rr.state.showButton = showButton;

  const header = panel.querySelector('.range-rings-header');
  const collapseButton = panel.querySelector('.range-rings-collapse');
  const hideButton = panel.querySelector('.range-rings-hide');
  const setSelect = panel.querySelector('.range-rings-set-select');
  const newSetButton = panel.querySelector('.range-rings-new-set');
  const deleteSetButton = panel.querySelector('.range-rings-delete-set');
  const spacingInput = panel.querySelector('.range-rings-spacing');
  const countInput = panel.querySelector('.range-rings-count');
  const colorInput = panel.querySelector('.range-rings-color');
  const weightInput = panel.querySelector('.range-rings-weight');
  const styleInput = panel.querySelector('.range-rings-style');
  const useCenterButton = panel.querySelector('.range-rings-use-center');

  [
    header,
    collapseButton,
    hideButton,
    setSelect,
    newSetButton,
    deleteSetButton,
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

  L.DomEvent.on(showButton, 'mousedown touchstart pointerdown wheel', function (event) {
    L.DomEvent.stopPropagation(event);
  });

  collapseButton.addEventListener('click', function (event) {
    event.stopPropagation();
    rr.ui.togglePanelCollapsed();
  });

  hideButton.addEventListener('click', function (event) {
    event.stopPropagation();
    rr.ui.togglePanelVisible();
  });

  showButton.addEventListener('click', function (event) {
    event.stopPropagation();
    if (rr.defaults.panelVisible === false) {
      rr.defaults.panelVisible = true;
      rr.storage.save();
      rr.ui.syncPanel();
    }
  });

  setSelect.addEventListener('change', function () {
    rr.model.setActiveSet(setSelect.value);
  });

  newSetButton.addEventListener('click', function () {
    rr.model.addSet();
  });

  deleteSetButton.addEventListener('click', function () {
    rr.model.deleteActiveSet();
  });

  spacingInput.addEventListener('input', function () {
    rr.actions.setSpacing(spacingInput.value);
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