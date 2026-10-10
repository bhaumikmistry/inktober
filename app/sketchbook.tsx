'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Sketch } from '@/data/sketches'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

type View = 'book' | 'calendar'

/** The box the book or calendar has to fit inside, kept current on resize. */
function useBox() {
  const ref = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: 0, h: 0 })
  useEffect(() => {
    if (!ref.current) return
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])
  return [ref, box] as const
}
type Props = { sketches: Sketch[]; year: number; month: number; arrived: number }

/* A page in the book is one of these. Days that have not arrived yet are still
 * pages, just empty ones, so the book is the full month from the start. */
type Page =
  | { kind: 'cover' } | { kind: 'intro' } | { kind: 'day'; sketch: Sketch }
  | { kind: 'colophon' } | { kind: 'blank' } | { kind: 'back' }

export function Sketchbook({ sketches, year, month, arrived: arrivedFromServer }: Props) {
  // The server knows the date in Boston; the visitor's own clock gets the last word.
  const [arrived, setArrived] = useState(arrivedFromServer)
  useEffect(() => {
    const n = new Date()
    if (n.getFullYear() > year || (n.getFullYear() === year && n.getMonth() > month)) setArrived(31)
    else if (n.getFullYear() === year && n.getMonth() === month) setArrived(Math.max(arrivedFromServer, n.getDate()))
  }, [year, month, arrivedFromServer])

  const [view, setView] = useState<View>('book')
  const [open, setOpen] = useState<number | null>(null)
  const [jump, setJump] = useState<number | null>(null)

  // ?view=calendar and ?day=5 survive a reload and can be shared
  useEffect(() => {
    const q = new URLSearchParams(location.search)
    if (q.get('view') === 'calendar') setView('calendar')
    const d = Number(q.get('day'))
    if (d >= 1 && d <= 31) setOpen(d)
  }, [])
  useEffect(() => {
    const q = new URLSearchParams()
    if (view === 'calendar') q.set('view', 'calendar')
    if (open) q.set('day', String(open))
    const s = q.toString()
    history.replaceState(null, '', s ? `?${s}` : location.pathname)
  }, [view, open])

  const live = sketches.filter((s) => s.day <= arrived)
  const firstWeekday = new Date(year, month, 1).getDay()
  const weekdayOf = (d: number) => WEEKDAYS[(firstWeekday + d - 1) % 7]

  const [stageRef, box] = useBox()
  const phone = box.w > 0 && box.w < 640

  return (
    <main className="app">
      <header className="top">
        <a href="https://www.bhaumikmistry.com" className="name">Bhaumik Mistry</a>
        <div className="switch" role="tablist" aria-label="View">
          {(['book', 'calendar'] as View[]).map((v) => (
            <button key={v} role="tab" aria-selected={view === v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {v === 'book' ? 'Sketchbook' : 'Calendar'}
            </button>
          ))}
        </div>
      </header>

      <section className="hero">
        <span className="eyebrow">Inktober</span>
        <h1 className="year">{year}</h1>
        <div className="meta">
          <p className="lede">One ink drawing a day, through October.</p>
          <Progress arrived={arrived} />
        </div>
      </section>

      <div className="stage" ref={stageRef}>
        {box.w > 0 && (view === 'book' ? (
          phone
            ? <PhoneBook sketches={sketches} arrived={arrived} year={year} month={month} weekdayOf={weekdayOf}
                box={box} jump={jump} onJumped={() => setJump(null)} onOpen={setOpen} />
            : <Book sketches={sketches} arrived={arrived} year={year} month={month} weekdayOf={weekdayOf}
                box={box} jump={jump} onJumped={() => setJump(null)} onOpen={setOpen} />
        ) : (
          <Calendar sketches={sketches} arrived={arrived} year={year} month={month} firstWeekday={firstWeekday}
            box={box} onOpen={setOpen} />
        ))}
      </div>

      {open !== null && (
        <Viewer day={open} live={live} month={month} weekdayOf={weekdayOf}
          onClose={() => setOpen(null)} onGo={setOpen}
          onBook={(d) => { setOpen(null); setView('book'); setJump(d) }} />
      )}
    </main>
  )
}

function Progress({ arrived }: { arrived: number }) {
  return (
    <div className="progress" aria-label={`${arrived} of 31 days`}>
      <div className="ticks">
        {Array.from({ length: 31 }, (_, i) => <i key={i} className={i < arrived ? 'done' : ''} />)}
      </div>
      <span>{arrived} of 31</span>
    </div>
  )
}

/* ---------------------------------------------------------------- the book */

type BookProps = {
  sketches: Sketch[]; arrived: number; year: number; month: number; weekdayOf: (d: number) => string
  box: { w: number; h: number }; jump: number | null; onJumped: () => void; onOpen: (d: number) => void
}
const BAR = 52   // room under the book for its controls

function Book({ sketches, arrived, year, month, weekdayOf, box, jump, onJumped, onOpen }: BookProps) {
  const pages = useMemo<Page[]>(() => {
    const p: Page[] = [{ kind: 'cover' }, { kind: 'intro' }, ...sketches.map((s) => ({ kind: 'day' as const, sketch: s })), { kind: 'colophon' }]
    if (p.length % 2) p.push({ kind: 'blank' })
    p.push({ kind: 'blank' }, { kind: 'back' })
    return p
  }, [sketches])
  // the largest two page spread that fits, pages kept at 3:4
  const pageW = Math.floor(Math.min((box.w - 24) / 2, ((box.h - BAR) * 3) / 4))
  const leaves = pages.length / 2
  const [flipped, setFlipped] = useState(0)
  const [turning, setTurning] = useState<number | null>(null)
  const now = useRef(0)

  // the leaf being turned rides above both stacks until it lands
  const go = useCallback((n: number) => {
    const f = now.current, next = Math.max(0, Math.min(leaves, n))
    if (next === f) return
    now.current = next
    setTurning(next > f ? f : next)
    setTimeout(() => setTurning(null), 950)
    setFlipped(next)
  }, [leaves])

  // a day picked in the calendar opens the book at that page
  useEffect(() => {
    if (jump == null) return
    const index = pages.findIndex((p) => p.kind === 'day' && p.sketch.day === jump)
    go(Math.ceil(index / 2))
    onJumped()
  }, [jump, pages, go, onJumped])

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input,textarea')) return
      if (e.key === 'ArrowRight') go(flipped + 1)
      if (e.key === 'ArrowLeft') go(flipped - 1)
    }
    addEventListener('keydown', k)
    return () => removeEventListener('keydown', k)
  }, [flipped, go])

  const shift = flipped === 0 ? '-25%' : flipped === leaves ? '25%' : '0%'
  const leftPage = flipped > 0 ? pages[flipped * 2 - 1] : null
  const rightPage = flipped < leaves ? pages[flipped * 2] : null
  const label = (p: Page | null) => p?.kind === 'day' ? `October ${p.sketch.day}` : null
  const spread = [label(leftPage), label(rightPage)].filter(Boolean).join(' and ')

  return (
    <section className="bookwrap">
      <div className="book" style={{ width: pageW * 2, height: (pageW * 4) / 3, transform: `translateX(${shift})` }}>
        {Array.from({ length: leaves }, (_, i) => {
          const isFlipped = i < flipped
          const z = turning === i ? 1000 : isFlipped ? i + 1 : leaves - i
          return (
            <div key={i} className={`leaf${isFlipped ? ' flipped' : ''}`} style={{ zIndex: z }}
              onClick={() => go(isFlipped ? i : i + 1)}>
              <div className="face front"><PageView page={pages[i * 2]} side="right" {...{ arrived, year, month, weekdayOf, onOpen }} /></div>
              <div className="face back"><PageView page={pages[i * 2 + 1]} side="left" {...{ arrived, year, month, weekdayOf, onOpen }} /></div>
            </div>
          )
        })}
      </div>
      <div className="bookbar">
        <button onClick={() => go(flipped - 1)} disabled={flipped === 0} aria-label="Previous page">&#8592;</button>
        <span>{flipped === 0 ? 'Cover' : flipped === leaves ? 'The end' : spread || ' '}</span>
        <button onClick={() => go(flipped + 1)} disabled={flipped === leaves} aria-label="Next page">&#8594;</button>
      </div>
    </section>
  )
}

/* On a phone a spread would be postage stamps, so the book is one page at a
 * time: each page turns away to the left, and a swipe turns it. */
function PhoneBook({ sketches, arrived, year, month, weekdayOf, box, jump, onJumped, onOpen }: BookProps) {
  const pages = useMemo<Page[]>(() => [{ kind: 'cover' }, { kind: 'intro' },
    ...sketches.map((s) => ({ kind: 'day' as const, sketch: s })), { kind: 'colophon' }], [sketches])
  const [at, setAt] = useState(0)
  const go = useCallback((n: number) => setAt(Math.max(0, Math.min(pages.length - 1, n))), [pages.length])
  useEffect(() => {
    if (jump == null) return
    go(pages.findIndex((p) => p.kind === 'day' && p.sketch.day === jump))
    onJumped()
  }, [jump, pages, go, onJumped])
  const x0 = useRef(0)
  const pageW = Math.floor(Math.min(box.w - 8, ((box.h - BAR) * 3) / 4))
  const p = pages[at]
  return (
    <section className="bookwrap">
      <div className="phonebook" style={{ width: pageW, height: (pageW * 4) / 3 }}
        onTouchStart={(e) => { x0.current = e.touches[0].clientX }}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - x0.current; if (dx < -40) go(at + 1); if (dx > 40) go(at - 1) }}>
        {pages.map((pg, i) => (
          <div key={i} className={`pleaf${i < at ? ' gone' : ''}`} style={{ zIndex: pages.length - i }}
            onClick={(e) => { const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); go(e.clientX - r.left > r.width / 3 ? at + 1 : at - 1) }}>
            {Math.abs(i - at) <= 2 && <PageView page={pg} side="right" {...{ arrived, year, month, weekdayOf, onOpen }} />}
          </div>
        ))}
      </div>
      <div className="bookbar">
        <button onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous page">&#8592;</button>
        <span>{p.kind === 'day' ? `October ${p.sketch.day}` : p.kind === 'cover' ? 'Cover' : ' '}</span>
        <button onClick={() => go(at + 1)} disabled={at === pages.length - 1} aria-label="Next page">&#8594;</button>
      </div>
    </section>
  )
}

function PageView({ page, side, arrived, year, month, weekdayOf, onOpen }: {
  page: Page; side: 'left' | 'right'; arrived: number; year: number; month: number
  weekdayOf: (d: number) => string; onOpen: (d: number) => void
}) {
  if (page.kind === 'cover') return (
    <div className="page cover"><span className="cv-small">Inktober</span><span className="cv-year">{year}</span><span className="cv-name">Bhaumik Mistry</span></div>
  )
  if (page.kind === 'back') return <div className="page cover back-cover"><span className="cv-small">{year}</span></div>
  if (page.kind === 'blank') return <div className={`page ${side}`} />
  if (page.kind === 'intro') return (
    <div className={`page ${side} text`}>
      <p className="big">Thirty one days.</p>
      <p>One ink drawing for every day of {MONTHS[month]} {year}, kept in the order they were made.</p>
      <p className="muted">Started {MONTHS[month]} 1.</p>
    </div>
  )
  if (page.kind === 'colophon') return (
    <div className={`page ${side} text`}>
      <p className="big">That was October.</p>
      <p className="muted">Ink on paper. Each drawing was scanned the evening it was made.</p>
    </div>
  )
  const { sketch } = page
  const here = sketch.day <= arrived
  return (
    <div className={`page ${side} day`}>
      <div className="day-head">
        <span className="num">{sketch.day}</span>
        <span className="when">{weekdayOf(sketch.day)}<br />{MONTHS[month]} {sketch.day}</span>
      </div>
      {here ? (
        <button className="art" onClick={(e) => { e.stopPropagation(); onOpen(sketch.day) }} aria-label={`Open October ${sketch.day}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sketch.src} alt={sketch.prompt ? `${sketch.prompt}, October ${sketch.day}` : `Ink drawing, October ${sketch.day}`} loading="lazy" />
        </button>
      ) : (
        <div className="art empty"><span>Not drawn yet</span></div>
      )}
      {here && sketch.prompt && <p className="prompt">{sketch.prompt}</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- the calendar */

function Calendar({ sketches, arrived, year, month, firstWeekday, box, onOpen }: {
  sketches: Sketch[]; arrived: number; year: number; month: number; firstWeekday: number
  box: { w: number; h: number }; onOpen: (d: number) => void
}) {
  const cells: (Sketch | null)[] = [...Array(firstWeekday).fill(null), ...sketches]
  while (cells.length % 7) cells.push(null)
  const rows = cells.length / 7, gap = box.w < 640 ? 5 : 10
  // fill the height, and never let a cell get wider than a drawing is tall
  const cellH = (box.h - 34 - gap * (rows - 1)) / rows
  const cellW = Math.min((box.w - gap * 6) / 7, cellH * 0.82)
  const width = cellW * 7 + gap * 6
  return (
    <section className="cal" style={{ width, ['--rows' as string]: rows, ['--gap' as string]: `${gap}px`, ['--cellh' as string]: `${cellH}px` }}>
      <div className="cal-head">{WEEKDAYS.map((w) => <span key={w}><b>{w.slice(0, 3)}</b><i>{w[0]}</i></span>)}</div>
      <div className="cal-grid">
        {cells.map((s, i) => {
          if (!s) return <div key={i} className="cell pad" />
          const here = s.day <= arrived, today = s.day === arrived
          return (
            <button key={i} className={`cell${here ? ' here' : ''}${today ? ' today' : ''}`} disabled={!here}
              onClick={() => onOpen(s.day)} aria-label={here ? `October ${s.day}` : `October ${s.day}, not drawn yet`}>
              <span className="d">{s.day}</span>
              {today && <span className="tag">Today</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {here && <img src={s.src} alt="" loading="lazy" />}
            </button>
          )
        })}
      </div>
    </section>
  )
}

/* ---------------------------------------------------------------- one drawing, large */

function Viewer({ day, live, month, weekdayOf, onClose, onGo, onBook }: {
  day: number; live: Sketch[]; month: number; weekdayOf: (d: number) => string
  onClose: () => void; onGo: (d: number) => void; onBook: (d: number) => void
}) {
  const i = live.findIndex((s) => s.day === day)
  const s = live[i]
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && live[i + 1]) onGo(live[i + 1].day)
      if (e.key === 'ArrowLeft' && live[i - 1]) onGo(live[i - 1].day)
    }
    addEventListener('keydown', k)
    document.body.style.overflow = 'hidden'
    return () => { removeEventListener('keydown', k); document.body.style.overflow = '' }
  }, [i, live, onClose, onGo])
  if (!s) return null
  return (
    <div className="viewer" onClick={onClose} role="dialog" aria-modal="true" aria-label={`October ${s.day}`}>
      <div className="v-inner" onClick={(e) => e.stopPropagation()}>
        <div className="v-top">
          <div><span className="v-day">{MONTHS[month]} {s.day}</span><span className="muted"> · {weekdayOf(s.day)}</span></div>
          <button className="v-x" onClick={onClose} aria-label="Close">&#215;</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={s.src} alt={s.prompt ? `${s.prompt}, October ${s.day}` : `Ink drawing, October ${s.day}`} />
        {(s.prompt || s.note) && <p className="v-note">{s.prompt && <b>{s.prompt}. </b>}{s.note}</p>}
        <div className="v-bar">
          <button onClick={() => live[i - 1] && onGo(live[i - 1].day)} disabled={!live[i - 1]}>&#8592; Previous</button>
          <button className="ghost" onClick={() => onBook(s.day)}>Open in the sketchbook</button>
          <button onClick={() => live[i + 1] && onGo(live[i + 1].day)} disabled={!live[i + 1]}>Next &#8594;</button>
        </div>
      </div>
    </div>
  )
}
