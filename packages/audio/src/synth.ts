/**
 * Synthétiseur de repli.
 *
 * Les échantillons de piano de `smplr` se téléchargent depuis un CDN. Si le
 * réseau manque, l'application doit rester utilisable : un exercice d'oreille
 * sans son n'est pas un exercice. Ce synthétiseur additif ne sonne pas comme
 * un piano, mais il donne une hauteur juste et une enveloppe percussive
 * reconnaissable — assez pour travailler.
 */

/** Amplitude relative des harmoniques : décroissance rapide, comme une corde frappée. */
const HARMONICS = [
  { multiple: 1, gain: 1 },
  { multiple: 2, gain: 0.32 },
  { multiple: 3, gain: 0.14 },
  { multiple: 4, gain: 0.06 },
]

export interface SynthVoice {
  stop(at: number): void
}

export function playSynthNote(
  context: AudioContext,
  destination: AudioNode,
  frequency: number,
  startAt: number,
  duration: number,
  velocity: number,
): SynthVoice {
  const envelope = context.createGain()
  envelope.gain.setValueAtTime(0, startAt)
  envelope.gain.linearRampToValueAtTime(velocity, startAt + 0.008)
  // Décroissance : une note de piano perd vite son attaque puis traîne.
  envelope.gain.exponentialRampToValueAtTime(velocity * 0.35, startAt + 0.25)
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration)

  // Adoucit les harmoniques hautes, qui sonnent métalliques sans filtre.
  const filter = context.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(Math.min(frequency * 6, 8000), startAt)
  filter.Q.value = 0.7

  envelope.connect(filter)
  filter.connect(destination)

  const oscillators = HARMONICS.map(({ multiple, gain }) => {
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(frequency * multiple, startAt)

    const partial = context.createGain()
    partial.gain.setValueAtTime(gain, startAt)

    oscillator.connect(partial)
    partial.connect(envelope)
    oscillator.start(startAt)
    oscillator.stop(startAt + duration + 0.1)
    return oscillator
  })

  return {
    stop(at: number) {
      envelope.gain.cancelScheduledValues(at)
      envelope.gain.setValueAtTime(Math.max(envelope.gain.value, 0.0001), at)
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + 0.08)
      for (const oscillator of oscillators) oscillator.stop(at + 0.12)
    },
  }
}
