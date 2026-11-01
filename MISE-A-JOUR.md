# Mettre à jour votre dépôt GitHub existant

Cette archive remplace la version précédente. Aucun nouveau dépôt ni abonnement n’est nécessaire.

1. Décompresser le ZIP. Sur Mac, afficher les fichiers cachés avec **⌘ + Maj + point** pour voir `.github`.
2. Ouvrir votre dépôt GitHub existant → **Add file → Upload files**. Téléverser à la RACINE le contenu de ce dossier : `dist`, `scripts`, `.github`, les fichiers Markdown et `WORKFLOW-A-COPIER.txt`. Les fichiers de même chemin remplacent les anciens après le commit. Ne pas téléverser le ZIP ni un dossier parent autour de dist.
3. Vérifier surtout la présence des nouveaux fichiers `dist/provenance.mjs` et `scripts/test-updater.mjs`. Remplacer aussi `dist/engine.mjs`, `dist/app.js`, `dist/index.html`, `dist/style.css`, `dist/sw.js`, `scripts/update-rates.mjs`, `scripts/test.mjs`, `scripts/check-package.mjs` et `.github/workflows/pages.yml`.
4. Si `.github` est refusé ou invisible : ouvrir `.github/workflows/pages.yml` directement sur GitHub → crayon Modifier → remplacer tout le texte par `WORKFLOW-A-COPIER.txt`, puis Commit changes. S’il n’existe pas : Add file → Create new file → nom exact `.github/workflows/pages.yml`.
5. Vérifier **Settings → Pages → Source : GitHub Actions**. Conserver l’URL existante.
6. **Actions → Actualiser les taux et publier → Run workflow**, sélectionner la branche par défaut et lancer. Le commit doit déjà être présent sur cette branche. Attendre la coche verte des tests et de la publication.
7. Ouvrir l’URL habituelle dans Safari, puis recharger. Le service worker a un nouveau nom de cache. Si l’ancienne interface persiste, fermer l’app d’écran d’accueil, ouvrir/recharger dans Safari puis rouvrir. Les paramètres gardent leur clé de stockage; la mise à jour ne les efface pas.

## Tester votre exemple dans l’app

- Montant : `100`; devise : `EUR`; catégorie : `Autres achats`.
- Ouvrir **Taux et devis manuels**, section BNC World Elite Mastercard.
- Taux : `1,6052525`.
- Date à la source : `2026-10-30`; heure facultative.
- Provenance : **Calculateur officiel (recopié par moi)**.
- Le taux saisi est : **Frais bancaires inclus**.
- Frais déjà inclus : `2,5`.
- Dans Paramètres : frais FX BNC `2,5 %`, exemption désactivée.
- **Appliquer et comparer** : colonne **Total avant avantages = 160,53 CAD**. La colonne Coût net est inférieure après récompenses et délai; elle ne doit pas être comparée directement au total brut du calculateur.

Alternative : saisir `1,5661` et choisir **Sans frais bancaires**, avec 2,5 % dans Paramètres. Le total affiché doit être identique.

Même saisie possible pour RBC/Visa. Un taux Mastercard ne doit pas être recopié pour Visa comme s’il s’agissait d’un taux Visa : obtenir séparément le taux de chaque calculateur.

Les saisies restent manuelles, limitées à la comparaison courante et effacées au changement de montant/devise. Une date historique est acceptée et reste affichée; elle n’est jamais présentée comme une donnée actuelle.

## iPhone et iPad

L’URL GitHub Pages et l’icône existante restent utilisables. Pour une nouvelle installation : ouvrir l’URL dans Safari → Partager → Sur l’écran d’accueil → Ajouter. L’archive conserve l’icône Apple et le manifeste, avec chemins relatifs compatibles avec le sous-dossier du dépôt.

Pour les résultats de recherche, l’authentification, les coûts et les calculs, voir **FIABILITE-DES-TAUX.md**. Pour l’installation initiale, voir **INSTALLATION.md**.
