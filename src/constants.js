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