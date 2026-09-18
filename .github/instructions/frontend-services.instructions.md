---
applyTo: "src/services/**/*.{js,ts},src/api/**/*.{js,ts},src/features/**/services/**/*.{js,ts},src/features/**/api/**/*.{js,ts}"
description: "API and business logic boundaries for ML inference services"
---

# Frontend Service Instructions

- Put reusable HTTP communication, request construction, response normalization,
  and API-specific business logic in services.
- Keep services inside the owning feature when they target one ML task or model
  family; keep shared transport helpers in `src/utils` only when domain-neutral.
- Read API base URLs from the existing configuration; never hardcode secrets or
  environment-specific credentials.
- Validate file and URL inputs before sending requests and propagate meaningful
  errors to the UI.
- Keep model endpoint differences in the model catalog or service configuration,
  not scattered through JSX.
