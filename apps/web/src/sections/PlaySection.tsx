import { useEffect, useMemo, useState } from 'react'
import {
  DEGREE_NAMES,
  degreeOf,
  fullNoteName,
  majorScale,
  noteName,
  type Pitch,
  type ScaleKey,
} from '@scales/music-theory'
import { notePlayer } from '@scales/audio'
import { Piano } from '@scales/ui'

export interface PlaySectionProps {
  scaleKey: ScaleKey
}

export function PlaySection({ scaleKey }: PlaySectionProps) {
  const scale = useMemo(() => majorScale({ ...scaleKey.tonic, octave: 4 }), [scaleKey])
  const preferFlats = scaleKey.accidentalKind === 'flat'

  const [lastNote, setLastNote] = useState<Pitch | null>(null)
  const [showNoteNames, setShowNoteNames] = useState(true)

  useEffect(() => setLastNote(null), [scaleKey])

  const degree = lastNote === null ? null : degreeOf(scale, lastNote)

  return (
    <section className="section">
      <header className="bar">
        <h2>Jouer</h2>
        <span className="bar__meta">
          {scaleKey.name} — {scale.map((note) => noteName(note)).join(' ')}
        </span>
        <div className="bar__spacer" />
        <button
          type="button"
          className="button button--primary"
          onClick={() => void notePlayer.playSequence(scale, { interval: 0.38 })}
        >
          Écouter
        </button>
        <button
          type="button"
          className="button"
          onClick={() => void notePlayer.playSequence([...scale].reverse(), { interval: 0.38 })}
        >
          En descendant
        </button>
        <button
          type="button"
          className="button"
          onClick={() =>
            void notePlayer.playSequence([...scale, ...[...scale].reverse().slice(1)], {
              interval: 0.3,
            })
          }
        >
          Aller-retour
        </button>
        <label className="switch">
          <input
            type="checkbox"
            checked={showNoteNames}
            onChange={(event) => setShowNoteNames(event.target.checked)}
          />
          Noms des notes
        </label>
      </header>

      <p className="hint">
        Les touches <kbd>q</kbd> à <kbd>l</kbd> donnent les blanches, <kbd>z</kbd> à{' '}
        <kbd>o</kbd> les noires. Les deux touches inertes tombent là où le piano n’a pas de
        touche noire.
      </p>

      <div className="stage stage--center">
        <Piano
          preferFlats={preferFlats}
          highlighted={scale}
          showNoteNames={showNoteNames}
          onNote={setLastNote}
        />
      </div>

      <div className="readout">
        {lastNote === null ? (
          <p className="readout__idle">
            Jouez une note : son degré dans {scaleKey.name} s’affichera ici.
          </p>
        ) : (
          <p>
            <strong className="readout__note">{fullNoteName(lastNote)}</strong>
            {degree === null ? (
              <span className="readout__out">
                n’appartient pas à {scaleKey.name} — c’est une note étrangère à la gamme.
              </span>
            ) : (
              <span className="readout__in">
                {degree}
                <sup>{degree === 1 ? 'er' : 'e'}</sup> degré de {scaleKey.name} —{' '}
                {DEGREE_NAMES[degree - 1]}
              </span>
            )}
          </p>
        )}
      </div>
    </section>
  )
}
