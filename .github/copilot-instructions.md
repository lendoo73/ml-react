# Project Instructions

This repository is a Vite React frontend for machine-learning inference workflows.
It provides a shared workspace for computer-vision tasks such as detection and
classification, with planned support for segmentation, pose estimation, OBB,
semantic segmentation, and depth estimation.

## Architecture and ownership

- Organize domain-specific code as portable feature slices under
  `src/features/<domain>/`.
- Keep domain UI, hooks, services, utilities, and tests inside their owning feature
  whenever they are specific to that task.
- Keep genuinely reusable UI and infrastructure in `src/components`, `src/context`,
  `src/config`, `src/content`, and `src/utils`.
- Do not move task-specific behavior into shared components merely to avoid a new
  feature folder.
- The shared `ModelWorkspace` orchestrates model configuration and delegates
  task-specific rendering to feature components.
- Detection-specific behavior belongs under `src/features/detection`; classification
  behavior belongs under `src/features/classification`. Add new domains using the
  same boundary when their implementation is introduced.

## Model catalog and API boundaries

- Define official, custom-trained, and future placeholder models through the
  configuration-driven catalog in `src/content/translations.js`.
- Preserve stable model identifiers and keep task capabilities, endpoints, input
  fields, result types, and display metadata in the catalog.
- Components must not hardcode model indexes or infer API routes from array
  positions.
- Put HTTP calls, response normalization, and API-specific business logic in a
  domain service when a feature has more than trivial request wiring.
- Validate user-provided files and URLs at the UI/API boundary and surface errors
  visibly; do not silently fall back to a successful-looking result.

## UI and localization

- Preserve the existing English/French translation structure when adding visible
  text. Do not introduce user-facing strings directly in feature components.
- Use Tailwind CSS classes and the existing dark-mode conventions.
- Keep shared upload, URL, media, and layout controls reusable; pass model-specific
  labels and behavior through explicit props.
- Keep official models, custom-trained models, and planned model slots visually
  consistent while clearly indicating their status.

## Validation

- Use the existing commands after code changes:
  - `npm run lint`
  - `npm run build`
- For visual or responsive UI changes, always verify the rendered result in the browser
  with the existing browser automation workflow before considering the change complete.
- Do not add dependencies or scripts without an explicit requirement.
