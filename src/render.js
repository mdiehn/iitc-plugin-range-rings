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

  set.resizeHandles.forEach(function (handle) {
    rr.state.layerGroup.removeLayer(handle);
    handle.off();
  });
  set.resizeHandles = [];
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

  set.marker.on('click', function () {
    rr.model.setActiveSet(set.id);
  });

  set.marker.on('drag', function (event) {
    rr.render.updateCirclePositions(set, event.target.getLatLng());
  });

  set.marker.on('dragstart', function () {
    if (rr.state.activeSetId !== set.id) {
      rr.state.activeSetId = set.id;
      rr.storage.save();
      rr.ui.syncPanel();
    }
  });

  set.marker.on('dragend', function (event) {
    if (rr.state.activeSetId !== set.id) {
      rr.state.activeSetId = set.id;
    }
    rr.model.setCenter(set, event.target.getLatLng());
  });

  rr.state.layerGroup.addLayer(set.marker);
};

rr.render.updateCirclePositions = function (set, center) {
  set.circles.forEach(function (circle) {
    circle.setLatLng(center);
  });

  set.resizeHandles.forEach(function (handle) {
    const ringIndex = handle._rangeRingIndex;
    const handleRadiusMeters = set.spacingMeters * ringIndex;
    const lngOffset =
      handleRadiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
    const handleLatLng = L.latLng(center.lat, center.lng + lngOffset);

    handle.setLatLng(handleLatLng);
  });
};

rr.render.createResizeHandle = function (set, center, ringIndex) {
  const radiusMeters = set.spacingMeters * ringIndex;
  const lngOffset =
    radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
  const handleLatLng = L.latLng(center.lat, center.lng + lngOffset);

  const handle = L.marker(handleLatLng, {
    draggable: true,
    autoPan: true,
    keyboard: false,
    opacity: 0.8,
    title: 'Resize ring spacing',
    icon: rr.ui.getResizeHandleIcon()
  });

  handle._rangeRingIndex = ringIndex;

  handle.on('click', function () {
    rr.model.setActiveSet(set.id);
  });

  handle.on('dragstart', function () {
    if (rr.state.activeSetId !== set.id) {
      rr.state.activeSetId = set.id;
      rr.storage.save();
      rr.ui.syncPanel();
    }
  });

  handle.on('drag', function (event) {
    const draggedHandle = event.target;
    const index = draggedHandle._rangeRingIndex;
    const draggedLatLng = draggedHandle.getLatLng();
    const centerLatLng = rr.model.getSetCenterLatLng(set);
    const distanceMeters = centerLatLng.distanceTo(draggedLatLng);
    const newSpacing = Math.round(distanceMeters / index);

    set.spacingMeters = rr.util.clampInteger(
      newSpacing,
      rr.constants.minSpacingMeters,
      rr.constants.maxSpacingMeters,
      set.spacingMeters
    );

    set.circles.forEach(function (circle, circleIndex) {
      circle.setRadius(set.spacingMeters * (circleIndex + 1));
    });

    set.resizeHandles.forEach(function (handleMarker) {
      if (handleMarker === draggedHandle) return;

      const handleIndex = handleMarker._rangeRingIndex;
      const handleRadiusMeters = set.spacingMeters * handleIndex;
      const lngOffset =
        handleRadiusMeters /
        (111320 * Math.cos(centerLatLng.lat * Math.PI / 180));
      const handleLatLng = L.latLng(
        centerLatLng.lat,
        centerLatLng.lng + lngOffset
      );

      handleMarker.setLatLng(handleLatLng);
    });

    rr.ui.syncPanel();
  });

  handle.on('dragend', function (event) {
    const draggedHandle = event.target;
    const index = draggedHandle._rangeRingIndex;
    const draggedLatLng = draggedHandle.getLatLng();
    const centerLatLng = rr.model.getSetCenterLatLng(set);
    const distanceMeters = centerLatLng.distanceTo(draggedLatLng);
    const newSpacing = Math.round(distanceMeters / index);

    set.spacingMeters = rr.util.clampInteger(
      newSpacing,
      rr.constants.minSpacingMeters,
      rr.constants.maxSpacingMeters,
      set.spacingMeters
    );

    if (rr.state.activeSetId !== set.id) {
      rr.state.activeSetId = set.id;
    }

    rr.storage.save();
    rr.ui.syncPanel();
  });

  rr.state.layerGroup.addLayer(handle);
  set.resizeHandles.push(handle);
};

rr.render.updateSetStyle = function (set) {
  const dashArray = rr.util.getDashArray(set.lineStyle);
  const isActive = set.id === rr.state.activeSetId;
  const circleWeight = isActive ? set.lineWeight + 1 : set.lineWeight;
  const circleOpacity = isActive ? 1.0 : 0.7;

  set.circles.forEach(function (circle) {
    circle.setStyle({
      color: set.color,
      weight: circleWeight,
      opacity: circleOpacity,
      dashArray: dashArray
    });
  });
};

rr.render.removeResizeHandles = function (set) {
  set.resizeHandles.forEach(function (handle) {
    rr.state.layerGroup.removeLayer(handle);
    handle.off();
  });
  set.resizeHandles = [];
};

rr.render.addResizeHandles = function (set) {
  const center = rr.model.getSetCenterLatLng(set);

  for (let i = 1; i <= set.circleCount; i += 1) {
    rr.render.createResizeHandle(set, center, i);
  }
};

rr.render.drawSet = function (set) {
  const center = rr.model.getSetCenterLatLng(set);
  const dashArray = rr.util.getDashArray(set.lineStyle);
  const isActive = set.id === rr.state.activeSetId;
  const circleWeight = isActive ? set.lineWeight + 1 : set.lineWeight;
  const circleOpacity = isActive ? 1.0 : 0.7;

  rr.render.clearSet(set);
  rr.render.createMarker(set, center);

  for (let i = 1; i <= set.circleCount; i += 1) {
    const circle = L.circle(center, {
      radius: set.spacingMeters * i,
      color: set.color,
      weight: circleWeight,
      opacity: circleOpacity,
      fill: false,
      interactive: true,
      dashArray: dashArray
    });

    circle.on('click', function () {
      rr.model.setActiveSet(set.id);
    });

    rr.state.layerGroup.addLayer(circle);
    set.circles.push(circle);
  }

  if (isActive) {
    for (let i = 1; i <= set.circleCount; i += 1) {
      rr.render.createResizeHandle(set, center, i);
    }
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

rr.render.updateCircleRadii = function (set) {
  set.circles.forEach(function (circle, circleIndex) {
    circle.setRadius(set.spacingMeters * (circleIndex + 1));
  });
};

rr.render.rebuildResizeHandles = function (set) {
  rr.render.removeResizeHandles(set);

  if (set.id === rr.state.activeSetId) {
    rr.render.addResizeHandles(set);
  }
};

rr.render.createCircle = function (set, center, ringIndex) {
  const isActive = set.id === rr.state.activeSetId;
  const circle = L.circle(center, {
    radius: set.spacingMeters * ringIndex,
    color: set.color,
    weight: isActive ? set.lineWeight + 1 : set.lineWeight,
    opacity: isActive ? 1.0 : 0.7,
    fill: false,
    interactive: true,
    dashArray: rr.util.getDashArray(set.lineStyle)
  });

  circle.on('click', function () {
    rr.model.setActiveSet(set.id);
  });

  rr.state.layerGroup.addLayer(circle);
  set.circles.push(circle);
};

rr.render.removeLastCircle = function (set) {
  const circle = set.circles.pop();
  if (!circle) return;

  rr.state.layerGroup.removeLayer(circle);
  circle.off();
};

rr.render.syncCircleCount = function (set) {
  const center = rr.model.getSetCenterLatLng(set);

  while (set.circles.length < set.circleCount) {
    rr.render.createCircle(set, center, set.circles.length + 1);
  }

  while (set.circles.length > set.circleCount) {
    rr.render.removeLastCircle(set);
  }

  rr.render.updateCircleRadii(set);
  rr.render.updateSetStyle(set);
};