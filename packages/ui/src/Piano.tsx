import { useCallback, useEffect, useMemo, useState } from 'react'
import { noteName, pitchClass, type Pitch } from '@scales/music-theory'
import { notePlayer } from '@scales/audio'
import {
  DEAD_KEYS,
  KEY_SLOTS,
  KEY_SLOTS_BY_CODE,
  OCTAVE_SHIFT,
  WHITE_KEY_COUNT,
  keyboardRange,
  readKeyboardLabels,
  slotToPitch,
  type KeySlot,
} from './keyboardMap'

export interface PianoProps {
  /** Écrit les touches noires en bémols plutôt qu'en dièses. */
  preferFlats?: boolean
  /** Notes mises en évidence — typiquement la gamme étudiée. */
  highlighted?: readonly Pitch[]
  /**
   * Retour visuel après une réponse. Plusieurs marques sont possibles : sur une
   * erreur, montrer aussi où se trouvait la bonne note est le moment où l'on
   * apprend quelque chose.
   */
  feedback?: readonly { note: Pitch; kind: 'correct' | 'wrong' }[] | null
  showNoteNames?: boolean
  /** Écoute le clavier physique. À désactiver quand un champ a le focus. */
  captureKeyboard?: boolean
  disabled?: boolean
  onNote?: (note: Pitch, slot: KeySlot) => void
}

export function Piano({
  preferFlats = false,
  highlighted,
  feedback = null,
  showNoteNames = true,
  captureKeyboard = true,
  disabled = false,
  onNote,
}: PianoProps) {
  const [activeCodes, setActiveCodes] = useState<ReadonlySet<string>>(new Set())
  const [labels, setLabels] = useState<Map<string, string> | null>(null)
  /**
   * Maj enfoncée : le clavier joue une octave au-dessus.
   *
   * Maintenue, et non verrouillée. Une bascule obligerait à se souvenir de
   * l'état courant ; maintenir le rend visible dans la main, et le relâchement
   * ramène toujours au même point de départ.
   */
  const [raised, setRaised] = useState(false)

  useEffect(() => {
    let cancelled = false
    void readKeyboardLabels().then((map) => {
      if (!cancelled) setLabels(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  /**
   * Les notes de la gamme sont repérées par leur SON, pas par leur écriture :
   * en sol♭ majeur le 4e degré est do♭, qui se joue sur la touche blanche si.
   */
  const highlightedClasses = useMemo(
    () => new Set((highlighted ?? []).map(pitchClass)),
    [highlighted],
  )

  /** Orthographe de chaque touche dans la tonalité courante. */
  const spellings = useMemo(() => {
    const map = new Map<number, string>()
    for (const note of highlighted ?? []) map.set(pitchClass(note), noteName(note))
    return map
  }, [highlighted])

  const trigger = useCallback(
    (slot: KeySlot, withOctave: boolean) => {
      if (disabled) return
      const note = slotToPitch(slot, preferFlats, withOctave ? OCTAVE_SHIFT : 0)
      void notePlayer.unlock().then(() => notePlayer.play(note))
      onNote?.(note, slot)
    },
    [disabled, onNote, preferFlats],
  )

  useEffect(() => {
    if (!captureKeyboard) return

    const press = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return

      // On lit l'état de Maj sur l'événement plutôt que de compter les appuis
      // sur ShiftLeft et ShiftRight. `shiftKey` est la vérité du système : il
      // reste juste même si un keyup s'est perdu, ou si Maj était déjà tenue
      // avant que la page prenne le focus.
      setRaised(event.shiftKey)
      if (event.repeat) return

      const slot = KEY_SLOTS_BY_CODE.get(event.code)
      if (slot === undefined) return

      event.preventDefault()
      setActiveCodes((previous) => new Set(previous).add(event.code))
      trigger(slot, event.shiftKey)
    }

    const release = (event: KeyboardEvent) => {
      // Au relâchement de Maj, `shiftKey` vaut déjà false : l'octave retombe.
      setRaised(event.shiftKey)
      setActiveCodes((previous) => {
        if (!previous.has(event.code)) return previous
        const next = new Set(previous)
        next.delete(event.code)
        return next
      })
    }

    /**
     * Quitter la fenêtre en tenant une touche ne produit aucun keyup : sans
     * ce filet, on revient sur une octave haute que plus rien ne justifie, et
     * sur des touches restées allumées.
     */
    const reset = () => {
      setRaised(false)
      setActiveCodes(new Set())
    }

    window.addEventListener('keydown', press)
    window.addEventListener('keyup', release)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', press)
      window.removeEventListener('keyup', release)
      window.removeEventListener('blur', reset)
    }
  }, [captureKeyboard, trigger])

  const labelFor = (slot: { code: string; azertyLabel: string }): string =>
    labels?.get(slot.code)?.toUpperCase() ?? slot.azertyLabel.toUpperCase()

  const feedbackClass = (slot: KeySlot): string => {
    if (feedback === null || feedback === undefined) return ''
    const note = slotToPitch(slot, preferFlats, raised ? OCTAVE_SHIFT : 0)
    const mark = feedback.find((entry) => pitchClass(entry.note) === pitchClass(note))
    if (mark === undefined) return ''
    return mark.kind === 'correct' ? ' piano__key--correct' : ' piano__key--wrong'
  }

  const renderKey = (slot: KeySlot) => {
    const note = slotToPitch(slot, preferFlats, raised ? OCTAVE_SHIFT : 0)
    const isHighlighted = highlightedClasses.has(pitchClass(note))
    const displayName = spellings.get(pitchClass(note)) ?? noteName(note)

    const classes = [
      'piano__key',
      `piano__key--${slot.color}`,
      activeCodes.has(slot.code) ? 'piano__key--active' : '',
      isHighlighted ? 'piano__key--in-scale' : '',
      feedbackClass(slot),
    ]
      .filter(Boolean)
      .join(' ')

    const style =
      slot.color === 'black'
        ? {
            left: `calc(${((slot.whiteIndex + 1) * 100) / WHITE_KEY_COUNT}% - (var(--black-key-width) / 2))`,
          }
        : undefined

    return (
      <button
        key={slot.code}
        type="button"
        className={classes}
        style={style}
        disabled={disabled}
        aria-label={`${displayName}${note.octave}`}
        aria-pressed={activeCodes.has(slot.code)}
        onPointerDown={(event) => {
          event.preventDefault()
          setActiveCodes((previous) => new Set(previous).add(slot.code))
          // Maj vaut aussi à la souris : cliquer en la tenant joue l'octave
          // du dessus, comme au clavier.
          trigger(slot, event.shiftKey)
        }}
        onPointerUp={() =>
          setActiveCodes((previous) => {
            const next = new Set(previous)
            next.delete(slot.code)
            return next
          })
        }
        onPointerLeave={() =>
          setActiveCodes((previous) => {
            if (!previous.has(slot.code)) return previous
            const next = new Set(previous)
            next.delete(slot.code)
            return next
          })
        }
      >
        <span className="piano__key-label">{labelFor(slot)}</span>
        {showNoteNames ? <span className="piano__key-note">{displayName}</span> : null}
      </button>
    )
  }

  const range = keyboardRange(raised ? OCTAVE_SHIFT : 0)

  return (
    <div className="piano" style={{ ['--white-key-count' as string]: WHITE_KEY_COUNT }}>
      {/* Une classe de hauteur porte le même nom à toutes les octaves : sans
          cette étendue affichée, rien à l'écran ne distingue un do4 d'un do5. */}
      <span className={`piano__octave${raised ? ' piano__octave--raised' : ''}`} aria-live="polite">
        {noteName(range.lowest)}
        {range.lowest.octave} – {noteName(range.highest)}
        {range.highest.octave}
      </span>
      <div className="piano__keys">
        {KEY_SLOTS.filter((slot) => slot.color === 'white').map(renderKey)}
        {KEY_SLOTS.filter((slot) => slot.color === 'black').map(renderKey)}
        {DEAD_KEYS.map((dead) => (
          <span
            key={dead.code}
            className="piano__dead-key"
            title="Pas de touche noire ici : mi–fa et si–do sont séparés d’un demi-ton"
            style={{
              left: `calc(${((dead.whiteIndex + 1) * 100) / WHITE_KEY_COUNT}% - (var(--black-key-width) / 2))`,
            }}
          >
            {labelFor(dead)}
          </span>
        ))}
      </div>
    </div>
  )
}
