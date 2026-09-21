# `@scales/web`

L’application. Elle assemble les trois sections, choisit la tonalité une fois
pour toutes les trois, et garde la progression dans le navigateur.

```bash
yarn dev      # depuis la racine du dépôt
```

---

## Structure

```
src/
  App.tsx                    coquille : progression, tonalité, onglets
  sections/
    ExercisesSection.tsx     écrire la gamme sur la portée
    PlaySection.tsx          jouer librement au clavier
    EarSection.tsx           reconnaître à l'oreille + calibrage
    LexiconSection.tsx       le lexique, avec écoute des intervalles
  storage.ts                 accès défensif au localStorage
  usePersistentState.ts      useState sauvegardé sous une clé stable
  app.css                    thème, mise en page, clair et sombre
```

La tonalité vit dans `App` : passer d’une section à l’autre ne la change pas.
C’est ce qui fait tenir la promesse « une gamme, trois portes » plutôt que
trois exercices indépendants.

## La fenêtre est le cadre

`.app` occupe `100dvh` et ne défile pas. Navbar et barre de contexte sont des
éléments `flex: none` de cette colonne : elles restent en haut sans
`position: fixed`, et sans le décalage de contenu qu’il impose.

Chaque section est elle-même une colonne — en-tête, aide, **scène**, résultat,
actions — dont seule la scène porte `flex: 1`. C’est elle qui absorbe la
hauteur disponible, et la portée comme le clavier s’y adaptent au lieu de
pousser le reste hors de l’écran.

Le Lexique est la seule exception : `.app__main` y devient défilant.

**Jouer et Oreille encadrent leur clavier de la même façon** — une scène
centrée au-dessus, un bandeau de même hauteur en dessous : le rappel de note
d'un côté, la consigne et les boutons de l'autre. Le clavier occupe ainsi la
même position sur les deux pages et ne saute pas quand on change d'onglet.

## Ce qui est persisté

Sous le préfixe `scales.v1.` : la section ouverte, la progression choisie, la
tonalité en cours, le mode d’oreille, le verdict du calibrage et la liste des
gammes écrites sans faute. Un rafraîchissement rouvre donc la page sur ce qu’on
était en train de travailler.

Toutes les lectures sont défensives — le stockage peut être désactivé, plein,
ou contenir des données d’une version antérieure. Une valeur illisible retombe
sur la valeur par défaut au lieu de casser l’application.

La relecture ne suffit pas : les valeurs sont aussi **validées**. Un onglet
inconnu afficherait une section vide, et une progression inconnue ferait
planter la lecture de ses tonalités — l’une comme l’autre retombent sur leur
valeur par défaut.

## Points d’attention

**Changer de tonalité remet l’exercice à zéro.** La réponse attendue n’est plus
la même ; garder les notes posées donnerait une correction absurde.

**Le clavier reste jouable hors exercice.** Dans la section Oreille, appuyer
sur une touche avant d’avoir commencé joue la note sans être compté. Griser le
clavier donnait l’impression qu’il était cassé.

**Un seul `AudioContext`** pour toute l’application, exposé par `@scales/audio`
comme un singleton. Chaque section le déverrouille avant de jouer, ce qui rend
l’ordre des interactions indifférent.
