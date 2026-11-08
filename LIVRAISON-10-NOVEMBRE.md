# Carte Claire — version candidate du 10 novembre 2026

## État

Branche locale : **livraison-2026-11-10**, créée depuis le commit public `f3b8b06`. Aucun changement de la version publiée, aucun appel API OpenAI, aucun frais API engagé. La livraison ne dépend pas d'une observation préalable de 14 jours.

**Aucun droit de collecte ET de republication de taux officiels n'est actuellement configuré. Les trois fournisseurs restent donc en mode manuel.** Cette version est utilisable avec saisie manuelle, conservation des données et collecteurs préparés pour les sources autorisées ; ce n'est pas une automatisation officielle complète déjà activée.

## Changements livrés

- Schéma 3 de `rates.json` : observations officielles validées, références estimées et statuts de collecte séparés.
- Conservation des valeurs et dates d'un taux officiel après panne ; aucune substitution par une référence estimée. Mise à jour atomique du fichier.
- Dernier instantané conservé sur l'appareil pour les consultations hors connexion. Une réponse incomplète n'efface pas un taux officiel validé déjà conservé.
- Dates visibles, données périmées après 72 heures par défaut. Elles restent conservées mais sont exclues du calcul sans choix explicite de simulation avec données anciennes.
- Estimations désactivées par défaut, y compris à la migration des anciens réglages. Activation volontaire dans Paramètres. Les réglages numériques existants restent conservés.
- Saisie manuelle Visa/Mastercard avec ou sans frais, date et provenance déclarée. Wise accepte maintenant le total CAD et les frais CAD du devis de carte : pas de calcul de taux demandé à l'utilisateur, pas de double application des frais.
- Un devis Wise automatique s'applique uniquement au montant et à la devise correspondants. Un autre achat exige un autre devis, sans extrapolation prétendument officielle.
- Les formules existantes de frais, récompenses, seuil mensuel BNC, exemption et avantage du délai sont conservées. Les quatre devises EUR, USD, IDR et AUD sont configurées ; les douze devises d'origine restent disponibles.
- Le navigateur web de l'utilisateur ne contacte plus les fournisseurs de taux directement. Les anciens instantanés Wise restent conservés avec leurs anciennes dates ; aucun taux du POC n'est injecté comme nouvelle donnée à publier.

## Sources : voie autorisée examinée

| Fournisseur | Constat | Décision immédiate |
|---|---|---|
| Mastercard | Le calculateur interdit l'accès automatisé. API Standard de production : inscription comme émetteur avec numéro ICA. | Saisie manuelle. Demander un accès licencié adapté à un particulier, ou l'aide de l'émetteur BNC. Aucun coût ou accès gratuit présumé. |
| Visa | API Foreign Exchange accessible aux développeurs indépendants, sous réserve de revue avant production. Les règles publiques générales réservent la réutilisation publique à un consentement écrit ; portée canadienne à confirmer. | Saisie manuelle tant que les droits adaptés à Carte Claire ne sont pas confirmés. |
| Wise | Les consignes partenaires invitent les comparateurs à prendre contact pour les taux et frais en temps réel. Un jeton personnel ne prouve ni les droits de republication ni les frais de carte. | Collecteur et ancien endpoint public désactivés ; saisie du devis de carte. |

Références consultées le 8 novembre :

- [Conditions Mastercard Canada](https://www.mastercard.com/ca/en/terms-of-use.html) ; [API et accès production](https://developer.mastercard.com/currency-conversion-calculator/documentation/).
- [Visa Foreign Exchange : développeurs indépendants et revue de production](https://developer.visa.com/docs/foreign_exchange) ; [Visa Canada juridique](https://www.visa.ca/en_CA/legal.html) ; [règles générales Visa](https://www.visa.com/en-gb/legal).
- [Accord Wise Canada](https://wise.com/ca/legal/terms-of-use) ; [consignes Wise pour les comparateurs](https://wise.com/partner/guidelines) ; [API de taux](https://docs.wise.com/api-reference/rate).

Une incertitude chez Visa/Wise n'est pas présentée comme une interdiction juridique générale. La version garde simplement ces collectes désactivées en l'absence de droit confirmé pour cet usage précis. La réussite technique du POC n'est pas une permission.

Demande d'accès à préparer pour chaque fournisseur, sans envoyer de message automatiquement : « Puis-je collecter EUR, USD, IDR et AUD vers CAD une fois par jour et publier les valeurs avec leurs dates dans un comparateur personnel non commercial sur GitHub Pages ? Quelle API ou autorisation écrite couvre collecte et republication, à quel coût ? » Pour Wise, préciser **paiement par carte depuis CAD**, pas transfert. Pour Mastercard, préciser **particulier sans ICA**. Aucun service payant n'a été souscrit.

## Tests documentés

La preuve antérieure conserve 15 collectes financières réelles réussies le 8 novembre dans `/workspace/scratch/carte-claire-poc/`. Les collecteurs sont réutilisés avec contrôle d'autorisation, sortie de preuves adaptée et option de fixture locale. Cette preuve ne démontre pas des droits d'exploitation ni une disponibilité quotidienne.

Pour la version révisée :

| Commande | Vérifications |
|---|---|
| `node scripts/test.mjs` | 30 comparaisons numériques historiques : Mastercard 100 EUR, frais inclus 2,5 %, total 160,53 CAD ; frais inclus/exclus, exemption, récompenses, délai et classement. |
| `node scripts/test-integration.mjs` | Quatre devises, frais Wise exacts sans double application, refus du mauvais montant, sources/devises/dates/preuves invalides, variations anormales ; conservation après panne ; deux échecs consécutifs ; aucun repli officiel vers estimation. |
| `node scripts/test-persistence.cjs` | Contrat API GitHub simulé : restauration, branche de données, écriture avec SHA, alerte et refus sur 403/JSON invalide. Aucun appel distant. |
| `node scripts/test-updater.mjs` | 12 échecs de référence simulés : valeurs et dates inchangées. Aucun fournisseur non autorisé interrogé. |
| `node scripts/check-package.mjs` | Fichiers, 12 devises, icônes et chemins relatifs. |
| `python scripts/test-browser.py` | 12 parcours de collecteur sur formulaires **LOCAUX synthétiques**, sandbox Chromium activé ; quatre devises dans l'application, saisies manuelles et total/frais Wise, vues mobile et ordinateur, échec réseau. Zéro requête fournisseur financier. |

Les tests synthétiques ne sont pas des collectes officielles : leurs résultats portent `testOnly: true` et `test-validated` ; le validateur de publication les refuse. Une invocation directe de Mastercard sans permission s'arrête avec `policy-blocked` et le code 2 avant de lancer Chromium.

### GitHub Actions

Le compte GitHub est maintenant connecté et la branche de livraison est publiée dans la [PR en brouillon n° 1](https://github.com/flrpoz/taux-de-change/pull/1). Le premier test distant a confirmé les tests Node mais a échoué avant navigation : AppArmor Ubuntu bloquait le sandbox du Chromium système. Le workflow sélectionne désormais le navigateur fourni par Playwright et charge un profil AppArmor limité à son chemin exact pour autoriser les user namespaces. Le sandbox Chromium reste activé, sans désactivation globale de cette protection Ubuntu. La réussite de la relance doit être constatée dans Actions avant validation finale. Les collectes financières réelles sur GitHub ne sont pas déduites des tests locaux : la validation CI utilise des formulaires synthétiques, sans requête fournisseur.

`ci.yml`, nommé **Valider Carte Claire sans publication**, démarre au push de la branche de livraison. Il installe Chromium, teste les formulaires locaux et l'application, et conserve les preuves. Il ne publie rien, ne collecte aucun fournisseur non autorisé et n'utilise pas OpenAI. L'accès réel des calculateurs depuis GitHub reste à tester lorsqu'il sera autorisé ; IP, région et versions peuvent changer leur comportement.

## Déploiement simple après validation

1. Rétablir l'accès GitHub sans transmettre de jeton dans la conversation. Pousser la branche de livraison et préparer une demande de fusion ; ne pas pousser directement sur `main`.
2. Vérifier **Actions → Valider Carte Claire sans publication**. Consulter les captures dans l'artefact `validation-carte-claire-…`.
3. Valider la nouvelle version puis fusionner dans `main`. **La fusion est l'étape qui déclenche la publication. Elle n'a pas été faite dans ce travail.**
4. Le workflow **Actualiser les taux et publier** conserve les données et publie Pages à l'adresse habituelle. Dans Settings → Pages, garder GitHub Actions. Aucune clé OpenAI nécessaire.

Si l'accès GitHub reste indisponible, le ZIP source peut être remis à la personne qui dispose de l'accès au dépôt pour effectuer ces étapes. Ne pas téléverser `artifacts/`, `.git/` ou les preuves synthétiques dans le dépôt public. Ne pas remplacer directement les fichiers de `main` avant validation.

## Collecte quotidienne et persistance

Après fusion seulement, la planification est **14 h 37 UTC**, une fois par jour. Le workflow restaure le dernier instantané depuis la branche **carte-claire-data**, collecte uniquement les sources autorisées, valide les candidats et conserve les anciennes entrées lors d'un échec. Les références Frankfurter s'actualisent dans leurs propres champs ESTIMÉ, sans remplacer les taux officiels.

Un job de conservation distinct, sans navigateur, écrit `rates.json` sur la branche de données. Un autre job publie exactement cet instantané sur Pages. Les données persistantes ne reposent donc pas uniquement sur le disque éphémère du runner ou sur un cache. Le workflow ne modifie pas `main` pour enregistrer des taux.

Les permissions d'écriture GitHub et d'issues sont limitées au job de conservation ; le navigateur n'a pas de jeton d'écriture. Les collecteurs sont lancés sans clés API ni secrets dans leur environnement. Les preuves sont conservées 14 jours.

Après deux échecs d'une source activée, une issue de suivi est créée ou mise à jour. Activer les notifications d'issues du dépôt pour recevoir l'alerte. Une source volontairement manuelle n'est pas considérée en panne. Les erreurs des références restent dans les journaux.

GitHub peut retarder/abandonner un déclenchement et désactiver un workflow public après 60 jours sans activité. Aucun moniteur externe d'absence d'exécution n'est installé. L'affichage des dates et la péremption restent fonctionnels même si le planificateur s'arrête. Le cache hors connexion nécessite une première consultation réussie.

## Activer ultérieurement une source

Une permission doit couvrir la collecte **et** la publication précises, pas seulement la présence d'une clé. La configuration de confiance `config/sources.json` exige `enabled: true`, `permission.collection: true`, `permission.publication: true`, une preuve `evidence`, `reviewedAt` et éventuellement `expiresAt`. Faire vérifier ce droit avant toute activation ; ne pas utiliser une permission fictive. Ce n'est pas un réglage destiné aux visiteurs.

Si l'autorisation couvre uniquement une API de production, son adaptateur et ses identifiants devront être ajoutés : une autorisation API ne permet pas implicitement le parcours Chromium. Le logiciel ne transforme pas la preuve technique en droit d'accès.

## Coûts et retour arrière

API OpenAI : **0 USD**. Aucun service payant ajouté. Les runners standards d'un dépôt public sont gratuits ; contrôler les allocations de stockage des preuves. Les tarifs d'accès aux fournisseurs doivent être connus et autorisés avant activation.

Après publication, annuler la fusion par une nouvelle demande de fusion pour revenir au code précédent. Conserver la branche de données pour garder les derniers taux fiables. Le service worker change de version de cache pour mettre à jour l'application installée sur iPhone.
