import { SKETCHES, YEAR, MONTH } from '@/data/sketches'
import { Sketchbook } from './sketchbook'

// Rebuilt hourly, so a new day appears without a deploy.
export const revalidate = 3600

/** How many days of October have arrived, in Boston, where the drawing happens. */
function daysArrived() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }))
  if (now.getFullYear() > YEAR || (now.getFullYear() === YEAR && now.getMonth() > MONTH)) return 31
  if (now.getFullYear() < YEAR || now.getMonth() < MONTH) return 0
  return now.getDate()
}

export default function Page() {
  return <Sketchbook sketches={SKETCHES} year={YEAR} month={MONTH} arrived={daysArrived()} />
}
