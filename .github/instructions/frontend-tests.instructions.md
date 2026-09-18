---
applyTo: "src/**/*.test.{js,ts,jsx,tsx},src/**/*.spec.{js,ts,jsx,tsx},src/**/tests/**/*.{js,ts,jsx,tsx},tests/**/*.{js,ts,jsx,tsx}"
description: "Testing conventions for shared and domain-specific React features"
---

# Frontend Test Instructions

- Test user-visible behavior and interactions rather than implementation details.
- Keep tests next to the feature or component they verify, mirroring the
  `src/features/<domain>` structure for domain tests.
- Mock inference APIs and external media services at the network boundary.
- Cover loading, success, validation, empty, and error states for model workflows.
- Use the repository's existing test tooling if tests are introduced; do not add a
  new runner without an explicit requirement.
