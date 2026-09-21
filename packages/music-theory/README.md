# `@scales/music-theory`

Le noyau musical : TypeScript pur, **zéro dépendance**, aucune connaissance de
React, du DOM ou de l’audio.

C’est la couche domaine du projet. Les trois sections de l’application
interrogent ces mêmes fonctions — c’est ce qui rend impossible qu’un exercice
accepte fa♯ là où un autre attend sol♭.

```bash
yarn test          # 64 tests, sans navigateur
```

---

## `pitch.ts` — la représentation d’une note

```ts
interface Pitch {
  letter: 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B'
  alteration: -2 | -1 | 0 | 1 | 2
  octave: number          // scientifique : do4 = do central = MIDI 60
}
```

**Une note n’est pas un numéro MIDI.** Le MIDI 61 désigne aussi bien do♯ que
ré♭ ; en ré majeur, écrire ré♭ est une faute d’orthographe, pas une variante.
On conserve donc lettre, altération et octave séparément, et le MIDI n’apparaît
qu’au moment de produire un son.

Deux comparaisons distinctes en découlent, et le choix entre elles est toujours
significatif :

| Fonction | Compare | Employée pour |
| --- | --- | --- |
| `isSamePitch` | l’**écriture** — do♯ ≠ ré♭ | corriger une gamme écrite |
| `isSamePitchClass` | le **son**, octave comprise | corriger une réponse jouée au clavier |

L’`diatonicIndex` compte les lettres en ignorant les altérations : c’est la
coordonnée verticale d’une note sur la portée, do♯4 et do♭4 s’écrivant sur la
même ligne.

Autres conversions : `toMidi`, `toFrequency` (la3 = 440 Hz), `noteName` et
`fullNoteName` en français, `toVexflowKey` / `toVexflowAccidental` pour la
gravure.

## `scales.ts` — la génération

`majorScale(tonic)` rend les huit notes d’une gamme majeure. Aucune n’est
écrite en dur : elles sont déduites de deux règles.

1. Le motif **ton · ton · ½ · ton · ton · ton · ½** fixe le *son* de chaque
   degré.
2. **Une lettre par degré** fixe son *écriture*.

En ré, la règle 1 impose un son à 4 demi-tons de la tonique pour le 3ᵉ degré ;
la règle 2 impose la lettre fa. Il ne reste que fa♯ — sol♭ sonnerait pareil
mais réutiliserait la lettre sol.

```ts
majorScale(pitch('D', 0, 4)).map(noteName)
// ['ré', 'mi', 'fa♯', 'sol', 'la', 'si', 'do♯', 'ré']
```

`buildScale(tonic, pattern)` applique les deux règles à n’importe quel motif
d’intervalles ; `majorScale` et `naturalMinorScale` n’en sont que deux
spécialisations. Le mineur naturel ne sert pas à l’apprentissage — l’application
n’enseigne que le majeur — mais au lexique, pour faire *entendre* ce que le mot
désigne.

`describeKey(tonic)` en déduit le nom, le nombre d’altérations et leur sens.
`isTheoreticalKey(tonic)` signale les tonalités qui exigeraient une double
altération — sol♯ majeur s’écrit correctement, mais avec un fa double dièse que
personne n’emploie. On ne les interdit pas, on les écarte de l’apprentissage.

`degreeOf(scale, note)` situe une note dans la gamme **orthographe comprise** :
en ré majeur, sol♭ n’est pas le 3ᵉ degré, même s’il sonne comme fa♯.

## `progressions.ts` — les deux ordres d’apprentissage

`PROGRESSIONS.degrees` suit do, ré, mi, fa… — intuitif, mais la difficulté
saute. `PROGRESSIONS.fifths` suit le cycle des quintes : chaque gamme ajoute
exactement une altération à la précédente.

Les deux couvrent les 12 classes de hauteur, mais pas toujours avec la même
orthographe : sol♭ se lit naturellement entre fa et sol dans l’ordre des
degrés, alors que le cycle des quintes atteint fa♯ par le côté des dièses.

## `ear.ts` — le tirage des exercices d’oreille

`drawTrainingQuestion(mode, tonic, octave, rng?)` rend une note cible et,
en mode relatif, la tonique à jouer comme référence. Le premier degré est exclu
du tirage relatif : il vient d’être joué, le reconnaître ne demanderait aucun
effort.

`buildCalibration(rng?)` construit le test de dix notes. Il impose au moins une
quarte entre deux notes consécutives et les disperse sur trois octaves — sans
cet écart, on répondrait en comparant à la note précédente encore en mémoire,
c’est-à-dire à l’oreille relative, précisément ce que le test doit exclure.

`calibrationVerdict(score)` interprète le résultat : ≥ 8 ne s’obtient pas par
chance (le hasard donne environ 1 sur 12), ≤ 3 y est compatible, entre les deux
on ne conclut pas.

Le paramètre `rng` rend tout le module déterministe sous test.

---

## Pourquoi générer plutôt que lister

Une table des 12 gammes écrite à la main aurait été plus courte. Mais le code
ne contiendrait alors aucune théorie, et une coquille y serait invisible : rien
ne distingue `['ré','mi','fa♯',…]` de la même liste avec une faute. Les tests
vérifient ici des **invariants** — sept lettres distinctes, le motif
d’intervalles exact, aucune double altération — et non une liste recopiée.
