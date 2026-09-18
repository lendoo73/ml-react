---
applyTo: "src/context/**/*.{jsx,tsx},src/store/**/*.{js,ts},src/redux/**/*.{js,ts},src/state/**/*.{js,ts},src/features/**/store/**/*.{js,ts},src/features/**/state/**/*.{js,ts}"
description: "State ownership and data flow for the React frontend"
---

# State Management Instructions

- Keep transient input, upload, prediction, modal, and display state local to the
  owning feature or component.
- Use context only for app-wide concerns already present here, such as language
  and theme.
- Keep state organized by domain and use unidirectional data flow.
- Do not place model-specific inference results in global context unless a future
  cross-page requirement makes that necessary.
- Clean up external resources when stateful features unmount or change models.
