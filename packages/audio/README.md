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
n’est pas un exercice**. `onEngineChange()` permet à une interface de savoir
lequel des deux tourne ; l’application ne l’affiche pas — un bandeau permanent
sur l’état de l’audio disait « en veille » la plupart du temps — mais l’API
reste là pour signaler le repli au moment où il se produit.

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

## Le masque

`playMask()` joue six demi-tons contigus, ensemble, pendant deux secondes.

Dans un exercice d’oreille absolue, deux sons restent disponibles en mémoire et
servent de diapason : la note précédente, et surtout **celle qu’on vient de
jouer pour répondre** — dont on connaît le nom, puisqu’on l’a choisie. Ni le
tirage ni l’espacement ne peuvent les effacer : ils sont dans l’auditeur, pas
dans la séquence.

Un agrégat chromatique sature ces traces. Il n’a ni fondamentale ni centre
tonal, il ne laisse donc aucun repère derrière lui. Placé avant chaque question,
il efface les deux d’un coup.

La durée compte : un masque court laisse la trace intacte, la mémoire échoïque
tenant plus d’une seconde.

C’est le procédé standard des protocoles de psychoacoustique. Il est
désagréable à entendre, et c’est exactement à ça qu’on le reconnaît.

## Pourquoi pas ffmpeg

ffmpeg traite des fichiers audio et vidéo hors temps réel. Jouer une note quand
une touche est enfoncée relève de la Web Audio API, dans le navigateur, avec
une latence de quelques millisecondes.
