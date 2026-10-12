# Pom Pop — Riko Arcade

A phone-friendly browser game starring Riko and her sisters. Pom Pop opens straight into the original merge game, with the rest of the arcade available from the menu.

## Play locally

Open `index.html` in a modern browser, or serve this folder with any static web server. The game has no build step or external dependencies.

## Files

- `index.html` — game screens and page structure
- `styles.css` — visual design and responsive layouts
- `app.js` — merge physics, game modes, and arcade features
- `.nojekyll` — keeps GitHub Pages from processing the game files

## Publish with GitHub Pages

The repository publishes the `main` branch from the root folder. Changes pushed to `main` are deployed automatically by GitHub Pages.

Scores, challenges, and arcade items are saved in the browser's local storage on the device that plays. They do not sync between devices.
