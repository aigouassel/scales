import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  Accidental,
  Formatter,
  GhostNote,
  Renderer,
  Stave,
  StaveNote,
  Voice,
  type RenderContext,
  type StemmableNote,
} from 'vexflow'
import {
  diatonicIndex,
  fromDiatonicIndex,
  toVexflowAccidental,
  toVexflowKey,
  type Letter,
  type Pitch,
} from '@scales/music-theory'

export type SlotStatus = 'correct' | 'wrong' | null

export interface StaffProps {
  /** Une entrée par emplacement ; null = emplacement vide. */
  slots: readonly (Pitch | null)[]
  statuses?: readonly SlotStatus[]
  selectedIndex?: number | null
  /** Bornes diatoniques acceptées au clic. */
  lowDiatonic: number
  highDiatonic: number
  readOnly?: boolean
  onPlace?: (index: number, letter: Letter, octave: number) => void
  onSelect?: (index: number) => void
}

/** En clé de sol, la ligne du haut porte un fa5. */
const TREBLE_TOP_LINE = diatonicIndex({ letter: 'F', octave: 5 })

const HEIGHT = 190
const STAVE_TOP = 50

const COLORS = {
  correct: '#1a7f5a',
  wrong: '#c0392b',
  selected: '#2f6fd0',
  normal: '#17171b',
} as const

interface Geometry {
  slotX: number[]
  topLineY: number
  spacing: number
  noteStartX: number
}

export function Staff({
  slots,
  statuses,
  selectedIndex = null,
  lowDiatonic,
  highDiatonic,
  readOnly = false,
  onPlace,
  onSelect,
}: StaffProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)
  const [width, setWidth] = useState(720)
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [hover, setHover] = useState<{ index: number; diatonic: number } | null>(null)

  // La portée est dessinée en pixels : sa largeur doit suivre le conteneur.
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) setWidth(Math.max(480, Math.floor(entry.contentRect.width)))
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return

    host.replaceChildren()
    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(width, HEIGHT)
    const context: RenderContext = renderer.getContext()

    const stave = new Stave(8, STAVE_TOP, width - 16)
    stave.addClef('treble')
    stave.setContext(context).draw()

    const notes: StemmableNote[] = slots.map((note, index) => {
      if (note === null) return new GhostNote({ duration: 'q' }) as unknown as StemmableNote

      const staveNote = new StaveNote({
        keys: [toVexflowKey(note)],
        duration: 'q',
        clef: 'treble',
        stemDirection: diatonicIndex(note) >= diatonicIndex({ letter: 'B', octave: 4 }) ? -1 : 1,
      })

      const accidental = toVexflowAccidental(note, false)
      if (accidental !== null) staveNote.addModifier(new Accidental(accidental), 0)

      const status = statuses?.[index] ?? null
      const color =
        status === 'correct'
          ? COLORS.correct
          : status === 'wrong'
            ? COLORS.wrong
            : index === selectedIndex
              ? COLORS.selected
              : COLORS.normal
      staveNote.setStyle({ fillStyle: color, strokeStyle: color })

      return staveNote
    })

    const voice = new Voice({ numBeats: slots.length, beatValue: 4 })
    voice.setMode(Voice.Mode.SOFT)
    voice.addTickables(notes)
    new Formatter().joinVoices([voice]).format([voice], width - stave.getNoteStartX() - 40)
    voice.draw(context, stave)

    setGeometry({
      slotX: notes.map((note) => note.getAbsoluteX()),
      topLineY: stave.getYForLine(0),
      spacing: stave.getSpacingBetweenLines(),
      noteStartX: stave.getNoteStartX(),
    })
  }, [slots, statuses, selectedIndex, width])

  /** Convertit une ordonnée en degré diatonique, borné à l'étendue autorisée. */
  const diatonicAt = useCallback(
    (y: number): number | null => {
      if (geometry === null) return null
      const steps = Math.round((y - geometry.topLineY) / (geometry.spacing / 2))
      const value = TREBLE_TOP_LINE - steps
      return value < lowDiatonic || value > highDiatonic ? null : value
    },
    [geometry, highDiatonic, lowDiatonic],
  )

  const slotAt = useCallback(
    (x: number): number | null => {
      if (geometry === null || geometry.slotX.length === 0) return null
      let best = 0
      let bestDistance = Number.POSITIVE_INFINITY
      geometry.slotX.forEach((slotX, index) => {
        const distance = Math.abs(slotX - x)
        if (distance < bestDistance) {
          bestDistance = distance
          best = index
        }
      })
      return best
    },
    [geometry],
  )

  const locate = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const host = hostRef.current
      if (host === null) return null
      const rect = host.getBoundingClientRect()
      const index = slotAt(event.clientX - rect.left)
      const diatonic = diatonicAt(event.clientY - rect.top)
      if (index === null || diatonic === null) return null
      return { index, diatonic }
    },
    [diatonicAt, slotAt],
  )

  const handleClick = (event: PointerEvent<HTMLDivElement>) => {
    if (readOnly) return
    const target = locate(event)
    if (target === null) return
    const { letter, octave } = fromDiatonicIndex(target.diatonic)
    onSelect?.(target.index)
    onPlace?.(target.index, letter, octave)
  }

  const hoverY = useMemo(() => {
    if (geometry === null || hover === null) return null
    return geometry.topLineY + (TREBLE_TOP_LINE - hover.diatonic) * (geometry.spacing / 2)
  }, [geometry, hover])

  return (
    <div className="staff">
      <div
        ref={hostRef}
        className={`staff__canvas${readOnly ? ' staff__canvas--readonly' : ''}`}
        style={{ height: HEIGHT }}
        onPointerDown={handleClick}
        onPointerMove={(event) => {
          if (readOnly) return
          setHover(locate(event))
        }}
        onPointerLeave={() => setHover(null)}
      />

      {geometry !== null ? (
        <div className="staff__overlay" style={{ height: HEIGHT }} aria-hidden="true">
          {slots.map((note, index) => (
            <span
              key={index}
              className={[
                'staff__slot',
                note === null ? 'staff__slot--empty' : '',
                index === selectedIndex ? 'staff__slot--selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: (geometry.slotX[index] ?? 0) - 14,
                top: geometry.topLineY - geometry.spacing * 1.6,
                height: geometry.spacing * 7.2,
              }}
            />
          ))}

          {/* Repère de hauteur sous le curseur : on vise une ligne, pas une zone. */}
          {hover !== null && hoverY !== null && !readOnly ? (
            <span
              className="staff__ghost"
              style={{ left: (geometry.slotX[hover.index] ?? 0) - 7, top: hoverY - 6 }}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
