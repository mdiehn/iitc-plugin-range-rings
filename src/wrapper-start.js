function wrapper(plugin_info) {
  'use strict';

  if (typeof window.plugin !== 'function') {
    window.plugin = function () {};
  }

  window.plugin.rangeRings = {};
  const rr = window.plugin.rangeRings;

  rr.pluginInfo = plugin_info;