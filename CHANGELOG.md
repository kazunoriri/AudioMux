# Changelog

## v3.11

First stable AudioMux baseline.

### Verified

- Eight-way exclusive target switching
- One automatable Selector parameter (1–8)
- Map arms on the first click
- Clicking another Map button transfers the armed state
- Clicking the armed Map button again cancels mapping
- Mapping remains usable immediately after mapping another target
- Device On/Off target name display
- Chain Speaker target name display
- Live Set save/reload persistence
  - Chain Speaker uses native persistent mapping when available
  - Device On/Off can restore from the Stored Only fallback
- Stereo audio passthrough

### Known mapping requirement

Rack Chain Speaker/Activator should be **OFF before mapping**. Mapping from ON to OFF is not supported by the tested Ableton mapping behavior.
