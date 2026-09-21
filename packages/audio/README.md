# `@scales/audio`

La lecture des notes. Deux moteurs derrière une seule interface — le reste de
l’application ne sait pas lequel joue.

```ts
import { notePlayer } from '@scales/audio'

await notePlayer.unlock()                 // depuis un geste utilisateur
notePlayer.play(pitch('F', 1, 4))
await notePlayer.playSequence(scale, { interval: 0.4 })
```

---

## Deux moteurs, un repli

| Moteur | Source | Quand |
| --- | --- | --- |
| `sampled` | `SplendidGrandPiano` de [smplr](https://github.com/danigb/smplr) | par défaut |
| `synth` | oscillateurs Web Audio, dans `synth.ts` | si les échantillons ne se chargent pas |

Les échantillons se téléchargent depuis un CDN. Hors ligne, ou si la requête
échoue, le synthétiseur prend le relais : **un exercice d’oreille sans son
n’est pas un exercice**. `onEngineChange()` permet à l’interface d’annoncer
lequel des deux tourne, pour que la différence de timbre ne passe pas pour un
défaut.

Le synthétiseur est additif — quatre harmoniques d’amplitude décroissante, une
enveloppe percussive, un passe-bas qui suit la fondamentale. Il ne sonne pas
comme un piano, mais il donne une hauteur juste et une attaque reconnaissable.

## Le déverrouillage

`unlock()` doit être appelé **depuis un geste utilisateur** : les navigateurs
refusent de démarrer un `AudioContext` autrement. La méthode est idempotente et
ne charge les échantillons qu’une fois ; tous les points d’entrée de
l’application l’appellent avant de jouer, ce qui rend l’ordre des interactions
indifférent.

## Les séquences

`playSequence()` programme toutes les notes d’un coup sur l’horloge audio,
plutôt que de les déclencher au `setTimeout` : c’est ce qui garantit un tempo
régulier, la boucle d’événements du navigateur n’étant pas assez précise pour
de la musique.

Un jeton interne interrompt la séquence en cours quand une nouvelle démarre —
deux gammes ne peuvent pas se superposer.

## Pourquoi pas ffmpeg

ffmpeg traite des fichiers audio et vidéo hors temps réel. Jouer une note quand
une touche est enfoncée relève de la Web Audio API, dans le navigateur, avec
une latence de quelques millisecondes.
