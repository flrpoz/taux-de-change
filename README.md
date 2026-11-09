> Correctif Safari : chargement compatible sans `structuredClone`, `AbortSignal.timeout` ni `Array.at`, ressources versionnées pour renouveler les anciens caches, migration des réglages en conservant les paramètres financiers.

> Comparaison automatique rétablie : références Frankfurter clairement indiquées **ESTIMÉES**, frais Wise hypothétiques modifiables et saisie manuelle conservée. Les collecteurs officiels restent désactivés. Les références sont actualisées chaque jour par le workflow existant ; leur date reste affichée et une référence de plus de 7 jours est exclue par défaut.

# Carte Claire

Comparateur en CAD de Wise Debit, RBC Avion Visa Infinite et BNC World Elite Mastercard. Frais, récompenses et avantage du paiement différé conservés.

**Version candidate du 10 novembre 2026 : [livraison, tests et déploiement](LIVRAISON-10-NOVEMBRE.md).** Ne pas publier avant validation.

Les sources officielles non autorisées restent manuelles. Les collecteurs Chromium issus de la preuve de concept sont intégrés mais désactivés jusqu'à confirmation de droits de collecte et de republication. Aucune clé OpenAI ni dépense API nécessaire. Les références estimées sont distinctes et désactivées par défaut dans le comparateur.

L'application est dans `dist/`, sans compilation. Le workflow `ci.yml` teste la version sans publication. Le workflow `pages.yml`, après fusion validée sur `main`, conserve les données sur `carte-claire-data` puis publie Pages. Les paramètres de l'utilisateur restent sur son appareil.

Les tests Node et Chromium, les limites Wise, les permissions, la conservation des taux et les instructions GitHub sont détaillés dans le document de livraison. Les anciens guides INSTALLATION, MISE-A-JOUR et FIABILITE-DES-TAUX décrivent la version antérieure ; pour cette livraison, suivre le nouveau document.
