  rr.setup = function () {
    rr.storage.load();
    rr.model.ensureActiveSet();
    rr.ui.injectStyles();
    rr.state.defaultMarkerIcon = new L.Icon.Default();
    rr.state.layerGroup = new L.LayerGroup();
    rr.interaction.setupLayerTracking();
    window.addLayerGroup(rr.constants.layerName, rr.state.layerGroup, true);

    rr.state.isLayerEnabled = window.map.hasLayer(rr.state.layerGroup);
    rr.ui.installPanel();
    rr.ui.syncPanel();

    if (rr.state.isLayerEnabled) {
      rr.render.redrawAll();
    }
  }
  const setup = rr.setup;
  setup.info = plugin_info; // add the script info data to the function as a property

  if (!window.bootPlugins) window.bootPlugins = [];
  window.bootPlugins.push(setup);

  // if IITC has already booted, immediately run the setup function
  if (window.iitcLoaded && typeof setup === 'function') setup();

} // wrapper end

// inject code into site context
var script = document.createElement('script');
var info = {};

if (typeof GM_info !== 'undefined' && GM_info && GM_info.script) {
  info.script = {
    version: GM_info.script.version,
    name: GM_info.script.name,
    description: GM_info.script.description
  };
}

script.appendChild(document.createTextNode('(' + wrapper + ')(' + JSON.stringify(info) + ');'));
(document.body || document.head || document.documentElement).appendChild(script);