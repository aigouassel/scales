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
  const [statuses, setStatuses] = useState<SlotStatus[] | null>(null)
  const [hintShown, setHintShown] = useState(false)

  // Changer de tonalité remet l'exercice à zéro : la réponse n'est plus la même.
  useEffect(() => {
    setSlots(EMPTY)
    setSelected(0)
    setStatuses(null)
    setVerdicts(null)
    setHintShown(false)
  }, [scaleKey])

  /**
   * Un clic pose toujours une note naturelle ; l'altération se règle ensuite
   * aux flèches verticales.
   *
   * Une palette d'altération jouait auparavant ce rôle, mais elle imposait de
   * décider avant d'écrire — et, quand elle agissait aussi sur la sélection,
   * régler le bémol de la note SUIVANTE altérait silencieusement la
   * précédente. Poser puis ajuster supprime la question de l'ordre.
   *
   * L'écriture est MUETTE, et c'est délibéré. Entendre chaque note en la
   * posant transforme l'exercice : on cesse de dériver la gamme de ses règles
   * pour la chercher à l'oreille, ce que la page « Oreille » fait déjà et
   * mieux. Pire, le son ne peut pas trancher ce que cette page enseigne — do♯
   * et ré♭ sortent la même touche, et c'est justement là qu'on se trompe.
   *
   * On entend sa gamme quand on le demande : « Écouter ma gamme », ou la
   * lecture qui récompense une réponse juste.
   *
   * `unlock()` reste appelé, sans jouer quoi que ce soit. Les navigateurs
   * exigent un geste utilisateur pour démarrer l'audio, et le chargement des
   * échantillons de piano prend quelques secondes : profiter du premier clic
   * pour l'amorcer évite que la récompense d'une gamme juste arrive en retard.
   * Déverrouiller ne produit aucun son.
   */
  const place = useCallback((index: number, letter: Letter, octave: number) => {
    setStatuses(null)
    setVerdicts(null)
    const note = pitch(letter, 0, octave)
    setSlots((previous) => {
      const next = [...previous]
      next[index] = note
      return next
    })
    void notePlayer.unlock()
  }, [])

  /**
   * Les flèches verticales altèrent la note sélectionnée, d'un demi-ton à
   * chaque pression, entre bémol et dièse. Elles n'agissent que sur une note
   * existante : sur un emplacement vide, il n'y a rien à altérer.
   *
   * Muettes elles aussi — et ici l'argument est plus fort encore : le son ne
   * distingue pas un dièse d'un bémol enharmonique. Il ne dirait donc rien de
   * ce qu'on est en train de décider.
   */
  const adjustAlteration = useCallback(
    (delta: number) => {
      const clamp = (value: number): Alteration =>
        Math.max(-1, Math.min(1, value)) as Alteration

      const current = selected === null ? null : (slots[selected] ?? null)
      if (selected === null || current === null) return

      const next = clamp(current.alteration + delta)
      if (next === current.alteration) return

      const updated = pitch(current.letter, next, current.octave)
      setStatuses(null)
      setVerdicts(null)
      setSlots((previous) => {
        const copy = [...previous]
        copy[selected] = updated
        return copy
      })
    },
    [selected, slots],
  )

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
        event.preventDefault()
        setSelected((previous) => Math.min((previous ?? -1) + 1, slots.length - 1))
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSelected((previous) => Math.max((previous ?? 1) - 1, 0))
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        adjustAlteration(1)
      } else if (event.key === 'ArrowDown') {
        event.preventDefault()
        adjustAlteration(-1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adjustAlteration, clearSelected, slots.length])

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
      </header>

      <p className="hint">
        Cliquez sur la portée pour poser une note, puis <kbd>↑</kbd> <kbd>↓</kbd> pour
        l’altérer d’un demi-ton. <kbd>←</kbd> <kbd>→</kbd> déplacent la sélection,{' '}
        <kbd>Suppr</kbd> efface. L’écriture est muette : ici on déduit la gamme, on ne la
        cherche pas à l’oreille.
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
