---
name: model-page-creator
description: Create a new model workspace page under the appropriate src/features/<domain>/pages folder, following existing project patterns and interviewing the user rather than guessing missing requirements.
---

# Model Page Creator

Create a new model page for this Vite React application. Before editing, read `.github/copilot-instructions.md` and every applicable instruction file for files you intend to change. Inspect existing pages in `src/features/<domain>/pages/`, shared section components, hooks, translations, model catalog/workspace registration, and equivalent pages in other domains. Follow established behavior and styling; reuse components instead of duplicating section markup.

## Interview before implementation

Do not invent user-specific requirements, backend contracts, localized copy, model metadata, or assets. Infer details only when supported by repository context or supplied files. Ask concise, focused questions before making changes whenever a required value cannot be established. Bundle independent questions together and do not ask for values already clear from the request or repository.

Establish:
- The domain (`classification`, `detection`, `instance_segmentation`, `pose`, or another existing domain). Infer it from the model/task if unambiguous; otherwise ask.
- Model identity and required display metadata (stable model ID, visible name, hero title/description, class labels, source labels) when not already supplied or represented in translations.
- The page subfolder name. Derive a short, appropriate name from the model/task context; do not require the user to provide an explicit folder name. Confirm only if multiple plausible names materially affect the structure.
- Supported source types and whether source cards should be standard or custom. Infer from the model's known inputs and equivalent pages; ask if uncertain. If custom cards are requested, follow that direction while preserving shared behavior where possible.
- Model classes. Inspect evaluation files and existing metadata first; ask only if classes cannot be reliably determined.
- Whether image prediction is supported. The Random Prediction/class preview section is optional and must only be included when the model supports image input.
- Whether random-image lookup can use class names directly or needs custom search terms. Study existing lookup patterns (including `classSearchQueries`, `randomMediaSearchTerms`, and test-dataset lookup). Ask if the suitable search strategy is unclear; do not silently assume search terms.
- The hero image. Search `public/images/` first for a relevant `<page-or-model>-sample.*` asset, allowing a reasonable implied-name match. Use an existing relevant file when found. Ask for an image path only if no suitable image exists; never fabricate an asset path.
- Whether this is a custom-trained model and whether evaluation assets are supplied. If an `evaluation/` folder or files are provided, inspect them and use the matching existing evaluation section. Ask about missing evaluation-specific requirements only when needed (for example, a TensorBoard destination not established by project conventions).

For every new model page, also search for a matching training/evaluation run under
`C:\Codes\Python\Machine_Learning\Computer_Vision\YOLO\YOLO26_&_The_Legacy_-_6_in_1_YOL_Masterclass_2026\29-YOLOv26_GPU_Mode\runs\`.
Infer likely run-folder names from the model and task even when the developer has
not attached or named the evaluation folder. Inspect class metadata and available
evaluation artifacts before deciding whether anything is missing. Use the matching
existing evaluation component; never fabricate missing metrics or assets.

Before adding or changing API request/response behavior, consult the backend OpenAPI documentation at `http://127.0.0.1:8000/api/redoc` or `http://127.0.0.1:8000/api/openapi.json`. For every new model endpoint, inspect its documented method, inputs, and response schema; do not blindly reuse a similar page's request pattern or assume the response shape is the same. When useful, make a non-interactive request (for example, with `curl`) to inspect an actual response for deeper understanding. Do not guess endpoint paths, fields, payloads, or response shapes. If the docs or backend are unavailable, stop API-contract-dependent work and ask the developer to start the backend or provide the contract.

## Page requirements

- Place the page at `src/features/<domain>/pages/<derived-subfolder>/<ModelName>.jsx`, with a named component export receiving the established `{ model }` prop. Match neighboring pages' naming and composition patterns.
- Compose the page from the existing reusable sections for the hero, random prediction (when eligible), evaluation (when applicable), source cards, source input, prediction result, and API response. The hero must display the localized heading, description, and chosen hero image.
- Use shared components for each section's complete visual structure, including its outer card, header, spacing, controls, and content container. Keep the layout and styling consistent across domains and source types; supply page-specific data and callbacks through props or composition instead of duplicating section markup. Before changing a shared section, inspect and extend its existing component. For API responses, use the shared response-card component and its documented composition API.
- Keep page- and model-specific fixed data directly in the owning page file: classes, endpoint names and paths, image assets, lookup/query data, model metadata, and fixed model settings. This keeps the complete page-specific behavior easy to find and debug. Study neighboring page files and follow their established approach; keep each file focused on its responsibility rather than mixing unrelated concerns.
- Do not create separate settings, config, custom, or data files/modules solely to hold values for one page. Translation files are only for translating visible user-facing copy; never put settings or other nonlocalized data there. The page owns displaying and orchestrating its model-specific data, while translation files own localized text.
- Keep configuration only for settings intentionally adjustable by environment, deployment, or user choice. Do not create a config module solely to collect fixed values.
- Use the owning domain's established hooks and components. Keep transient prediction/source state local to the feature. Validate user files and URLs at the UI/API boundary and surface meaningful errors.
- Random Prediction: use the existing searchable/clickable class-preview section and its established backend random-source / quick-prediction flow. Class clicks should request a random source using the verified lookup strategy and display the quick prediction as a simple image with backend-provided annotation. Do not substitute the later deep-prediction result UI for this preview. If image input is unsupported, omit this section entirely.
- Random image/video actions in source inputs must use the same class/search strategy as the model's preview flow. After selecting a random source, populate the corresponding URL input with the selected image or video URL, including when the prediction has already been fetched as part of the selection flow.
- Browser-test each supported random image/video action through the URL input itself: verify the selected URL appears in the field, then submit that field with its URL prediction control and confirm the backend URL endpoint receives the exact inserted URL and returns a visible result or meaningful error. Do not count a class-preview request, multipart/file upload, or merely populating the field as URL-endpoint verification.
- Evaluation: every custom-model evaluation section must show a TensorBoard button by default, including while evaluation artifacts are under construction. Use a supplied destination or the repository-established `http://localhost:6006` destination; ask only when neither is appropriate. When assets exist, import and display them using the matching domain evaluation component. Do not fabricate evaluation plots or metrics.
- Source cards should reflect exactly the model's supported inputs. Source input, upload/URL/webcam/video behavior, deep prediction annotation controls, and result layout should match equivalent pages in the domain.
- Video and image prediction results must use the shared `PredictionController` (`src/components/ui/PredictionController.jsx`) for the standard controller layout rather than recreating its shell or controls in a feature page. It provides the shared fullscreen media/controller layout (including the fullscreen Hide/Show controls), per-model confidence-threshold controls, model-specific sections supplied by the page, and annotation options. For multi-model workflows, provide a separate confidence threshold for each model and distinct model-specific sections (for example instance-segmentation classes and pose keypoints); pass these as data/rendered sections while keeping prediction state and annotation behavior in the owning feature. Inspect the controller API and existing detection/pose video pages before extending it.
- For video responses, preserve the established per-frame click navigation and synchronized scrolling behavior controlled by the sync checkbox. Inspect and reuse the existing video response components rather than building a separate implementation.
- Register the new model/page in the existing catalog/workspace-selection flow if that is how neighboring pages are exposed. Preserve sidebar/workspace behavior; these model pages are not URL routes.
- When adding a sidebar submenu item, choose an icon that meaningfully represents the model/task. Check existing sidebar icons, the installed icon library, and project assets first; wire its icon key through the shared sidebar map as needed. If no suitable local icon exists, search the web for an appropriate icon asset, verify its license/source, and add it locally rather than using a generic unrelated icon or an unverified remote URL. Verify the icon in the rendered sidebar.
- Do not copy section markup or introduce dependencies/scripts. Keep the implementation minimal and consistent with repository conventions.

## Verification

After edits, run the repository's required `npm run lint` and `npm run build` commands. For visual or responsive UI changes, verify the rendered page through the project's existing browser automation workflow. Report any blocked verification clearly; do not claim checks passed unless they ran successfully.
