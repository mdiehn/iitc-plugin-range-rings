function wrapper(plugin_info) {
  // ensure plugin framework is there, even if iitc is not yet loaded
  if (typeof window.plugin !== 'function') window.plugin = function () {};

  // PLUGIN AUTHORS: writing a plugin outside of the IITC build environment? if so, delete these lines!!
  // (leaving them in place might break the 'About IITC' page or break update checks)
  plugin_info.buildName = 'iitc';
  plugin_info.dateTimeVersion = '20260421.1';
  plugin_info.pluginId = 'range-rings';
  // END PLUGIN AUTHORS NOTE

  'use strict';

  window.plugin.rangeRings = {};
  const rr = window.plugin.rangeRings;
  rr.pluginInfo = plugin_info;
