# Lumo

A candle-warmer lamp that changes color with your mood, plus the web app that drives it.

## What's here

Static site, no build step:

- `index.html` — page structure
- `css/style.css` — theme (colors update live via `--mood` / `--mood-soft` CSS vars)
- `js/app.js` — mood→color engine, switches, Web Bluetooth link to the ESP32

Open `index.html` directly, or serve the folder (`python3 -m http.server`) and visit it in Chrome or Edge — Web Bluetooth requires a secure context (`https://` or `localhost`).

## Features

1. **Connect** — pairs with the lamp over Web Bluetooth (device name must start with `Lumo`).
2. **Warming plate toggle** — on/off switch, writes to the heat characteristic.
3. **Mood orb** — the figure bottom-right. Tap it to expand a panel asking "What's your mood today?"; typed text is mapped to an emotion + color locally (keyword + sentiment heuristic, no API key needed) and pushed to the lamp.
4. Mood history is kept in `localStorage` per-browser as a row of color chips.

If Web Bluetooth isn't available, or nothing's paired yet, every control still works against the on-page preview lamp — nothing is blocked behind a connection.

## ESP32 firmware contract

The web app expects a BLE GATT service with this shape (edit the UUIDs in `js/app.js` to match your sketch):

| Purpose | UUID | Type |
|---|---|---|
| Service | `a1e8f5b0-696b-4e4c-87c6-b8e2d4a1a001` | — |
| Heat plate | `a1e8f5b1-696b-4e4c-87c6-b8e2d4a1a001` | write, 1 byte (`0x00`/`0x01`) |
| Color | `a1e8f5b2-696b-4e4c-87c6-b8e2d4a1a001` | write, 3 bytes (R, G, B) |
| Glow on/off | `a1e8f5b3-696b-4e4c-87c6-b8e2d4a1a001` | write, 1 byte (`0x00`/`0x01`) |

The ESP32 should advertise as a BLE peripheral with a name starting with `Lumo` (e.g. `Lumo-01`) so `navigator.bluetooth.requestDevice` can find it.

## Swapping in a real AI model for mood→color

`deriveMoodColor(text)` in `js/app.js` is a local keyword + sentiment heuristic so the page works offline with zero setup. To use an LLM instead, replace its body with a call to your backend (never call a model API with a secret key directly from the browser), and have that endpoint return `{ hex, emotion, desc }`.
