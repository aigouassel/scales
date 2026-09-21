import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEGREE_NAMES,
  diatonicIndex,
  judgeWrittenNote,
  majorScale,
  noteName,
  pitch,
  type Alteration,
  type Letter,
  type Pitch,
  type ScaleKey,
  type WrittenNoteVerdict,
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

/** « degré » est masculin : le premier s'abrège 1er, pas 1re. */
const ORDINAL = (index: number) => (index === 0 ? '1er' : `${index + 1}e`)

/** Une note à revoir : mal orthographiée, fausse, ou absente. */
interface Issue {
  index: number
  verdict: Exclude<WrittenNoteVerdict, { kind: 'correct' }> | null
}

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
    setVerdicts(null)
    setHintShown(false)
    setAlteration(0)
  }, [scaleKey])

  const place = useCallback(
    (index: number, letter: Letter, octave: number) => {
      setStatuses(null)
      setVerdicts(null)
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
    setVerdicts(null)
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

  const [verdicts, setVerdicts] = useState<(WrittenNoteVerdict | null)[] | null>(null)

  const check = () => {
    const judged = slots.map((note, index) =>
      note === null ? null : judgeWrittenNote(expected, index, note),
    )
    setVerdicts(judged)
    setStatuses(judged.map((verdict) => (verdict === null ? 'wrong' : verdict.kind)))

    if (judged.every((verdict) => verdict?.kind === 'correct')) {
      onSolved(scaleKey.id)
      void notePlayer.playSequence(expected, { interval: 0.32 })
    }
  }

  const listen = (notes: readonly (Pitch | null)[]) => {
    const playable = notes.filter((note): note is Pitch => note !== null)
    if (playable.length === 0) return
    void notePlayer.playSequence(playable, { interval: 0.42 })
  }

  const solved = verdicts !== null && verdicts.every((verdict) => verdict?.kind === 'correct')

  /**
   * Toutes les notes sonnent juste, mais au moins une est mal orthographiée.
   * C'est le cas que l'oreille ne peut pas rattraper — il mérite son propre
   * message, et son propre ton : ce n'est pas une erreur de solfège, c'est une
   * erreur de grammaire.
   */
  const spellingOnly =
    verdicts !== null &&
    !solved &&
    verdicts.every((verdict) => verdict !== null && verdict.kind !== 'wrong')

  const showCorrection = verdicts !== null && !solved

  /** Les écarts, en une ligne compacte plutôt qu'en liste : la place est comptée. */
  const issues: Issue[] = (verdicts ?? []).flatMap((verdict, index) => {
    if (verdict !== null && verdict.kind === 'correct') return []
    return [{ index, verdict }]
  })

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

      {verdicts !== null ? (
        <p
          className={`result ${
            solved ? 'result--success' : spellingOnly ? 'result--enharmonic' : 'result--error'
          }`}
        >
          {solved ? (
            <>
              <strong>Juste.</strong> {expected.map((note) => noteName(note)).join(' ')}
            </>
          ) : (
            <>
              <strong>
                {spellingOnly
                  ? 'Juste à l’oreille, fautif à l’écriture.'
                  : `${issues.length} note${issues.length > 1 ? 's' : ''} à revoir.`}
              </strong>{' '}
              {issues.map(({ index, verdict }) => (
                <span key={index} className="result__item">
                  <span className="result__degree" title={DEGREE_NAMES[index] ?? 'octave'}>
                    {ORDINAL(index)}
                  </span>
                  {verdict === null ? (
                    <span className="result__written">non posée</span>
                  ) : verdict.kind === 'enharmonic' ? (
                    <>
                      <span className="result__enharmonic">{noteName(verdict.written)}</span>
                      <span className="result__arrow" aria-hidden="true">
                        →
                      </span>
                      <strong>{noteName(verdict.expected)}</strong>
                      <span className="result__why">
                        {verdict.clashingDegree === null
                          ? '(lettre étrangère à la gamme)'
                          : `(la lettre ${noteName({ ...verdict.written, alteration: 0 })} est celle du ${
                              verdict.clashingDegree
                            }${verdict.clashingDegree === 1 ? 'er' : 'e'} degré)`}
                      </span>
                    </>
                  ) : (
                    <>
                      <strong>{noteName(verdict.expected)}</strong>
                      <span className="result__written">
                        vous : {noteName(verdict.written)}
                      </span>
                    </>
                  )}
                </span>
              ))}
            </>
          )}
        </p>
      ) : null}

      {spellingOnly ? (
        <p className="hint">
          Chaque degré porte sa propre lettre, et chaque lettre ne sert qu’une fois. Une note
          enharmonique sort la même touche du piano mais réutilise une lettre déjà prise :
          l’oreille ne peut pas l’entendre, seule la lecture la révèle.
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
