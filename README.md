# Sticker Status Direct

Online custom-sticker store for Sticker Status (Boise, Idaho). See `CLAUDE.md` for the brief and `docs/build-plan.md` for the plan and progress.

## Run it on your computer

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install      # first time only
npm run dev      # then open http://localhost:3000
```

## Checks (run before calling a step done)

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Where things live

| What | File |
|---|---|
| Products, sizes, quantities, materials, extras, shipping | `src/lib/catalog.ts` |
| Placeholder pricing formula (replace with real pricing) | `src/lib/pricing.ts` + `src/lib/pricing.test.ts` |
| Sticker preview drawing | `src/lib/sticker-svg.ts` |
| Brand colors, fonts, component styles | `src/app/globals.css` |
| Pages | `src/app/(shop)/…` |
