/**
 * Lecture des notes.
 *
 * Deux moteurs derrière une seule interface : les échantillons de piano
 * (`smplr`), et le synthétiseur de repli si leur chargement échoue. Le reste
 * de l'application ne sait pas lequel joue.
 */

import { pitch, toFrequency, toMidi, type Pitch } from '@scales/music-theory'
import { playSynthNote, type SynthVoice } from './synth'

export type AudioEngine = 'loading' | 'sampled' | 'synth'

export interface PlayOptions {
  /** Durée en secondes. */
  duration?: number
  /** 0 à 1. */
  velocity?: number
  /** Décalage en secondes par rapport à maintenant. */
  delay?: number
}

export interface SequenceOptions extends PlayOptions {
  /** Intervalle entre deux attaques, en secondes. */
  interval?: number
}

const DEFAULT_DURATION = 1.2
const DEFAULT_VELOCITY = 0.8
const DEFAULT_INTERVAL = 0.5

type SmplrInstrument = {
  load: Promise<unknown>
  start(options: { note: number; velocity?: number; time?: number; duration?: number }): void
  stop(): void
}

export class NotePlayer {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private instrument: SmplrInstrument | null = null
  private voices: SynthVoice[] = []
  private engineState: AudioEngine = 'loading'
  private listeners = new Set<(engine: AudioEngine) => void>()
  private loading: Promise<void> | null = null
  /** Incrémenté à chaque interruption : les séquences en cours s'arrêtent. */
  private sequenceToken = 0

  get engine(): AudioEngine {
    return this.engineState
  }

  onEngineChange(listener: (engine: AudioEngine) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private setEngine(engine: AudioEngine): void {
    this.engineState = engine
    for (const listener of this.listeners) listener(engine)
  }

  /**
   * Prépare le contexte audio. Doit être appelé depuis un geste utilisateur :
   * les navigateurs refusent de démarrer l'audio autrement.
   */
  async unlock(): Promise<void> {
    if (this.context === null) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.context.destination)
    }

    if (this.context.state === 'suspended') {
      await this.context.resume()
    }

    this.loading ??= this.loadSamples()
    await this.loading
  }

  private async loadSamples(): Promise<void> {
    const context = this.context
    if (context === null) return

    try {
      const { SplendidGrandPiano } = await import('smplr')
      const instrument = new SplendidGrandPiano(context) as unknown as SmplrInstrument
      await instrument.load
      this.instrument = instrument
      this.setEngine('sampled')
    } catch {
      // Hors ligne, CDN injoignable, format refusé : on joue quand même.
      this.instrument = null
      this.setEngine('synth')
    }
  }

  play(note: Pitch, options: PlayOptions = {}): void {
    const context = this.context
    const master = this.master
    if (context === null || master === null) return

    const duration = options.duration ?? DEFAULT_DURATION
    const velocity = options.velocity ?? DEFAULT_VELOCITY
    const startAt = context.currentTime + (options.delay ?? 0)

    if (this.instrument !== null) {
      this.instrument.start({
        note: toMidi(note),
        velocity: Math.round(velocity * 127),
        time: startAt,
        duration,
      })
      return
    }

    this.voices.push(
      playSynthNote(context, master, toFrequency(note), startAt, duration, velocity),
    )
  }

  /**
   * Joue une suite de notes. La promesse se résout à la fin, ou plus tôt si
   * une autre lecture l'interrompt — l'appelant peut donc enchaîner sans
   * craindre que deux séquences se superposent.
   */
  async playSequence(notes: readonly Pitch[], options: SequenceOptions = {}): Promise<void> {
    await this.unlock()
    this.stopAll()

    const token = this.sequenceToken
    const interval = options.interval ?? DEFAULT_INTERVAL
    const duration = options.duration ?? interval * 1.6

    notes.forEach((note, index) => {
      this.play(note, { ...options, duration, delay: index * interval })
    })

    await new Promise<void>((resolve) => {
      const totalMs = (notes.length - 1) * interval * 1000 + duration * 1000
      window.setTimeout(() => resolve(), Math.max(totalMs, 0))
    })

    if (token !== this.sequenceToken) return
  }

  /**
   * Joue un agrégat chromatique bref : un « masque ».
   *
   * Entre deux notes d'un test d'oreille absolue, la note précédente reste
   * disponible en mémoire échoïque et sert de diapason — c'est la fuite que
   * ni le tirage ni l'espacement ne peuvent fermer. Six demi-tons contigus
   * joués ensemble saturent cette trace : l'agrégat n'a ni fondamentale ni
   * centre tonal, il ne laisse donc aucun repère derrière lui.
   *
   * Deux secondes par défaut. Un masque court laisse la trace intacte : il
   * faut qu'il dure assez pour que la note précédente cesse d'être disponible,
   * et la mémoire échoïque tient plus d'une seconde.
   *
   * C'est le procédé standard des protocoles de psychoacoustique. Il est
   * désagréable à entendre, et c'est exactement à ça qu'on le reconnaît.
   */
  playMask(options: { duration?: number; delay?: number } = {}): void {
    const duration = options.duration ?? 2
    const delay = options.delay ?? 0
    // Registre medium : assez haut pour masquer, assez bas pour rester supportable.
    const root = 55
    for (let step = 0; step < 6; step += 1) {
      const midi = root + step
      const octave = Math.floor(midi / 12) - 1
      const letters = ['C', 'C', 'D', 'D', 'E', 'F', 'F', 'G', 'G', 'A', 'A', 'B'] as const
      const alterations = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0] as const
      const index = midi % 12
      const letter = letters[index]
      const alteration = alterations[index]
      if (letter === undefined || alteration === undefined) continue
      this.play(pitch(letter, alteration, octave), {
        duration,
        velocity: 0.28,
        delay,
      })
    }
  }

  stopAll(): void {
    this.sequenceToken += 1
    const context = this.context
    if (context === null) return

    this.instrument?.stop()
    for (const voice of this.voices) voice.stop(context.currentTime)
    this.voices = []
  }
}

/** Un seul lecteur pour toute l'application : un AudioContext suffit. */
export const notePlayer = new NotePlayer()
