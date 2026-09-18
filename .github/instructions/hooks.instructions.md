---
applyTo: "src/hooks/**/*.{js,ts},src/features/**/hooks/**/*.{js,ts},src/**/*.custom.{js,ts}"
description: "Custom hook boundaries for shared and domain-specific React state"
---

# Hook Instructions

- Use hooks for reusable stateful workflows, effects, subscriptions, timers, and
  cleanup logic.
- Keep domain hooks inside their owning `src/features/<domain>/hooks` directory.
- Keep shared hooks domain-neutral.
- Keep pure transformations in utilities rather than hook files.
- Clean up webcam streams, WebSockets, object URLs, timers, and event listeners.
- Expose consistent loading, error, and result state to consuming components.
