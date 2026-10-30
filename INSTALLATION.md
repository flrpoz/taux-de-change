# Publier Carte Claire sur GitHub Pages

## 1. Décompresser et afficher les fichiers cachés

Sur Mac, dans le Finder, ouvrir le dossier décompressé puis appuyer sur **Commande + Maj + point (⌘⇧.)**. Le dossier `.github` devient visible.

Le ZIP contient réellement `.github/workflows/pages.yml`. Un dossier commençant par un point est caché par défaut; ce n’est pas un fichier manquant.

## 2. Téléverser à la racine du dépôt

Sur GitHub : ouvrir le dépôt → **Add file → Upload files**.
Téléverser le CONTENU du dossier décompressé, et non le dossier parent :

```
.github/
  workflows/
    pages.yml
dist/
scripts/
README.md
INSTALLATION.md
WORKFLOW-A-COPIER.txt
```

À la racine du dépôt, `dist/index.html` et `scripts/test.mjs` doivent être visibles à ces chemins exacts. Ne pas téléverser le ZIP lui-même; GitHub ne le décompresse pas automatiquement. Ne pas placer `dist` dans un sous-dossier `carte-claire-github-pages-complet`.

**Si GitHub refuse le dossier caché `.github` :**
1. Téléverser `dist`, `scripts` et les fichiers visibles normalement, puis valider le commit.
2. **Add file → Create new file**.
3. Dans le nom, saisir exactement `.github/workflows/pages.yml` (les barres obliques créent les dossiers).
4. Ouvrir localement `WORKFLOW-A-COPIER.txt`, copier tout son texte et le coller dans l’éditeur GitHub.
5. Valider avec **Commit changes** sur la branche par défaut.

`WORKFLOW-A-COPIER.txt` est une copie de secours, pas un workflow actif. Seul `.github/workflows/pages.yml` doit exécuter le déploiement.

## 3. Activer GitHub Pages

Dépôt → **Settings → Pages → Build and deployment → Source → GitHub Actions**.
Si Actions est désactivé : Settings → Actions → General → autoriser les actions utilisées. Les permissions nécessaires sont déclarées dans le workflow; aucun token personnel ni secret à créer.

## 4. Lancer manuellement

Dépôt → **Actions → Actualiser les taux et publier → Run workflow**.
Choisir la **branche par défaut** du dépôt (habituellement `main`) puis cliquer **Run workflow**.

Le fichier workflow doit exister sur la branche par défaut pour que le bouton manuel soit disponible. Un lancement sur une autre branche sera ignoré volontairement.

Les étapes testent les calculs, actualisent les taux accessibles, vérifient les fichiers, puis publient **uniquement le contenu de `dist`**. La page d’accueil est donc à l’URL Pages, sans ajouter `/dist/`.

Attendre la coche verte. L’URL apparaît dans l’étape de déploiement et dans Settings → Pages. Une éventuelle règle de protection de l’environnement `github-pages` peut demander une approbation dans GitHub.

Un premier échec « Pages not found » ou « Get Pages site failed » signifie généralement qu’il faut sélectionner Source → GitHub Actions puis relancer le workflow.

## 5. iPhone et iPad

Ouvrir l’URL publique GitHub Pages dans **Safari** → **Partager** → **Sur l’écran d’accueil** → **Ajouter**. Si Safari propose « Ouvrir comme app web », l’activer.

Le paquet contient une icône Apple PNG 180 × 180, les icônes PNG 192/512 et un manifeste avec chemins relatifs pour fonctionner à `https://votre-compte.github.io/votre-depot/`.

Les réglages sont propres au navigateur/appareil; l’app ajoutée à l’écran d’accueil peut avoir son propre stockage. Il peut être nécessaire d’y enregistrer les paramètres une première fois. Wise utilise par défaut l’hypothèse de frais de **0,75 %**, modifiable.

## Actualisation et fiabilité

Le workflow se lance sur chaque modification de la branche par défaut, manuellement, et environ toutes les six heures. Les horaires GitHub peuvent être retardés. GitHub peut désactiver les workflows planifiés d’un dépôt public après 60 jours sans activité; les réactiver dans Actions si nécessaire.

Les nouveaux instantanés sont inclus dans le site déployé, pas commités dans le dépôt. Si une source ne répond pas, le script conserve l’instantané présent dans le dépôt et sa date réelle; cela peut être plus ancien que la dernière publication réussie. Vérifier les dates affichées.

Visa et Mastercard restent simulés à partir d’une référence identifiée comme estimée, sauf saisie manuelle. Wise utilise son taux indicatif accessible et les frais de 0,75 % demandés, sauf remplacement manuel par un devis. Aucun frais réel Wise n’est prétendu récupéré automatiquement.

## Vérifications effectuées

- Présence du workflow et de tous les fichiers après extraction du nouveau ZIP.
- Tests de calcul et validation du paquet exécutés localement.
- Configuration de publication conforme au modèle GitHub Pages : permissions, environnement, artefact de `dist`, déploiement et déclenchement manuel.

Le workflow n’a pas été exécuté sur votre dépôt : son URL et l’accès ne sont pas fournis dans cette conversation. La coche verte dans votre dépôt confirmera le déploiement réel.

Références officielles :
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
