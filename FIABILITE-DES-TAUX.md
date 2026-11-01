# Fiabilité Mastercard et Visa — vérification du 30 octobre 2026

## Décision

Aucune collecte automatisée du calculateur public Mastercard ou Visa n’est ajoutée. GitHub Actions lève la contrainte CORS du navigateur mais ne supprime ni les restrictions d’accès, ni l’authentification, ni les conditions de réutilisation des données. Aucune API de production autorisée n’est disponible dans ce projet. Le workflow continue de récupérer Wise et la référence Frankfurter, avec une séparation explicite des sources. Un taux Frankfurter n’est jamais étiqueté comme Mastercard ou Visa officiel.

## Mastercard : calculateur public

Le [calculateur canadien officiel](https://www.mastercard.com/ca/en/personal/get-support/currency-exchange-rate-converter.html) est utilisable interactivement. Son montant et son taux incluent les frais bancaires saisis. Il reste indicatif; l’autorisation ou le traitement détermine le taux finalement utilisé par l’émetteur.

Les [conditions canadiennes, rubrique Right to Use Site Content](https://www.mastercard.com/ca/en/terms-of-use.html) interdisent expressément l’accès au site par des systèmes automatisés. Lors des essais de la version précédente du projet, l’endpoint web renvoyait HTTP 403/Akamai. Une URL interne, même si elle répond parfois, n’est pas un contrat d’API publique ni une autorisation de collecte. Pas de nouvelle tentative de scraping, de contournement anti-bot ou de proxy tiers intégrée au projet.

## Mastercard : API officielle

La documentation du [Standard Currency Conversion Calculator](https://developer.mastercard.com/currency-conversion-calculator/documentation/) décrit une API pour les clients émetteurs Mastercard. L’accès de production exige une inscription comme client émetteur et un identifiant ICA. La documentation [API Basics](https://developer.mastercard.com/currency-conversion-calculator/documentation/api-basics/) exige OAuth 1.0a : Consumer Key et clé de signature privée. Elle distingue la production du sandbox, qui renvoie des réponses statiques simulées. Le sandbox ne sert donc jamais de taux réel dans ce comparateur.

L’offre Standard n’affiche pas de prix exploitable dans les pages consultées : les conditions d’accès et le coût éventuel doivent être confirmés auprès de Mastercard. On ne peut pas la présenter comme gratuite pour un particulier. L’offre [Enhanced](https://developer.mastercard.com/enhanced-currency-conversion-calculator/documentation/), destinée aux émetteurs de l’EEE, affiche 1 250 EUR par trimestre : ce n’est pas une option adaptée au projet personnel canadien. Ce prix ne constitue pas celui de Standard.

Avec un contrat et des clés de production admissibles, GitHub Actions pourrait techniquement signer les requêtes côté serveur, sous réserve des droits de stockage/redistribution des taux. Les clés resteraient dans GitHub Secrets et jamais dans dist. Ces conditions ne sont pas réunies ici : aucun connecteur non testé ou prétendument gratuit n’est livré.

## Visa : même exigence

L’API [Foreign Exchange Rates](https://developer.visa.com/capabilities/foreign_exchange/overview) est accessible en sandbox et sur approbation en production. Sandbox gratuit; frais de production à demander à Visa. L’[authentification documentée](https://developer.visa.com/capabilities/foreign_exchange/docs-authentication) utilise mTLS avec certificat et identifiants. Il faut un accès de production approuvé, pas des identifiants sandbox, pour prétendre récupérer des données réelles utilisables.

Les [conditions développeur Visa, Application Requirements](https://developer.visa.com/terms) encadrent l’extraction automatique et les droits sur les contenus. L’ancien endpoint du calculateur avait renvoyé HTTP 403/challenge Cloudflare pendant les essais initiaux. Aucun flux anonyme gratuit et autorisé n’a été confirmé pour ce projet. Une collecte directe par GitHub Actions n’est pas ajoutée.

Les taux d’API Visa sont indicatifs; il faut aussi confirmer le produit de taux approprié à l’achat carte, plutôt que confondre un taux Visa Direct ou bancaire avec le taux de règlement d’une carte RBC.

## Statuts visibles

- **ESTIMÉ** : référence Frankfurter, données de banques centrales. Jamais un taux Visa/Mastercard officiel, même si un ancien champ JSON est mal étiqueté.
- **MANUEL** : saisie utilisateur. La provenance « calculateur officiel Mastercard/Visa déclaré » est affichée, mais n’est pas vérifiée automatiquement. La saisie ne devient jamais un taux officiel récupéré par l’app.
- **OFFICIEL** : taux indicatif récupéré directement auprès du fournisseur; dans cette version, Wise uniquement. Ses frais restent l’hypothèse de 0,75 % configurée, ou un devis saisi, pas des frais officiels récupérés.
- **Indisponible** : taux absent ou estimation désactivée sans saisie manuelle. Aucun zéro ni gagnant global fictif.

La date de source est distincte de l’heure de consultation. Les dates d’instantanés anciens restent inchangées en cas de panne. Une saisie manuelle demande une date; l’heure reste facultative et n’est pas inventée.

## Frais inclus : calcul exact

Tous les taux sont exprimés en CAD pour une unité de devise locale.

Taux sans frais : base = montant × taux.
Taux frais inclus : taux de base = taux saisi / (1 + pourcentage déjà inclus / 100).

L’app calcule ensuite les frais UNE fois sur la base, au pourcentage des paramètres. Le pourcentage déjà inclus est une propriété du taux saisi, indépendante du pourcentage configuré pour la carte. Modifier les frais configurés ou activer l’exemption BNC ne modifie pas cette propriété : l’app retire d’abord les frais du devis puis applique le scénario voulu.

Récompenses : sur la base hors frais, comme dans la version précédente. Délai : sur le total réellement simulé avant avantages. Aucun arrondi intermédiaire des calculs; arrondi monétaire seulement à l’affichage.

## Exemple de l’utilisateur, non stocké comme taux actuel

Pour 100 EUR, taux saisi 1,6052525, frais inclus 2,5 % :

| Élément | Valeur |
|---|---:|
| Taux sans frais reconstitué | 1,5661 CAD/EUR |
| Base hors frais | 156,61 CAD |
| Frais non arrondis | 3,91525 CAD |
| Total non arrondi | 160,52525 CAD |
| Total affiché avant avantages | **160,53 CAD** |
| Récompenses BNC, autre achat, 1 pt/$ à 1 cent/pt | 1,5661 CAD |
| Avantage du délai, 8 %, 21 jours | ≈ 0,712365 CAD |
| Coût net affiché | **158,25 CAD** |

Avec exemption BNC simulée, total avant avantages : 156,61 CAD. Un taux de 1,5661 saisi sans frais reproduit le même total initial de 160,53 CAD si les frais configurés sont de 2,5 %.

Le total arrondi 160,53 / 100 donne 1,6053, légèrement différent du taux précis 1,6052525. Les deux affichent 160,53 pour cet achat, mais conserver la précision du taux est préférable.

## Validation et limites

Tests exécutés : 30 comparaisons numériques plus validations des statuts, des saisies invalides et du classement; test d’actualisation avec 24 échecs de sources simulés, sans modification des taux/dates précédents; contrôle de l’interface avec la saisie Mastercard et la colonne « Total avant avantages » à 160,53 CAD.

Le workflow GitHub Pages conserve son déclenchement manuel, sur modification de la branche par défaut et toutes les six heures environ. Seul dist est publié. Aucun accès au dépôt GitHub utilisateur n’a été fourni : le déploiement de cette version doit être confirmé dans Actions après téléversement.
