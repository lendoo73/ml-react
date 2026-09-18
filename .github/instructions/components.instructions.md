---
applyTo: "src/components/**/*.{jsx,tsx},src/features/**/components/**/*.{jsx,tsx}"
description: "Shared and domain feature component boundaries for the React frontend"
---

# Component Instructions

- Shared components in `src/components` must remain domain-neutral and reusable.
- Domain components belong in `src/features/<domain>/components` and may contain
  task-specific rendering, controls, and result visualization.
- Components render UI and handle user interaction; move reusable stateful effects
  into hooks and API/data logic into services.
- Keep page/workspace components as orchestrators and pass model configuration via
  explicit props.
- Keep visible text localized through `src/content/translations.js`.
- Use Tailwind classes and preserve existing light/dark-mode behavior.
