> Pour installer ce paquet sur GitHub et votre iPhone, commencez par **INSTALLATION.md**. Le workflow utilise la branche par défaut du dépôt.

# Carte Claire

Application statique gratuite, sans dépendances, pour iPhone, iPad et ordinateur. Aucun compte et aucune clé API. Paramètres dans localStorage, propres au navigateur/appareil. Les saisies manuelles ne sont pas persistées et sont invalidées au changement du montant ou de la devise.

## Utilisation

Entrer le montant local, choisir la devise, puis Comparer. La catégorie par défaut est Autres achats; changer la catégorie pour adapter les récompenses. Les réglages comprennent les frais FX, valeurs des points en cents CAD, multiplicateurs, rendement annuel de 8 %, délai de 21 jours, cumul mensuel BNC et exemption simulée.

Les résultats incomplets ne sont pas classés. Wise utilise les frais de 0,75 % demandés par l’utilisateur, enregistrables et modifiables : hypothèse explicitement indiquée, sans prétendre être un devis officiel. Un devis en CAD saisi pour un achat précis remplace cette hypothèse. Une saisie de taux doit être exprimée en CAD pour 1 unité de devise locale, sans frais, avec sa date/heure. Le taux peut être manuel même si les autres cartes utilisent une référence estimée.

## Faisabilité vérifiée le 30 octobre 2026

- Visa : calculateur officiel disponible, appel automatisé CMS testé : HTTP 403/challenge Cloudflare. L’API documentée prévoit un accès de production, pas un flux public garanti pour GitHub Pages.
- Mastercard : calculateur public, endpoint de conversion testé : HTTP 403 Akamai. Aucun contournement ni proxy anonyme.
- Wise : endpoint public rates/live testé : HTTP 200, taux et horodatage fournis. Il ne fournit pas les frais réels de carte; les devis de transfert ne les remplacent pas. L’accès navigateur peut échouer à cause de CORS.
- Frankfurter : API publique testée, taux de référence de banques centrales. Elle ne reproduit pas les taux des réseaux. Chaque simulation porte la mention ESTIMÉ.

Les trois taux exacts et les frais carte Wise ne sont donc pas entièrement automatisables de façon fiable avec une simple page statique gratuite. L’application rend ces limites visibles et permet la saisie depuis les calculateurs officiels. Aucun taux n’est inventé.

## GitHub Pages

1. Créer un dépôt GitHub et y téléverser le contenu de ce dossier, y compris `.github/workflows/pages.yml` (mais pas `.openai`, spécifique à l’aperçu Sites).
2. Dans Settings → Pages → Build and deployment, sélectionner **GitHub Actions**.
3. Déclencher le workflow « Actualiser les taux et publier » depuis Actions.
4. Ouvrir l’URL Pages dans Safari; Partager → Sur l’écran d’accueil.

Le workflow récupère les instantanés Wise et Frankfurter toutes les 6 heures et publie dist/. Les déclenchements planifiés GitHub sont approximatifs et peuvent être retardés/désactivés par GitHub. Le workflow fourni utilise la branche par défaut du dépôt. Un dépôt public avec Actions/Pages peut être utilisé gratuitement selon les conditions GitHub. Aucun abonnement applicatif.

L’aperçu Sites inclut les instantanés de construction; il ne reçoit pas ce cron GitHub. L’application tente aussi un rafraîchissement direct à chaque comparaison; sinon elle affiche les instantanés avec leurs dates d’origine. Les données anciennes restent visiblement datées. Il faut republier ou utiliser le workflow Pages pour actualiser les instantanés.

L’interface peut être utilisée hors ligne après une première ouverture, mais l’instantané de taux n’est pas mis en cache par le service worker : aucune fraîcheur n’est promise hors ligne. Les taux manuels restent possibles.

## Calculs et limites

Base = montant local × CAD/unité. Frais FX sur la base. Points sur la base hors frais. Valeur des points configurable (hypothèse par défaut : 1 cent CAD/point). BNC : répartition de l’achat à travers le seuil de 2 500 CAD, selon le cumul mensuel saisi. Pas de suivi automatique du compte; admissibilité selon le commerçant. RBC voyage 1,25 pt/$, autres 1; BNC autres 1, essence/récurrent/agence 2, épicerie/resto 5 puis 2. Ces règles sont modifiables.

Délai = total facturé × ((1 + rendement annuel)^(jours/365) − 1). Coût net = base + frais − valeur des points − délai. Solde payé entièrement; pas d’intérêts débiteurs, frais annuels, retraits, frais d’ajout d’argent Wise, rendement fiscal ou volatilité. Wise suppose un financement à partir d’un solde CAD existant. Un achat dans une devise déjà détenue nécessite d’évaluer son coût d’acquisition séparément. Les résultats restent des estimations du coût marginal, pas des montants garantis de relevé.

## Tests et développement

Node 22+ : `node scripts/test.mjs` puis `node scripts/update-rates.mjs`.
Servir dist/ avec un serveur HTTP local; les modules JS ne fonctionnent pas en ouvrant index.html en file://.

Sources :
- https://www.visa.ca/support/consumer/travel-support/exchange-rate-calculator.html
- https://developer.visa.com/docs/foreign_exchange
- https://www.mastercard.com/us/en/personal/get-support/currency-exchange-rate-converter.html
- https://wise.com/help/articles/2934551/what-are-the-wise-card-fees
- https://docs.wise.com/guides/product/accounts/convert-from-balance-to-balance
- https://www.rbcroyalbank.com/fr/cartes/voyages/avion-visa-infinite-rbc.html
- https://www.bnc.ca/particuliers/cartes-credit-mastercard/world-elite.html
