---
applyTo: "src/utils/**/*.{js,ts},src/lib/**/*.{js,ts},src/features/**/utils/**/*.{js,ts}"
description: "Pure utility organization for shared and domain ML frontend helpers"
---

# Utility Instructions

- Keep utilities pure, focused, and independent of React state, context, and
  lifecycle APIs.
- Put domain-specific transformations in the owning feature's `utils` folder;
  use `src/utils` only for genuinely shared helpers.
- Prefer one responsibility per module and reuse existing helpers before adding
  duplicates.
- Document public utility functions with JSDoc, including parameters, returns,
  and a representative usage example.
- Keep API calls and stateful workflows out of utilities.
