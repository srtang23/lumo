# Sophia Tang — Portfolio

A self-built version of the Framer portfolio, made with [Astro](https://astro.build).

## Run it

```sh
npm install
npm run dev      # local site at http://localhost:4321
npm run build    # static site in dist/, ready for any host
```

## Where things live

- `src/data/projects.ts` — project cards (titles, blurbs, images, order) and the Resume / LinkedIn links
- `src/pages/` — one file per page (`index.astro` is Home)
- `src/components/` — the nav and the About page photo scatter
- `src/styles/global.css` — colours, fonts, paper texture and the desktop scaling rule
- `public/images`, `public/fonts` — all images and fonts, self-hosted

## Scaling

Below 1200px wide, 1rem = 16px. From 1200px up the root font size grows with
the window, so the desktop layout keeps the same proportions on every screen
(1.2x at 1440px, 1.6x at 1920px). Write sizes in rem to take part in this.
