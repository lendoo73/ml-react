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
- Give interactive controls (including links, buttons, menus, and switchers) a
  `cursor-pointer` hover cursor; use another meaningful cursor for states such
  as waiting, dragging, or disabled controls.
- Every image, video, or webcam prediction view that renders annotations on a media
  canvas must compose `src/components/ui/PredictionController.jsx` beside that
  media instead of rendering the annotated media alone or recreating the controller.
  Keep the controller to the right of the canvas on wide screens and stacked below
  it on narrow screens. Its controls must actually drive what the canvas displays:
  pass model-specific sections, a separate confidence threshold for each model,
  annotation toggles, selected classes/keypoints, and annotation size to the
  renderer's options. Preserve the controller's fullscreen Hide/Show behavior.
- Follow the existing Knife Attack implementation for examples:
  `src/features/multi_model/pages/knife_attack/KnifeAttackDetection.jsx` builds
  model sections, per-model confidence thresholds, and annotation controls;
  `src/features/multi_model/components/KnifeAttackImage.jsx` and
  `src/features/multi_model/components/KnifeAttackWebcam.jsx` place the shared
  controller beside image/webcam media; `KnifeAttackAnnotations.jsx` passes the
  selected options to the canvas renderer. The video counterpart is composed in
  `KnifeAttackDetection.jsx` with `KnifeAttackVideo.jsx`.
