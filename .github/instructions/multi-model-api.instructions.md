---
applyTo: "src/features/multi_model/**/*.{js,jsx,ts,tsx}"
description: "Frontend request conventions for the multi-model prediction API"
---

# Multi-model API requests

- Read the backend OpenAPI description before changing the multi-model request
  contract. Keep `models` as repeated values, not a comma-separated string.
- For file uploads, send `POST` requests as `multipart/form-data`: append the
  media under `source`, append each selected model as a separate `models` field,
  and append `model_options` once as a JSON string keyed by model identifier.
- For URL sources, use the matching `GET` endpoint with `source` as a query
  parameter, repeat `models` in the query, and pass `model_options` as a
  JSON-encoded query parameter. Use `URLSearchParams` or the existing query
  helper so JSON and repeated values are encoded correctly.
- `model_options` contains one option object per selected model. The detector
  selector is `model_options["object-detection"].model`; it accepts `yolo26x`
  (the default), `face-mask-detect`, `road-sign-detect`, or `knife`. Select
  `object-detection` in `models`; `knife` is a detector choice, not a separate
  model identifier.
- Multi-model image responses and video-frame `predictions` are keyed by the
  selected model identifiers. Preserve those keys when normalizing results;
  object-detection results are under `predictions["object-detection"]`.
- Video upload and URL requests return a `job_id`. Use the existing video-job
  progress helper with the matching `/progress/{job_id}` endpoint; it reports
  aggregate progress and resolves with the combined per-frame result. Submit
  all selected models in one video job rather than launching a separate request
  for each model.
