import { useEffect, useMemo, useState } from 'react'
import {
  PROGRESSIONS,
  PROGRESSION_LIST,
  noteName,
  type CalibrationVerdict,
  type EarMode,
  type ProgressionId,
} from '@scales/music-theory'
import { notePlayer, type AudioEngine } from '@scales/audio'
import '@scales/ui/styles.css'
import './app.css'
import { ExercisesSection } from './sections/ExercisesSection'
import { PlaySection } from './sections/PlaySection'
import { EarSection } from './sections/EarSection'
import { LexiconSection } from './sections/LexiconSection'
import { usePersistentState } from './usePersistentState'

type Tab = 'exercises' | 'play' | 'ear' | 'lexicon'

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'exercises', label: 'Exercices', hint: 'Écrire la gamme sur la portée' },
  { id: 'play', label: 'Jouer', hint: 'Le clavier sous les doigts' },
  { id: 'ear', label: 'Oreille', hint: 'Reconnaître les notes' },
  { id: 'lexicon', label: 'Lexique', hint: 'Les mots du solfège' },
]

export function App() {
  const [progressionId, setProgressionId] = usePersistentState<ProgressionId>(
    'progression',
    'fifths',
  )
  const [keyId, setKeyId] = usePersistentState<string>('key', 'C')
  const [storedTab, setTab] = usePersistentState<Tab>('tab', 'exercises')
  const [earMode, setEarMode] = usePersistentState<EarMode>('earMode', 'relative')
  const [verdict, setVerdict] = usePersistentState<CalibrationVerdict | null>('verdict', null)
  const [solved, setSolved] = usePersistentState<string[]>('solved', [])
  const [engine, setEngine] = useState<AudioEngine>(notePlayer.engine)

  useEffect(() => notePlayer.onEngineChange(setEngine), [])

  /**
   * Les valeurs relues du stockage sont validées avant usage. Elles peuvent
   * venir d'une version antérieure de l'application, ou avoir été modifiées à
   * la main : un onglet inconnu afficherait une section vide, et une
   * progression inconnue ferait planter la lecture de ses tonalités.
   */
  const tab: Tab = TABS.some((item) => item.id === storedTab) ? storedTab : 'exercises'
  const progression = PROGRESSIONS[progressionId] ?? PROGRESSIONS.fifths

  // Les deux progressions n'emploient pas les mêmes orthographes de tonique :
  // fa♯ existe côté quintes, sol♭ côté degrés. On retombe sur do si besoin.
  const scaleKey = useMemo(() => {
    return progression.keys.find((key) => key.id === keyId) ?? progression.keys[0]!
  }, [keyId, progression])

  useEffect(() => {
    if (scaleKey.id !== keyId) setKeyId(scaleKey.id)
  }, [keyId, scaleKey.id, setKeyId])

  const markSolved = (id: string) => {
    setSolved((previous) => (previous.includes(id) ? previous : [...previous, id]))
  }

  return (
    <div className="app">
      <header className="app__header">
        <div className="app__brand">
          <h1>Gammes</h1>
          <p>Écrire, jouer, reconnaître — une gamme, trois portes d’entrée.</p>
        </div>

        <div className="app__progression">
          <span className="label">Progression</span>
          <div className="toolbar__group" role="group" aria-label="Progression">
            {PROGRESSION_LIST.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`chip${progressionId === item.id ? ' chip--active' : ''}`}
                onClick={() => setProgressionId(item.id)}
                aria-pressed={progressionId === item.id}
                title={item.description}
              >
                {item.label}
              </button>
            ))}
          </div>
          <p className="app__progression-note">{progression.description}</p>
        </div>
      </header>

      <nav className="keys" aria-label="Tonalité">
        {progression.keys.map((key) => (
          <button
            key={key.id}
            type="button"
            className={`key-chip${key.id === scaleKey.id ? ' key-chip--active' : ''}${
              solved.includes(key.id) ? ' key-chip--solved' : ''
            }`}
            onClick={() => setKeyId(key.id)}
            aria-current={key.id === scaleKey.id}
          >
            <span className="key-chip__name">{noteName({ ...key.tonic, octave: 0 })}</span>
            <span className="key-chip__signature">
              {key.accidentalCount === 0
                ? '—'
                : `${key.accidentalCount} ${key.accidentalKind === 'sharp' ? '♯' : '♭'}`}
            </span>
          </button>
        ))}
      </nav>

      <nav className="tabs" aria-label="Sections">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab${tab === item.id ? ' tab--active' : ''}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id}
          >
            <span className="tab__label">{item.label}</span>
            <span className="tab__hint">{item.hint}</span>
          </button>
        ))}
      </nav>

      <main className="app__main">
        {tab === 'exercises' ? (
          <ExercisesSection scaleKey={scaleKey} onSolved={markSolved} />
        ) : null}
        {tab === 'play' ? <PlaySection scaleKey={scaleKey} /> : null}
        {tab === 'ear' ? (
          <EarSection
            scaleKey={scaleKey}
            mode={earMode}
            onModeChange={setEarMode}
            verdict={verdict}
            onVerdict={setVerdict}
          />
        ) : null}
        {tab === 'lexicon' ? <LexiconSection scaleKey={scaleKey} /> : null}
      </main>

      <footer className="app__footer">
        <span>
          {engine === 'sampled'
            ? 'Piano échantillonné'
            : engine === 'synth'
              ? 'Synthétiseur de repli — les échantillons n’ont pas pu être chargés'
              : 'Audio en attente d’une première interaction'}
        </span>
        <span>
          {solved.length} gamme{solved.length > 1 ? 's' : ''} écrite
          {solved.length > 1 ? 's' : ''} sans faute sur {progression.keys.length}
        </span>
      </footer>
    </div>
  )
}
