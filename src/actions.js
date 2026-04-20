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
    rr.render.applySpacingToSet(activeSet);
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
  rr.render.syncCircleCount(activeSet);
  rr.render.rebuildResizeHandles(activeSet);
  rr.ui.syncPanel();
};

rr.actions.setColor = function (value) {
  const activeSet = rr.model.ensureActiveSet();
  if (!rr.util.isValidColor(value)) return;
  activeSet.color = value;
  rr.storage.save();
  rr.render.updateSetStyle(activeSet);
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
  rr.render.updateSetStyle(activeSet);
  rr.ui.syncPanel();
};

rr.actions.setLineStyle = function (value) {
  const activeSet = rr.model.ensureActiveSet();
  if (!rr.util.isValidLineStyle(value)) return;
  activeSet.lineStyle = value;
  rr.storage.save();
  rr.render.updateSetStyle(activeSet);
  rr.ui.syncPanel();
};

rr.actions.centerOnMapCenter = function () {
  const activeSet = rr.model.ensureActiveSet();
  rr.model.setCenter(activeSet, window.map.getCenter());
};
