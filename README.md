# IITC Plugin: Range Rings

Range Rings is an IITC plugin that draws concentric range rings from draggable center points.

## Features

- Multiple ring sets
- Draggable center marker for each set
- Multiple rings at equal spacing
- Configurable ring spacing
- Configurable number of circles
- Configurable line color
- Configurable line width
- Configurable line style
- Floating, draggable, collapsible control panel
- Persistent settings stored in browser localStorage
- Draggable resize handles for the active ring set

## Usage

- Enable the `Range Rings` layer in IITC.
- Drag a center marker to move that ring set.
- Click a marker or ring to make that set active.
- Use the `Ring Set` selector to switch between sets.
- Use `New Set` to create another ring set.
- New sets are created near the active set instead of directly on top of it.
- Use `Delete` to remove the active ring set.
- Adjust spacing, circle count, and line style settings in the control panel.
- Use `Center on Map Center` to move the active set to the current map center.
- Drag a resize handle on the active set to change ring spacing.

## Installation

Install `range-rings.user.js` with a userscript manager such as Violentmonkey or Tampermonkey while using IITC on `https://intel.ingress.com/`.

## Notes

Settings are stored in browser localStorage. Removing and reinstalling the plugin does not automatically clear saved settings.

## Status

Active development.