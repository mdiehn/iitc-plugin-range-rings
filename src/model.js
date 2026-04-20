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
    circles: [],
    resizeHandles: []
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

rr.model.getSetIndexById = function (setId) {
  for (let i = 0; i < rr.state.ringSets.length; i += 1) {
    if (rr.state.ringSets[i].id === setId) {
      return i;
    }
  }
  return -1;
};

rr.model.getSetById = function (setId) {
  const index = rr.model.getSetIndexById(setId);
  if (index === -1) return null;
  return rr.state.ringSets[index];
};

rr.model.getActiveSet = function () {
  if (!rr.state.activeSetId) return null;
  return rr.model.getSetById(rr.state.activeSetId);
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
  const center = L.latLng(latlng.lat, latlng.lng);
  set.center = {
    lat: center.lat,
    lng: center.lng
  };
  rr.storage.save();
  rr.render.updateCirclePositions(set, center);
  rr.ui.syncPanel();
};

rr.model.setActiveSet = function (setId) {
  const newSet = rr.model.getSetById(setId);
  if (!newSet) return;
  if (rr.state.activeSetId === setId) return;

  const oldSet = rr.model.getActiveSet();

  rr.state.activeSetId = setId;

  if (oldSet) {
    rr.render.removeResizeHandles(oldSet);
    rr.render.updateSetStyle(oldSet);
  }

  rr.render.updateSetStyle(newSet);
  rr.render.addResizeHandles(newSet);

  rr.storage.save();
  rr.ui.syncPanel();
};

rr.model.addSet = function () {
  const baseSet = rr.model.getActiveSet() || rr.model.ensureActiveSet();
  const baseCenterLatLng = rr.model.getSetCenterLatLng(baseSet);

  const offsetMeters = Math.max(500, Math.min(baseSet.spacingMeters, 5000));
  const latOffset = offsetMeters / 111320;
  const lngOffset = offsetMeters / (111320 * Math.cos(baseCenterLatLng.lat * Math.PI / 180));

  const newSet = rr.model.createRingSet({
    center: {
      lat: baseCenterLatLng.lat - latOffset,
      lng: baseCenterLatLng.lng + lngOffset
    },
    spacingMeters: baseSet.spacingMeters,
    circleCount: baseSet.circleCount,
    color: baseSet.color,
    lineWeight: baseSet.lineWeight,
    lineStyle: baseSet.lineStyle
  });

  rr.state.ringSets.push(newSet);
  rr.state.activeSetId = newSet.id;
  rr.storage.save();
  rr.render.redrawAll();
  rr.ui.syncPanel();
};

rr.model.deleteActiveSet = function () {
  if (rr.state.ringSets.length <= 1) return;

  const activeIndex = rr.model.getSetIndexById(rr.state.activeSetId);
  if (activeIndex === -1) return;

  const activeSet = rr.state.ringSets[activeIndex];
  rr.render.clearSet(activeSet);

  rr.state.ringSets.splice(activeIndex, 1);

  const nextIndex = Math.max(0, activeIndex - 1);
  rr.state.activeSetId = rr.state.ringSets[nextIndex].id;

  rr.storage.save();
  rr.render.redrawAll();
  rr.ui.syncPanel();
};