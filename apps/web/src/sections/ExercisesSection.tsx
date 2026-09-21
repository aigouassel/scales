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

export interface ExercisesSectionProps {
  scaleKey: ScaleKey
  onSolved: (keyId: string) => void
}

export function ExercisesSection({ scaleKey, onSolved }: ExercisesSectionProps) {
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
      setSlots((previous) => {
        const next = [...previous]
        next[index] = pitch(letter, alteration, octave)
        return next
      })
      const note = pitch(letter, alteration, octave)
      void notePlayer.unlock().then(() => notePlayer.play(note, { duration: 0.8 }))
    },
    [alteration],
  )

  /** La palette agit sur la note sélectionnée si elle existe, sinon sur la suivante. */
  const chooseAlteration = (value: Alteration) => {
    setAlteration(value)
    if (selected === null) return
    const current = slots[selected]
    if (current === undefined || current === null) return

    setStatuses(null)
    const updated = pitch(current.letter, value, current.octave)
    setSlots((previous) => {
      const next = [...previous]
      next[selected] = updated
      return next
    })
    void notePlayer.unlock().then(() => notePlayer.play(updated, { duration: 0.8 }))
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
  const mistakes = statuses?.filter((status) => status === 'wrong').length ?? 0

  return (
    <section className="section">
      <header className="section__header">
        <div>
          <h2>Écrire la gamme de {scaleKey.name}</h2>
          <p className="section__lead">
            Posez les huit notes sur la portée, de la tonique à son octave. Choisissez
            l’altération avant de cliquer, ou sélectionnez une note déjà posée pour la
            modifier.
          </p>
        </div>
      </header>

      <div className="toolbar">
        <div className="toolbar__group" role="group" aria-label="Altération">
          {ALTERATION_CHOICES.map((choice) => (
            <button
              key={choice.value}
              type="button"
              className={`chip${alteration === choice.value ? ' chip--active' : ''}`}
              onClick={() => chooseAlteration(choice.value)}
              aria-pressed={alteration === choice.value}
              title={choice.label}
            >
              <span className="chip__symbol">{choice.symbol}</span>
              {choice.label}
            </button>
          ))}
        </div>

        <div className="toolbar__group">
          <button type="button" className="button" onClick={() => listen(slots)} disabled={!slots.some(Boolean)}>
            Écouter ma gamme
          </button>
          <button type="button" className="button" onClick={clearSelected} disabled={selected === null}>
            Effacer la note
          </button>
          <button type="button" className="button" onClick={() => setSlots(EMPTY)}>
            Tout effacer
          </button>
        </div>
      </div>

      <Staff
        slots={slots}
        statuses={statuses ?? undefined}
        selectedIndex={selected}
        lowDiatonic={LOW}
        highDiatonic={HIGH}
        onPlace={place}
        onSelect={setSelected}
      />

      <div className="toolbar toolbar--end">
        <button
          type="button"
          className="button"
          onClick={() => setHintShown((shown) => !shown)}
        >
          {hintShown ? 'Masquer l’indice' : 'Indice'}
        </button>
        <button type="button" className="button button--primary" onClick={check} disabled={!isComplete}>
          Vérifier
        </button>
      </div>

      {hintShown && statuses === null ? (
        <p className="callout callout--hint">
          {scaleKey.accidentalCount === 0
            ? 'Cette gamme ne comporte aucune altération.'
            : `Cette gamme comporte ${scaleKey.accidentalCount} ${
                scaleKey.accidentalKind === 'sharp' ? 'dièse' : 'bémol'
              }${scaleKey.accidentalCount > 1 ? 's' : ''}. À vous de trouver lesquelles.`}
        </p>
      ) : null}

      {statuses !== null ? (
        <div className={`callout ${solved ? 'callout--success' : 'callout--error'}`}>
          {solved ? (
            <p>
              <strong>Juste.</strong> {scaleKey.name} s’écrit bien{' '}
              {expected.map((note) => noteName(note)).join(' ')}.
            </p>
          ) : (
            <>
              <p>
                <strong>
                  {mistakes} note{mistakes > 1 ? 's' : ''} à revoir.
                </strong>{' '}
                Voici la gamme attendue :
              </p>
              <Staff slots={expected} lowDiatonic={LOW} highDiatonic={HIGH} readOnly />
              <ul className="diff">
                {expected.map((target, index) => {
                  const written = slots[index]
                  if (written !== undefined && written !== null && isSamePitch(written, target)) {
                    return null
                  }
                  const degree = index < 7 ? DEGREE_NAMES[index] : 'octave'
                  return (
                    <li key={index}>
                      <span className="diff__degree">
                        {index + 1}
                        <sup>{index === 0 ? 're' : 'e'}</sup> degré ({degree})
                      </span>
                      <span className="diff__expected">{noteName(target)}</span>
                      {written !== undefined && written !== null ? (
                        <span className="diff__written">au lieu de {noteName(written)}</span>
                      ) : (
                        <span className="diff__written">non posée</span>
                      )}
                    </li>
                  )
                })}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </section>
  )
}
