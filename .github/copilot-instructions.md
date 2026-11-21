# Project Instructions

This repository is a Vite React frontend for machine-learning inference workflows.
It provides a shared workspace for computer-vision tasks such as detection and
classification, with planned support for segmentation, pose estimation, OBB,
semantic segmentation, and depth estimation.

## Architecture and ownership

- Organize domain-specific code as portable feature slices under
  `src/features/<domain>/`.
- Keep domain UI, hooks, utilities, and tests inside their owning feature
  whenever they are specific to that task.
- Keep genuinely reusable UI and infrastructure in `src/components`, `src/context`,
  `src/config`, `src/content`, and `src/utils`.
- Do not move task-specific behavior into shared components merely to avoid a new
  feature folder.
- The shared `ModelWorkspace` orchestrates model configuration and delegates
  task-specific rendering to feature components.
- Sidebar selection swaps the right-side workspace in app state; these pages are
  not URL routes and remain under `src/features`.
- Each classification model has a named page component under
  `src/features/classification/pages` (for example, `Yolo26Classification` and
  `WeatherClassification`). Compose both from the same reusable section
  components and pass model-specific content and callbacks through props.
- Detection-specific behavior belongs under `src/features/detection`; classification
  behavior belongs under `src/features/classification`. Add new domains using the
  same boundary when their implementation is introduced.

## Model catalog and API boundaries

- Keep `src/content/translations/` limited to user-facing, locale-dependent text.
  Do not store API paths, endpoint names, input capabilities, result types,
  feature flags, class/query lookup data, asset paths, or link URLs in translation
  files.
- Keep stable model identifiers as translation keys, and define nonlocalized
  model behavior in the owning feature's page where it is consumed. Page- or
  model-specific fixed values—including classes, endpoint names and paths,
  image assets, lookup/query data, metadata, and model settings—belong directly
  in that page file for easy debugging. Follow the approach used by neighboring
  pages; keep each file focused on its responsibility and do not create separate
  settings, config, custom, or data files/modules solely to hold values for one
  page.
- Translation files are only for translating visible user-facing copy. Do not
  put settings or other nonlocalized model/page data in translations. The page
  owns displaying and orchestrating its model-specific data; translations own
  the localized text shown to the user.
- Only use configuration for values intentionally adjustable by environment,
  deployment, or user choice. Keep fixed invariant values directly in the
  owning page rather than introducing configuration files or modules solely to
  collect them.
- Keep visible model names, labels, descriptions, and other localized copy in the
  English and French translation files.
- Components must not hardcode model indexes or infer API routes from array
  positions.
- Organize API request handling and response normalization within the owning
  domain feature, using its components and hooks where appropriate. Do not add a
  separate service layer or `services`/`api` folders.
- Before adding or changing API endpoints or request/response handling, consult
  the backend OpenAPI documentation at `http://127.0.0.1:8000/api/redoc` or
  `http://127.0.0.1:8000/api/openapi.json`. For new model endpoints, inspect
  that endpoint's documented method, inputs, and response schema; do not assume
  its contract matches a similar page or call it by copying another page's
  request pattern. When useful, make a non-interactive request (for example,
  with `curl`) to inspect a real response and understand its shape. If the docs
  or backend are not reachable, ask the developer to start the backend server;
  do not guess the API contract.
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

- Never execute interactive shell commands or commands that prompt for input. Use only
  non-interactive commands when terminal work is explicitly needed; do not clear the
  user's terminal or launch interactive command-line interfaces.
- Use the existing commands after code changes:
  - `npm run lint`
  - `npm run build`
- For visual or responsive UI changes, always verify the rendered result in the browser
  with the existing browser automation workflow before considering the change complete.
- Do not add dependencies or scripts without an explicit requirement.
