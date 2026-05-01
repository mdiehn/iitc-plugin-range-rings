# Changelog

## [1.3.1] - 2026-04-30

### Fixed

- Fixed the RR reopen tab appearing briefly on page reload when the Range Rings layer is disabled.
- Synced panel/tab visibility after IITC restores the saved layer state.

### Changed

- Made userscript update/download URLs default to the `main` branch instead of the current build branch.

## [1.3.0] - 2026-04-21

- add direct install link near the top of the README
- improve panel collapse, hide/show, and restore-tab behavior
- hide panel UI when the Range Rings layer is disabled
- generate both `range-rings.user.js` and `range-rings.meta.js` during builds
- adopt the standard IITC wrapper so the plugin works in IITC Mobile

## [1.2.1] - 2026-04-20

- refactor plugin source into modular files with a simple build step
- reduce full redraws during common editing actions:
  - moving ring centers
  - resizing ring spacing
  - switching active ring sets
  - changing style and spacing from the panel
  - changing circle count
  - adding and deleting ring sets
- fix center marker position when using "Center on Map Center"
- fix panel ring-spacing action handling after the refactor
- fix duplicate `rr.actions.setColor` definition

## [1.2.0] - 2026-04-19

- Add draggable square resize handles for the active ring set
- Allow dragging any handle to change ring spacing
- Update ring sizes live while dragging
- Save spacing and redraw on drag end

## [1.1.0] - 2026-04-19

- Add support for multiple ring sets
- Add active set selection
- Add controls to create and delete sets
- Let clicking a marker or ring select the active set
- Offset newly created sets so they do not land directly on top of the source set
- Improve floating panel layout for set controls

## [1.0.0] - 2026-04-19

- Initial release
- Draw concentric rings from a draggable center point
- Floating, draggable, collapsible control panel
- Configurable ring spacing and number of circles
- Configurable line color, width, and style
- Settings persisted in localStorage
