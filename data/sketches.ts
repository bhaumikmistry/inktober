/* The sketchbook. One entry per day of October.
 *
 * To publish a real drawing: put the scan in public/sketches (any name, jpg,
 * png or svg), point `src` at it, and optionally add the prompt and a note.
 * A day only appears once its date has arrived, so drawings can be added early.
 */
export const YEAR = 2026
export const MONTH = 9 // October, zero based

export type Sketch = {
  day: number
  src: string
  prompt?: string
  note?: string
  sample?: boolean
}

export const SKETCHES: Sketch[] = Array.from({ length: 31 }, (_, i) => ({
  day: i + 1,
  src: `/sketches/day-${String(i + 1).padStart(2, '0')}.svg`,
  sample: true,
}))
