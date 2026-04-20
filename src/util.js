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

rr.util.getSetDisplayName = function (set, index) {
  return 'Set ' + (index + 1);
};

rr.util.getDistanceMeters = function (latlngA, latlngB) {
  return latlngA.distanceTo(latlngB);
};