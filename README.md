# Inktober 2026

One ink drawing a day through October, as a flip book and as a calendar.
Live at [inktober.bhaumikmistry.com](https://inktober.bhaumikmistry.com).

## Adding a drawing

1. Put the scan in `public/sketches/`. Any image format.
2. Point that day's `src` at it in `data/sketches.ts`, and add a `prompt` or
   `note` if you like. Remove `sample: true`.
3. Push. The page rebuilds hourly, and a day only shows once its date has
   arrived in Boston, so drawings can be added ahead of time.

The placeholder drawings come from `pnpm mock`, which writes
`public/sketches/day-01.svg` to `day-31.svg`.

## Running it

```
pnpm install
pnpm dev        # http://localhost:3020
```
