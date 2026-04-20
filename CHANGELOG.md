# Changelog

## 1.2.1

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

## 1.2.0

- Add draggable square resize handles for the active ring set
- Allow dragging any handle to change ring spacing
- Update ring sizes live while dragging
- Save spacing and redraw on drag end

## 1.1.0

- Add support for multiple ring sets
- Add active set selection
- Add controls to create and delete sets
- Let clicking a marker or ring select the active set
- Offset newly created sets so they do not land directly on top of the source set
- Improve floating panel layout for set controls

## 1.0.0

- Initial release
- Draw concentric rings from a draggable center point
- Floating, draggable, collapsible control panel
- Configurable ring spacing and number of circles
- Configurable line color, width, and style
- Settings persisted in localStorage