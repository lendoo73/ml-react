---
applyTo: "src/features/**/*.{js,jsx,ts,tsx}"
description: "Domain ownership and API/data handling within frontend features"
---

# Frontend Domain Feature Instructions

- Keep domain behavior, API request handling, and response normalization within
  the owning feature under `src/features/<domain>/`.
- Use feature components and hooks to organize that behavior; do not introduce a
  separate service layer or `services`/`api` folders.
- Keep genuinely domain-neutral infrastructure in shared locations such as
  `src/utils` or `src/config`.
- Read API base URLs from the existing configuration; never hardcode secrets or
  environment-specific credentials.
- Validate file and URL inputs before sending requests and propagate meaningful
  errors to the UI.
- Keep model endpoint differences in the model catalog, not scattered through
  unrelated domains.
