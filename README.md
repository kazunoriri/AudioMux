# AudioMux

AudioMux is a Max for Live Audio Effect for Ableton Live that lets one Selector control up to eight mapped targets exclusively.

## Features

- 8 mapped target slots
- Exactly one target is active at a time
- One automatable `Selector` parameter (1–8)
- Map workflow with armed-state feedback
- Supports Device On/Off
- Supports Rack Chain Speaker/Activator
- Mapping names are restored with the Live Set
- Stereo audio passes through unchanged

## Mapping

1. Click **Map** on the desired row.
2. Click the target parameter in Ableton Live.
3. Repeat for the other rows.
4. Change **Selector** from 1–8 to activate only the corresponding mapped target.

Only one Map button can be armed at a time. Clicking the same armed Map button again cancels mapping.

### Chain Speaker mapping

For Rack Chain Speaker/Activator, start with the Speaker **OFF**, then map it.

This matches the mapping behavior observed with Ableton Live's standard LFO device.

## Current stable build

**v3.11**

Verified behavior includes mapping, exclusive switching, display-name restoration, and Live Set save/reload persistence for both Device On/Off and Chain Speaker targets.

## Requirements

- Ableton Live
- Max for Live

## Status

Early development / stable baseline.
