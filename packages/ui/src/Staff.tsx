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

/**
 * `enharmonic` : la note sonne juste mais s'écrit avec la mauvaise lettre.
 * Elle mérite sa propre couleur — la marquer comme fausse laisserait croire
 * à une erreur d'oreille, alors que l'oreille avait raison.
 */
export type SlotStatus = 'correct' | 'enharmonic' | 'wrong' | null

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

/**
 * Hauteur du dessin en unités VexFlow : quatre interlignes réservés au-dessus
 * de la portée, ses quatre interlignes, puis de quoi loger une ligne
 * supplémentaire et une hampe en dessous.
 */
const DRAWING_UNITS = 112

/**
 * Bornes de l'agrandissement. En dessous de 1,15 un demi-interligne tombe
 * sous 6 px et devient impossible à viser ; au-delà de 2,4 les têtes de notes
 * deviennent caricaturales sans que la visée y gagne.
 */
const MIN_SCALE = 1.15
const MAX_SCALE = 2.4

/** En clé de sol, la ligne du haut porte un fa5. */
const TREBLE_TOP_LINE = diatonicIndex({ letter: 'F', octave: 5 })

/**
 * VexFlow grave avec un interligne de 10 px, ce qui laisse 5 px entre deux
 * degrés voisins : trop peu pour viser à la souris. Tout est donc mis à
 * l'échelle — portée, clé, notes — plutôt que d'écarter les seules lignes,
 * qui donnerait des têtes de notes trop petites.
 *
 * L'agrandissement se déduit de la hauteur disponible : la portée remplit la
 * place qu'on lui donne au lieu d'imposer la sienne.
 */
function scaleFor(height: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, height / DRAWING_UNITS))
}

const COLORS = {
  correct: '#1a7f5a',
  enharmonic: '#c08a2e',
  wrong: '#c0392b',
  selected: '#2f6fd0',
} as const

/**
 * VexFlow grave en noir par défaut, ce qui disparaît sur un thème sombre.
 * On lui donne la couleur de texte effective du conteneur : la portée suit
 * alors le thème sans que le composant ait à le connaître.
 */
function inkColor(host: HTMLElement): string {
  const color = window.getComputedStyle(host).color
  return color === '' ? '#17171b' : color
}

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
  const [box, setBox] = useState({ width: 720, height: 180 })
  const [geometry, setGeometry] = useState<Geometry | null>(null)
  const [hover, setHover] = useState<{ index: number; diatonic: number } | null>(null)
  const [scheme, setScheme] = useState(0)

  // Le passage clair/sombre change la couleur d'encre : il faut redessiner.
  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setScheme((value) => value + 1)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // La portée est dessinée en pixels : elle doit suivre la boîte qu'on lui
  // alloue, en largeur comme en hauteur.
  useEffect(() => {
    const host = hostRef.current
    if (host === null) return

    const observer = new ResizeObserver(([entry]) => {
      if (entry === undefined) return
      const width = Math.max(420, Math.round(entry.contentRect.width))
      const height = Math.max(120, Math.round(entry.contentRect.height))
      // On ne redessine que si la boîte a vraiment changé : un setState
      // inconditionnel ici déclencherait une boucle de redimensionnement.
      setBox((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      )
    })
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const host = hostRef.current
    if (host === null) return

    const { width, height } = box
    const scale = scaleFor(height)

    host.replaceChildren()
    const renderer = new Renderer(host, Renderer.Backends.SVG)
    renderer.resize(width, height)
    const context: RenderContext = renderer.getContext()

    // La couleur par défaut du contexte s'applique à tout ce qui n'a pas de
    // style propre : lignes de portée, clé, hampes. Les notes, elles, portent
    // leur propre style de correction.
    const ink = inkColor(host)
    context.setFillStyle(ink)
    context.setStrokeStyle(ink)

    context.scale(scale, scale)

    const innerWidth = width / scale
    // Le dessin est centré verticalement dans la boîte : quand elle est plus
    // haute que nécessaire, la portée ne reste pas collée en haut.
    const innerTop = Math.max(0, (height / scale - DRAWING_UNITS) / 2)
    const stave = new Stave(8, innerTop, innerWidth - 16)
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
        status !== null
          ? COLORS[status]
          : index === selectedIndex
            ? COLORS.selected
            : ink
      staveNote.setStyle({ fillStyle: color, strokeStyle: color })
      // Les lignes supplémentaires ont leur propre style dans VexFlow et ne
      // suivent pas celui de la note : sans cela, le do central reste gravé
      // en gris sombre, invisible sur fond foncé.
      staveNote.setLedgerLineStyle({ fillStyle: color, strokeStyle: color, lineWidth: 1.4 })

      return staveNote
    })

    const voice = new Voice({ numBeats: slots.length, beatValue: 4 })
    voice.setMode(Voice.Mode.SOFT)
    voice.addTickables(notes)
    new Formatter().joinVoices([voice]).format([voice], innerWidth - stave.getNoteStartX() - 24)

    /**
     * Le formateur répartit les notes selon leur largeur réelle : une note
     * avec altération et ligne supplémentaire est plus large qu'une case vide.
     * Les emplacements se déplaçaient donc à mesure qu'on écrivait, et on
     * visait une cible qui bougeait.
     *
     * On impose un pas régulier après coup. C'est légitime ici : ce n'est pas
     * une partition à graver, c'est une grille de saisie à huit cases, et une
     * cible immobile vaut mieux qu'un espacement typographiquement parfait.
     */
    const firstX = stave.getNoteStartX() + 14
    const step = (innerWidth - firstX - 18) / slots.length
    const targets = notes.map((_, index) => firstX + step * (index + 0.5))
    notes.forEach((note, index) => {
      note.setXShift((targets[index] as number) - note.getAbsoluteX())
    })

    voice.draw(context, stave)

    // La géométrie est exposée en pixels de page : l'échelle est absorbée ici,
    // pour que le calcul du clic n'ait pas à la connaître.
    setGeometry({
      slotX: targets.map((x) => x * scale),
      topLineY: stave.getYForLine(0) * scale,
      spacing: stave.getSpacingBetweenLines() * scale,
      noteStartX: stave.getNoteStartX() * scale,
    })
  }, [slots, statuses, selectedIndex, box, scheme])

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
        onPointerDown={handleClick}
        onPointerMove={(event) => {
          if (readOnly) return
          setHover(locate(event))
        }}
        onPointerLeave={() => setHover(null)}
      />

      {geometry !== null ? (
        <div className="staff__overlay" aria-hidden="true">
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
