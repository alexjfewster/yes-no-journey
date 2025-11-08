# Yes/No Journey — Static, mobile-first web app

A lightweight, soothing, static site that asks users a numbered series of Yes/No questions and branches according to their choices. Built for mobile first, accessible, and ready to publish on GitHub Pages.

What I built
- A single static index.html that contains:
  - A sample questions content model (embedded JSON and a `./data/questions.json` file).
  - A mobile-first UI with pastel theme, glassmorphism cards, and large tappable Yes/No buttons.
  - Per-question pages (rendered client-side and addressable by fragment identifiers, e.g. `#q-2`), with graceful fallback for non-JS users.
  - A settings panel for toggling animations, compact mode, and theme variants.
  - Simple share buttons on result pages (copy link + tweet).
  - Accessibility features: heading focus, aria-live on the canvas, keyboard navigation, reduced-motion respect, focus outlines.

Files
- index.html — main static page + embedded sample questions JSON
- css/styles.css — styling, pastel palette, responsive
- js/app.js — tiny client-side renderer and router (hash-based)
- data/questions.json — example questions model mirrored from the embedded JSON

How to edit questions (content-first)
- Primary place to edit is `data/questions.json`. The embedded JSON in `index.html` under `<script id="questions" type="application/json">` mirrors the same sample: update either one, but keep them in sync for your workflow.
- Question object shape:
  {
    "id": "1",
    "image": "https://.../portrait.jpg",
    "alt": "descriptive alt text",
    "question": "1. Do you prefer mornings?",
    "yes_target": "2",
    "no_target": "3",
    "meta": { "tags": ["morning"], "explanation": "Optional explanatory text", "summary": "For end pages" }
  }
- yes_target and no_target must point to another `id` present in the model. If both targets are null, the question is treated as an end/result page.

Notes & tips
- For shareable, bookmarkable URLs the app uses fragment routes `#q-<id>`. You can link to `https://<your-site>/#q-end_early`.
- If a mapping points to a non-existent id the site shows a friendly "Missing page" fallback and offers to restart.
- Self-loops are permitted (yes_target === current id) but will create looping behavior — avoid unless intentionally desired.
- To disable animations or respect `prefers-reduced-motion`, toggle animations in settings or use your system setting.
- For longer flows, enable compact mode to reduce image sizes and compress layout.
- Analytics: every choice button includes `data-qid` and `data-choice` attributes so privacy-friendly analytics can be added later.

Publishing
- This is a static site; simply push the repository to GitHub and enable GitHub Pages (serve from `main` branch / root).
- All assets are referenced by relative paths (css/ and js/), images are external in the sample questions — replace with your own absolute or relative image URLs.

Extensibility ideas
- Add a small build script that reads `data/questions.json` and pre-renders per-question HTML files for fully serverless static pages (no JS needed).
- Add multi-language support by moving strings into a small i18n JSON and supporting `?lang=xx` query param or `Accept-Language`.
- Add conditional logic (show a question only if previous answers match) by enhancing the model with `conditions` arrays and evaluating them in `app.js`.
- Add privacy-first analytics hooks by reading `data-qid` attributes and batching events locally.

What I need from you next
- Supply your real question content (an array of question objects) or point to a `questions.json` you'd like me to import.
- Tell me whether you'd like me to:
  - Keep this single-file generator (index + JSON) or produce pre-rendered per-question HTML files (useful for non-JS browsing and SEO).
  - Replace the sample Unsplash images with your own images (provide URLs) or let me fetch themed placeholders.

I'll wait for your list of questions and directions and then update the site content (or generate per-page HTML) as you prefer.