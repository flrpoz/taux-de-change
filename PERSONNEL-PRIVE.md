# Carte Claire personnelle : exécution privée

Cette branche ne déploie rien. Les workflows publics existants ne reçoivent aucun résultat personnel. Le dépôt reste public. Le moteur de frais, récompenses et paiement différé est conservé.

## Ce qui a été vérifié le 8 novembre 2026

- Les 250 empreintes du dossier de preuve de concept historique correspondent aux fichiers conservés. Sa série de 15 processus comprend de vraies pages officielles ; ce n'est pas une garantie de fiabilité quotidienne.
- Nouvelle série réelle : Visa et Wise, cinq devises EUR/USD/IDR/AUD/JPY, dix observations validées dans des processus Chromium neufs, bac à sable activé, sans stdin et sans API OpenAI. Deux essais préliminaires EUR ont également réussi, puis deux lectures supplémentaires JPY ont été déclenchées depuis le bouton Comparer pour un nouveau montant exact. Cela fait 14 lectures réelles réussies pendant cette reprise, distinctes des 15 anciennes.
- Les dix résultats ont été comparés aux captures ; les cinq devises ont ensuite été affichées dans l'interface privée avec Visa et Wise chiffrés et Mastercard absent. Les montants et preuves restent hors du dépôt ; ils ne figurent pas dans cette documentation publique.
- Les 15 parcours de formulaires (3 × 5 devises) en CI sont SYNTHÉTIQUES. Ils ne prouvent jamais une collecte effective. Les essais réels ont été exécutés dans l'environnement Codex Linux, pas sur l'iMac.
- Les définitions launchd Mac et le serveur privé sont testés localement ; la planification et l'installation macOS ne peuvent pas être confirmées sans l'iMac.

## Revue distincte des fournisseurs

**Mastercard — bloqué.** Les [conditions canadiennes](https://www.mastercard.com/ca/en/terms-of-use.html), section « Right to Use Site Content », permettent certains usages personnels mais interdisent séparément les systèmes automatisés. Le fait d'utiliser un navigateur ou de garder les résultats privés ne supprime pas cette clause. Aucun nouvel essai Mastercard n'a été lancé. Le collecteur reste présent mais bloqué. Une autorisation de Mastercard ou un accès officiel autorisé permettrait de réexaminer cette source ; aucune autorisation n'est inventée et aucune démarche n'est envoyée en votre nom.

**Visa — essais privés limités possibles, portée canadienne incertaine.** La [page canadienne](https://www.visa.ca/en_CA/legal.html) se charge mais ne restitue pas de règles substantielles dans le navigateur. Les [règles générales Visa](https://www.visa.com/en-us/legal), « Use of the Visa Site », permettent les téléchargements personnels non commerciaux et restreignent les usages publics/commerciaux. Aucune interdiction générale des robots identifiée dans ce texte. Nous distinguons cette lecture des conditions d'une permission écrite : nous n'en disposons pas. Le calculateur public a fonctionné, sans authentification ni contournement. Un HTTP 403 sur la ressource auxiliaire CSRF est enregistré ; le formulaire et son résultat fonctionnent normalement, sans appel direct à cette ressource.

**Wise — essais personnels limités, aucune permission de republication.** Le [contrat Canada](https://wise.com/ca/legal/terms-of-use), la [politique d'utilisation mondiale](https://wise.com/gb/legal/acceptable-use-policy) liée depuis la liste des accords canadiens et la [notice de propriété intellectuelle](https://wise.com/help/articles/79CxCv9Qj1r7mDPJuIwUA3/wise-intellectual-property) ont été consultés. Aucune interdiction générale de l'automatisation identifiée dans le contrat/AUP ; accès non autorisé et perturbation interdits. La licence personnelle est limitée, révocable et ne s'étend pas aux produits tiers : sa portée pour une intégration logicielle n'est pas expressément établie. Le mode préparé se limite à lire le formulaire public pour une décision personnelle, sans compte, transfert ni service à des tiers. Ce choix est une interprétation documentée, pas une approbation de Wise ni une assurance juridique de collecte durable. Toute objection ou restriction doit arrêter la collecte. Un 403 sur une icône de drapeau auxiliaire a été enregistré, sans gêner le calculateur.

Le fichier `config/personal-sources.json` contient des décisions de revue, **pas** des permissions fictives. La collecte privée n'exige pas de droit de publication ; elle n'en accorde jamais. La revue expire le 8 décembre 2026 et doit alors être réévaluée ; une expiration conserve les données et bloque les nouvelles lectures. Les collecteurs publics restent désactivés dans `config/sources.json`.

## Fonctionnement

`node scripts/personal-run.mjs` interroge Visa et Wise pour les cinq devises. Montants par défaut : 100 EUR/USD/AUD, 1 000 000 IDR, 10 000 JPY. Chaque lecture conserve capture, texte visible, paramètres, empreintes et heure de collecte. Mastercard n'est pas interrogé.

Visa : conversion devise étrangère → CAD, frais bancaires 0 %, date proposée par le formulaire. La précision du total affiché est conservée, car le taux unitaire est arrondi. Les frais RBC et les avantages sont calculés ensuite, une seule fois.

Wise : page officielle **tarifs de carte pour résidents canadiens**, financement CAD → achat en devise. Le total CAD comprend déjà les frais. Vérification du produit, de la région, du sens et de la somme des frais. Aucune date effective ni aucun taux sans frais précis n'est inventé : la date de collecte est affichée, et la base reconstituée est étiquetée comme telle. Pas de devis de transfert.

Le serveur privé reprend l'application et déclenche au clic Comparer un devis correspondant au **montant exact** choisi. Un devis Wise récent (moins d'une heure) pour ce montant est réutilisé. Sinon, une nouvelle lecture est tentée ; 30 secondes minimum entre collectes. Compter généralement quelques dizaines de secondes ; panne possible. Une comparaison partielle Visa/Wise est disponible sans attendre Mastercard. Le calcul CAD sans conversion reste disponible.

Les fichiers sont stockés dans `~/.carte-claire-personnel`, hors du dépôt, dossier 700 et instantanés/journaux principaux 600. Aucun accès GitHub, clé bancaire ou API OpenAI nécessaire. Écriture atomique, verrou de collecte, conservation du dernier résultat validé avec sa date en cas d'échec, exclusion par défaut après 72 h et quarantaine des variations anormales. Une panne ne renouvelle jamais la date du dernier résultat. Après deux échecs d'une paire, notification macOS (autorisation de notifications éventuellement nécessaire), compteur et journal privé.

Le serveur expose uniquement les fichiers nécessaires à l'application et son instantané ; il ne sert pas les captures ni les journaux. Il contrôle Host et Origin des requêtes et n'utilise pas de service worker. Aucun tunnel public ni écoute 0.0.0.0. L'accès par une adresse LAN/VPN doit être réservé à des appareils de confiance ; l'application ne possède pas de compte utilisateur propre.

## Choix d'hébergement et coûts

| Option | iMac allumé ? | Accès iPad | Coût et limites |
|---|---|---|---|
| **iMac + réseau privé Tailscale — recommandé pour commencer** | Oui, connecté, session ouverte et éveillé aux collectes ; sinon rattrapage au réveil | Safari via le VPN, même hors domicile | Logiciels utilisés gratuits, électricité et connexion habituelles ; [offre Tailscale Personal gratuite](https://tailscale.com/pricing) selon ses conditions. Aucun abonnement créé. |
| Machine privée déjà disponible, joignable par VPN | Non | Safari via VPN | Aucun nouvel abonnement si vous possédez déjà cette machine ; configuration Python/Node/Chromium et planification Linux à faire. Aucun hôte privé permanent fourni par les accès actuels. |
| Nouveau serveur privé hébergé | Non | Safari avec accès privé à configurer | Hébergement et éventuellement stockage payants selon fournisseur ; non souscrit, non déployé. Plus d'administration que l'iMac. |
| Nouveau dépôt GitHub privé + Actions | Non | Résultats téléchargeables après connexion GitHub, pas une application privée permanente | Quota inclus selon [le forfait GitHub](https://docs.github.com/en/actions/concepts/billing-and-usage), conservation/persistance à organiser et navigateur potentiellement bloqué en centre de données. Un runner temporaire ne fournit pas un service à la demande pour Safari. Dépôt non créé, solution non présentée comme opérationnelle. |

Une session Codex peut piloter les essais, mais elle ne constitue pas un ordinateur permanent avec une tâche quotidienne garantie. ChatGPT Plus ne fournit pas de crédit API ; ici aucun appel à l'API OpenAI, donc **0 frais API OpenAI**. L'hôte gratuit recommandé ne garantit ni la stabilité des sites ni la disponibilité de l'iMac.

## Mise en route sur l'iMac (une fois)

1. Télécharger cette branche et décompresser dans un dossier stable de votre compte, hors dossier synchronisé publiquement. Installer [Node.js LTS](https://nodejs.org/) et [Python 3](https://www.python.org/downloads/macos/) s'ils manquent.
2. Exécuter `Installer-Carte-Claire-Privee.command` depuis ce dossier. Il crée un environnement Python local, installe Playwright/Chromium et deux agents de votre session. Si Safari/Finder ne lance pas le fichier, ouvrir Terminal, taper `bash ` puis glisser le fichier dans Terminal et appuyer sur Entrée. Aucun mot de passe GitHub ou bancaire demandé.
3. Ouvrir `http://127.0.0.1:8765` dans Safari. Les agents lancent le serveur et une collecte initiale ; la collecte quotidienne est à **9 h 37 dans le fuseau configuré sur votre Mac**. L'iMac doit rester connecté et éveillé ; launchd peut rattraper une échéance au réveil, sans garantir la fraîcheur pendant son sommeil. Rien n'a encore été installé sur votre Mac.
4. Pour l'iPad à distance seulement : installer Tailscale sur l'iMac et l'iPad, les connecter au même réseau personnel privé, puis relancer `.personal/venv/bin/python scripts/install-personal.py --host ADRESSE_TAILSCALE_IMAC`. Ouvrir `http://ADRESSE_TAILSCALE_IMAC:8765` dans Safari iPad avec le VPN connecté. Ne pas utiliser Tailscale Funnel ni partager l'accès avec d'autres utilisateurs. Autoriser Python dans le pare-feu Mac si demandé. Cette étape nécessite votre configuration locale ; aucun identifiant ne doit être envoyé dans le chat.

Après l'installation, la comparaison Visa/Wise ne nécessite plus de recopie quotidienne. Mastercard reste indisponible automatiquement. Le contrôle des conditions doit être renouvelé à l'échéance de revue ; ne pas prolonger une revue sans réexaminer ses sources.

Diagnostic : `~/.carte-claire-personnel/last-run.json`, `runs/` et `agent-error.log`. Un verrou abandonné après une interruption doit être supprimé uniquement après avoir vérifié qu'aucune collecte ne tourne. Le dossier est privé mais non chiffré par l'application : protection du compte Mac et FileVault conseillés. Pour arrêter, décharger les deux agents `ca.carteclaire.personnel.*` avec launchctl ; les fichiers restent conservés. Ne jamais copier ce dossier dans le dépôt ou les artifacts Actions publics.

## Validation reproductible sans fournisseurs

```
node scripts/test.mjs
node scripts/test-integration.mjs
node scripts/test-personal.mjs
python scripts/test-personal-server.py
python scripts/test-browser.py
```

Ces tests utilisent des données synthétiques et n'appellent aucun fournisseur. Ils contrôlent aussi le refus de publier des décisions personnelles comme des permissions, l'expiration des revues, la conservation après deux pannes et les frontières du serveur privé. L'exécution réelle se fait séparément, hors CI public. Aucun résultat réel n'est commité ; aucun changement de visibilité, fusion ou publication n'est réalisé par cette branche.
