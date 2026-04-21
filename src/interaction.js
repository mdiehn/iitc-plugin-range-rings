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
  rr.ui.syncPanel();
  rr.render.redrawAll();
};

rr.interaction.onLayerRemove = function () {
  rr.state.isLayerEnabled = false;
  rr.ui.hideAllPanelUi();
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