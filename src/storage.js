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
    if (typeof parsed.panelVisible === 'boolean') {
      rr.defaults.panelVisible = parsed.panelVisible;
    }

    if (Array.isArray(parsed.ringSets) && parsed.ringSets.length > 0) {
      rr.state.ringSets = parsed.ringSets.map(function (savedSet) {
        return rr.model.createRingSet(savedSet);
      });

      rr.state.activeSetId = parsed.activeSetId || rr.state.ringSets[0].id;
      rr.model.ensureActiveSet();
      return;
    }

    // backward compatibility (old single-set format)
    const oldStyleSet = rr.model.createRingSet({
      center: parsed.center,
      spacingMeters: parsed.spacingMeters || parsed.radiusMeters,
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
    panelPosition: { left: rr.defaults.panelPosition.left, top: rr.defaults.panelPosition.top },
    panelCollapsed: rr.defaults.panelCollapsed === true,
    panelVisible: rr.defaults.panelVisible !== false
  };

  localStorage.setItem(rr.constants.storageKey, JSON.stringify(payload));
};