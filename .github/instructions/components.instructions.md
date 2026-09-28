---
applyTo: "src/components/**/*.{jsx,tsx},src/features/**/components/**/*.{jsx,tsx}"
description: "Shared and domain feature component boundaries for the React frontend"
---

# Component Instructions

- Shared components in `src/components` must remain domain-neutral and reusable.
- Domain components belong in `src/features/<domain>/components` and may contain
  task-specific rendering, controls, and result visualization.
- Model workspaces are named page components under their domain feature's `pages`
  folder. Compose them from shared sections with model-specific data passed as
  props; these are right-side views, not URL routes.
- Components render UI and handle user interaction; move reusable stateful effects
  into hooks. Keep domain API/data handling within the owning feature rather than
  introducing a separate service layer.
- Keep page/workspace components as orchestrators and pass model configuration via
  explicit props.
- Keep visible text localized through `src/content/translations.js`.
- Use Tailwind classes and preserve existing light/dark-mode behavior.
