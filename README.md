# Rustform Studio

A visual, multi-backend GUI designer for Rust. Build a screen from a shared widget model, edit layout, styling, and interactions, preview it in the browser, then export code for your preferred Rust UI library.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. The production build is `npm run build`.

Projects are saved automatically in the browser's **localStorage** under `rustform-project-v1`. They are tied to this browser profile and origin (`localhost:5173`), not written to a file in the repository. Use the Generate Code dialog to download generated source files.

## Backend adapters

The backend picker supports:

| Library | Output | Notes |
| --- | --- | --- |
| egui / eframe | `main.rs` | Absolute-positioned immediate-mode UI |
| iced | `main.rs` | Typed message/update/view application |
| Slint | `.slint` | Declarative screen with properties and callbacks |
| gtk4-rs | `main.rs` | GTK4 `Fixed` layout with connected signals |
| Dioxus | `main.rs` | RSX desktop app with signals and handlers |
| fltk-rs | `main.rs` | Lightweight native widgets and callbacks |

The ecosystem map also tracks Xilem, KAS, Vizia, Azul, Freya, Makepad, Tauri, Relm4, and CXX-Qt as future adapters. They are intentionally marked **Planned** rather than presented as working generators.

## Features

- Drag components from the library onto the canvas, move them with center-guide snapping, resize from four corners or four edges, and reorder layers.
- Build multiple pages, each with its own size, background, widgets, and interactions; switch pages with the tab bar.
- Edit layout, content, typography, colors, opacity, visibility, and locking in the inspector.
- Add interactions to buttons, inputs, checkboxes, and sliders: messages, navigation, set text, toggle visibility, or custom Rust code.
- Preview interactions in place; actions such as messages and navigation are simulated.
- Export the active page; switch pages to generate each screen.
- Switch backends at any time; the shared project model is preserved.
- Undo/redo, keyboard nudging, duplicate/delete, responsive canvas presets, local autosave, and code download.
- Generated Rust outputs are syntax-checked with `rustfmt` for the Rust backends.

## Architecture

- `src/types.ts` — backend-agnostic project and widget model.
- `src/data.ts` — backend registry, widget defaults, and starter screen.
- `src/components/Canvas.tsx` — drag/drop, selection, movement, resizing, preview.
- `src/components/Inspector.tsx` — properties and action editor.
- `src/codegen.ts` — six backend-specific code generators.
- `src/components/BackendModal.tsx` — backend picker and Rust GUI ecosystem map.

### Saved data and pages

`Project` contains an ordered list of `Page` objects and an `activePageId`. Existing single-screen projects saved by earlier versions are migrated automatically into a one-page project on load. Each page is exported separately from the Generate Code dialog.

### Adding a backend

1. Add its metadata to `BACKENDS` in `src/data.ts` and extend `BackendId`.
2. Implement a generator in `src/codegen.ts` and add it to the `generateCode` switch.
3. Map the shared widget types and `WidgetAction` kinds to the library's API.
4. Add the library to the ecosystem list when it is genuinely supported.

## Scope

This is an editor and code generator, not a runtime abstraction that compiles the same code against every library. Rust GUI libraries have fundamentally different layout, state, and event models, so each export is idiomatic to its target. Absolute positioning is preserved where the toolkit supports it; iced exports a readable vertical layout because its core model is layout-driven.
