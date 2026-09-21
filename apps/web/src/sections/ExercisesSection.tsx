import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEGREE_NAMES,
  diatonicIndex,
  isSamePitch,
  majorScale,
  noteName,
  pitch,
  type Alteration,
  type Letter,
  type Pitch,
  type ScaleKey,
} from '@scales/music-theory'
import { notePlayer } from '@scales/audio'
import { Staff, type SlotStatus } from '@scales/ui'

/** Étendue cliquable : large, pour que l'erreur reste possible. */
const LOW = diatonicIndex({ letter: 'C', octave: 4 })
const HIGH = diatonicIndex({ letter: 'C', octave: 6 })

const EMPTY: (Pitch | null)[] = Array.from({ length: 8 }, () => null)

const ALTERATION_CHOICES: { value: Alteration; symbol: string; label: string }[] = [
  { value: -1, symbol: '♭', label: 'bémol' },
  { value: 0, symbol: '♮', label: 'bécarre' },
  { value: 1, symbol: '♯', label: 'dièse' },
]

const ORDINAL = (index: number) => (index === 0 ? '1re' : `${index + 1}e`)

export interface ExercisesSectionProps {
  scaleKey: ScaleKey
  solvedCount: number
  totalCount: number
  onSolved: (keyId: string) => void
}

export function ExercisesSection({
  scaleKey,
  solvedCount,
  totalCount,
  onSolved,
}: ExercisesSectionProps) {
  const expected = useMemo(() => majorScale({ ...scaleKey.tonic, octave: 4 }), [scaleKey])

  const [slots, setSlots] = useState<(Pitch | null)[]>(EMPTY)
  const [selected, setSelected] = useState<number | null>(0)
  const [alteration, setAlteration] = useState<Alteration>(0)
  const [statuses, setStatuses] = useState<SlotStatus[] | null>(null)
  const [hintShown, setHintShown] = useState(false)

  // Changer de tonalité remet l'exercice à zéro : la réponse n'est plus la même.
  useEffect(() => {
    setSlots(EMPTY)
    setSelected(0)
    setStatuses(null)
    setHintShown(false)
    setAlteration(0)
  }, [scaleKey])

  const place = useCallback(
    (index: number, letter: Letter, octave: number) => {
      setStatuses(null)
      const note = pitch(letter, alteration, octave)
      setSlots((previous) => {
        const next = [...previous]
        next[index] = note
        return next
      })
      void notePlayer.unlock().then(() => notePlayer.play(note, { duration: 0.8 }))
    },
    [alteration],
  )

  /**
   * La palette est une plume : elle règle ce qui sera écrit au prochain clic,
   * et ne touche à aucune note déjà posée.
   *
   * La faire agir aussi sur la note sélectionnée paraissait pratique, mais
   * produisait l'inverse : comme poser une note la sélectionne, choisir un
   * bémol pour la note SUIVANTE altérait silencieusement la précédente. Pour
   * corriger une note, on la réécrit — un clic au même endroit avec l'autre
   * plume.
   */
  const chooseAlteration = (value: Alteration) => {
    setAlteration(value)
  }

  const clearSelected = useCallback(() => {
    if (selected === null) return
    setStatuses(null)
    setSlots((previous) => {
      const next = [...previous]
      next[selected] = null
      return next
    })
  }, [selected])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.tagName === 'INPUT') return

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()
        clearSelected()
      } else if (event.key === 'ArrowRight') {
        setSelected((previous) => Math.min((previous ?? -1) + 1, slots.length - 1))
      } else if (event.key === 'ArrowLeft') {
        setSelected((previous) => Math.max((previous ?? 1) - 1, 0))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [clearSelected, slots.length])

  const isComplete = slots.every((note) => note !== null)

  const check = () => {
    const result: SlotStatus[] = slots.map((note, index) => {
      const target = expected[index]
      if (note === null || target === undefined) return 'wrong'
      return isSamePitch(note, target) ? 'correct' : 'wrong'
    })
    setStatuses(result)

    if (result.every((status) => status === 'correct')) {
      onSolved(scaleKey.id)
      void notePlayer.playSequence(expected, { interval: 0.32 })
    }
  }

  const listen = (notes: readonly (Pitch | null)[]) => {
    const playable = notes.filter((note): note is Pitch => note !== null)
    if (playable.length === 0) return
    void notePlayer.playSequence(playable, { interval: 0.42 })
  }

  const solved = statuses !== null && statuses.every((status) => status === 'correct')
  const showCorrection = statuses !== null && !solved

  /** Les écarts, en une ligne compacte plutôt qu'en liste : la place est comptée. */
  const differences = expected
    .map((target, index) => {
      const written = slots[index]
      if (written !== undefined && written !== null && isSamePitch(written, target)) return null
      return { index, target, written: written ?? null }
    })
    .filter((entry): entry is { index: number; target: Pitch; written: Pitch | null } => entry !== null)

  return (
    <section className="section">
      <header className="bar">
        <h2>Écrire la gamme de {scaleKey.name}</h2>
        <span className="bar__meta">
          {solvedCount} sur {totalCount} écrites sans faute
        </span>
        <div className="bar__spacer" />
        <div className="toolbar__group" role="group" aria-label="Altération">
          {ALTERATION_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`chip${alteration === choice.value ? ' chip--active' : ''}`}
              onClick={() => chooseAlteration(choice.value)}
              aria-pressed={alteration === choice.value}
              title={`Écrire la prochaine note avec un ${choice.label}`}
            >
              <span className="chip__symbol">{choice.symbol}</span>
              {choice.label}
            </button>
          ))}
        </div>
      </header>

      <p className="hint">
        L’altération choisie s’applique au prochain clic ; pour corriger, recliquez au même
        endroit. <kbd>←</kbd> <kbd>→</kbd> sélectionnent, <kbd>Suppr</kbd> efface.
        {hintShown ? (
          <strong className="hint__reveal">
            {scaleKey.accidentalCount === 0
              ? ' Cette gamme ne comporte aucune altération.'
              : ` Cette gamme comporte ${scaleKey.accidentalCount} ${
                  scaleKey.accidentalKind === 'sharp' ? 'dièse' : 'bémol'
                }${scaleKey.accidentalCount > 1 ? 's' : ''}.`}
          </strong>
        ) : null}
      </p>

      <div className="stage">
        <div className="stage__staff">
          {showCorrection ? <span className="stage__label">Votre gamme</span> : null}
          <Staff
            slots={slots}
            statuses={statuses ?? undefined}
            selectedIndex={selected}
            lowDiatonic={LOW}
            highDiatonic={HIGH}
            onPlace={place}
            onSelect={setSelected}
          />
        </div>

        {showCorrection ? (
          <div className="stage__staff">
            <span className="stage__label stage__label--expected">Attendue</span>
            <Staff slots={expected} lowDiatonic={LOW} highDiatonic={HIGH} readOnly />
          </div>
        ) : null}
      </div>

      {statuses !== null ? (
        <p className={`result ${solved ? 'result--success' : 'result--error'}`}>
          {solved ? (
            <>
              <strong>Juste.</strong> {expected.map((note) => noteName(note)).join(' ')}
            </>
          ) : (
            <>
              <strong>
                {differences.length} note{differences.length > 1 ? 's' : ''} à revoir.
              </strong>{' '}
              {differences.map((entry) => (
                <span key={entry.index} className="result__item">
                  <span className="result__degree" title={DEGREE_NAMES[entry.index] ?? 'octave'}>
                    {ORDINAL(entry.index)}
                  </span>
                  <strong>{noteName(entry.target)}</strong>
                  <span className="result__written">
                    {entry.written === null ? 'non posée' : `vous : ${noteName(entry.written)}`}
                  </span>
                </span>
              ))}
            </>
          )}
        </p>
      ) : null}

      <footer className="bar bar--footer">
        <button
          type="button"
          className="button"
          onClick={() => listen(slots)}
          disabled={!slots.some(Boolean)}
        >
          Écouter ma gamme
        </button>
        <button type="button" className="button" onClick={() => setSlots(EMPTY)}>
          Tout effacer
        </button>
        <div className="bar__spacer" />
        <button type="button" className="button" onClick={() => setHintShown((shown) => !shown)}>
          {hintShown ? 'Masquer l’indice' : 'Indice'}
        </button>
        <button
          type="button"
          className="button button--primary"
          onClick={check}
          disabled={!isComplete}
        >
          Vérifier
        </button>
      </footer>
    </section>
  )
}
