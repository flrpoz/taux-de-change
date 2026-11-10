# Historique des comparaisons

Depuis le calculateur, lancer une comparaison, choisir un identifiant usager puis appuyer sur **Enregistrer les taux du jour**. L'aperçu affiche les taux exactement enregistrés, en **unités locales pour 1 CAD**. Le même sens est utilisé sous les cartes et dans l'historique.

Une seule ligne est conservée pour une date locale de comparaison et un usager, indépendamment de la devise. Une nouvelle sauvegarde demande confirmation pour remplacer les taux estimés/officiels ; les trois taux réels sont conservés. Si la devise change et que des taux réels existent déjà, la sauvegarde est bloquée pour éviter de les réattribuer à une autre devise : modifier et vérifier la ligne dans l'historique.

La page **Historique des comparaisons** présente exactement 12 colonnes : Date, Usager, Devise, puis Mastercard/Visa/Wise dans les groupes estimé, officiel et réel. Les actions Modifier/Supprimer sont dans la cellule Date, sans treizième colonne. Les en-têtes sont groupés sur deux niveaux et le tableau défile horizontalement sur téléphone.

Les références estimées restent distinctes des taux officiels. La référence de banques centrales peut être commune aux trois cartes. Un taux officiel recopié avec la provenance « Calculateur officiel » est déclaré par l'usager, non vérifié ; une autre source personnelle n'est pas classée comme officielle. Les dates de source et conventions de frais sont conservées et affichées sous les valeurs. Un taux Wise reconstitué depuis un devis arrondi reste signalé. Aucun taux réel n'est inventé : l'usager saisit ultérieurement ses moyennes de taux réels, carte par carte ; une case inconnue reste vide.

Modifier permet de compléter les taux réels ou corriger les 12 champs. Un changement de devise nécessite de confirmer que les taux ont été vérifiés. Une modification ne peut pas écraser une autre ligne de même date/usager. Les transactions IndexedDB et les révisions protègent également contre les modifications concurrentes dans deux onglets.

Filtrer par intervalle de dates, usager et devise. **Exporter en CSV** exporte les lignes filtrées, avec exactement les 12 colonnes dans l'ordre du tableau. Le nom `carte-claire-historique-unites-locales-par-CAD.csv` précise la convention. Les taux saisis sont conservés sous forme de chaînes décimales normalisées, sans arrondi ; le CSV conserve ces chiffres. Un tableur peut reformater les nombres à l'ouverture : le contenu du CSV reste la référence de précision. Le texte des identifiants est protégé contre les formules de tableur.

## Stockage

La base IndexedDB `carte-claire-history` contient les comparaisons et les identifiants usagers. Aucune donnée d'historique n'est envoyée à un serveur, à GitHub, ni dans `rates.json`. Les identifiants sont des étiquettes locales, pas des comptes : les utilisateurs du même navigateur peuvent consulter toutes les lignes. Un autre appareil ou profil de navigateur a sa propre base indépendante.

L'effacement des données du navigateur supprime l'historique ; un navigateur en mode privé peut l'effacer à la fermeture. Exporter régulièrement les données. L'import et la synchronisation entre appareils ne font pas partie de cette version. Si IndexedDB est indisponible, l'échec est indiqué ; aucun enregistrement n'est prétendu réussi et aucune substitution par un autre stockage n'est effectuée.

## Validation

- `node scripts/test-history.mjs` : 12 colonnes, précision, distinction des types de taux, conservation des taux réels, filtres et export.
- `python scripts/test-history-browser.py` : vraie base IndexedDB dans un navigateur neuf ; ajout, annulation/remplacement, deux usagers, édition, suppression, protection de devise, conflits de révision, CSV téléchargé et analysé, rechargement, profil indépendant, stockage indisponible et défilement iPhone.
- Régressions existantes du calculateur, frais, récompenses, délai et saisie manuelle conservées. Les tests de collecte restent synthétiques ; aucun fournisseur financier n'est interrogé pour ces tests.

Les captures et CSV de test sont synthétiques, dans `artifacts/history-tests/`, jamais des données personnelles de production.
