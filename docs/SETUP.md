# Mise en route du réseau privé Hoodlrz

Ce document liste ce qu'il faut poser pour que l'application tourne :
les variables d'environnement, les migrations de base de données, et les
services extérieurs sur lesquels elle s'appuie.

Il est rangé dans le dépôt plutôt que dans un outil tiers : une
configuration qui vit à côté du code qui la lit ne peut pas se décaler de
lui.

---

## 1. Variables d'environnement

Elles vivent dans `.env.local` en développement, et dans les variables de
projet de l'hébergeur en production. `.env.local.example` en garde la
liste commentée.

**Une seule règle absolue** : tout ce qui est préfixé `NEXT_PUBLIC_` part
dans le navigateur de chaque visiteur. Une clé privée ou une clé de
service ne doit jamais porter ce préfixe.

### Indispensables

| Variable | Rôle | Sans elle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Adresse du projet Supabase | Rien ne fonctionne |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé publique, limitée par les politiques RLS | Aucune session |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé serveur, contourne RLS | Pas de création de compte wallet |
| `SUPABASE_DB_URL` | Connexion Postgres directe | `npm run db:migrate` refuse de démarrer |
| `NEXT_PUBLIC_SITE_URL` | Domaine public | Liens absolus et sitemap faux |

### Réseau privé

| Variable | Rôle | Sans elle |
|---|---|---|
| `ALCHEMY_API_KEY` | RPC des deux chaînes, et snapshots de holders | Repli sur les RPC publics, limités en débit |
| `ETH_MAINNET_RPC` | Force un fournisseur Ethereum | Alchemy, puis un endpoint public |
| `RH_MAINNET_RPC` | Force un fournisseur Robinhood Chain | Alchemy, puis l'endpoint public |
| `CRON_SECRET` | Authentifie la veille hebdomadaire | La route refuse tout, y compris le programmateur |

### Déjà en place

| Variable | Rôle |
|---|---|
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Paiement des vinyles |
| `NEXT_PUBLIC_HOODLRZ_STREET_ADDRESS` | Contrat OG Hoodlrz sur Ethereum |
| `NEXT_PUBLIC_HOODLRZ_NFT_ADDRESS` | Contrat HoodlrzOnChain |
| `HOODLRZ_TREASURY_PRIVATE_KEY` | Signe les transferts de récompenses City. **Serveur uniquement.** |

---

## 2. Migrations

Elles sont dans [`supabase/migrations/`](../supabase/migrations). L'ordre
est celui des numéros.

| Fichier | Ce qu'il pose |
|---|---|
| `001_initial_schema.sql` | Comptes, collections, jetons, ventes |
| `002_wallet_nonces.sql` | Nonces à usage unique de la connexion wallet |
| `003_genesis_vinyls.sql` | Vinyles Genesis |
| `004_eth_vinyl_orders.sql` | Commandes de vinyles payées en ETH |
| `005_hoodlrz_city.sql` | Holders, jetons et état de synchronisation du jeu |
| `006_city_claims.sql` | Récompenses réclamées |
| `007_city_progress.sql` | Progression des joueurs |
| **`008_holder_gate.sql`** | Adresse du wallet, verdict de détention, avoirs, unicité du pseudonyme |
| **`009_messaging.sql`** | Clés publiques, conversations, membres, messages chiffrés, annuaire |
| **`010_hdlrz_predictions.sql`** | Solde Hdlrz, journal, feed, marchés binaires, mise et résolution |
| **`011_news.sql`** | Liens de la veille hebdomadaire et journal des exécutions |

### Les appliquer

La base de production porte déjà 001 à 007, passées à la main. Il faut
donc d'abord dire à l'applicateur où on en est, sinon il refuse de
démarrer — et il a raison : rejouer `001` sur une base peuplée abîmerait
des données.

```bash
npm run db:migrate -- --baseline 007   # aligne le suivi, n'exécute rien
npm run db:migrate                     # applique 008 à 011
```

`--etat` dit ce qui manque sans rien écrire. `--print` sort le SQL
restant, à coller dans l'éditeur SQL de Supabase si l'accès direct au
port 5432 est bloqué.

Chaque migration passe dans sa propre transaction : un échec sur la
quatrième n'annule pas les trois précédentes.

### Les vérifier

```bash
TEST_DB_URL=postgresql://$(whoami)@localhost:5432/postgres npm run db:test
```

Crée une base jetable, y applique tout, rejoue 008 à 011 pour vérifier
qu'elles supportent d'être relancées, puis exerce les fonctions de Hdlrz
sur de vraies lignes : quinze vérifications, dont le fait que rien ne se
crée ni ne disparaît à la résolution d'un marché. Le script refuse une
URL qui ressemble à Supabase, parce qu'il détruit la base qu'il crée.

---

## 3. Intégrations

| Service | Ce qu'il fait ici | Ce qui casse s'il tombe |
|---|---|---|
| **Supabase** | Base, authentification, stockage des images Gen Kids | Tout |
| **Ethereum** (via Alchemy) | Lecture de détention OG Hoodlrz | La porte ne sait pas, elle ne dit pas « non » |
| **Robinhood Chain** (via Alchemy) | Lecture de détention Gen Kids, contrats de la collection | Idem |
| **Vercel Cron** | Déclenche la veille le lundi 7 h UTC, et City toutes les 30 min | Aucun lien nouveau |
| **Flux RSS** (CoinDesk, Decrypt, Cointelegraph) | La veille : titres, résumés et liens | Un éditeur muet manque à l'appel, les autres passent |
| **Stripe** | Paiement des vinyles | Boutique vinyle seulement |
| **OpenSea** | Marché secondaire, deux chaînes | Rien côté app : la propriété se lit sur la chaîne |

La section News **n'écrit rien**. Elle relaie un titre, le résumé que
l'éditeur publie lui-même, et un lien vers chez lui, ouvert dans un
nouvel onglet. Le classement entre crypto, NFT et meme coin se fait par
mots-clés, sans appel de modèle : trier des titres ne justifie pas une
dépendance extérieure qui tombe un lundi matin.

### Ce qui ne dépend d'aucun service

Le chiffrement des messages. Les clés sont dérivées d'une signature de
wallet dans le navigateur, et le serveur ne stocke que du chiffré. Aucun
tiers ne peut lire une conversation, nous compris.

---

## 4. Après la mise en ligne

1. Passer les migrations (section 2).
2. Poser `CRON_SECRET` et `ETH_MAINNET_RPC`.
3. Déclencher la veille une fois à la main pour ne pas attendre lundi :
   ```bash
   curl -X POST https://www.hoodlrz.com/api/cron/news \
     -H "Authorization: Bearer $CRON_SECRET"
   ```
4. Prévenir les membres existants : leur compte n'a ni pseudonyme ni
   statut de détenteur tant qu'ils ne se sont pas reconnectés par wallet.

---

## 5. Limites connues, dites franchement

- **Le limiteur de débit compte en mémoire du processus.** Sur un
  hébergement sans état, chaque instance a le sien : dix instances, dix
  fois la limite annoncée. C'est une gêne sérieuse pour un attaquant, pas
  une garantie. Le remplacer par un magasin partagé ne demande de
  toucher à aucun appelant.
- **Le chiffrement de bout en bout ne cache pas les métadonnées.** Qui
  parle à qui, quand, à quelle fréquence. Les cacher demanderait un
  mélange de trafic d'un autre ordre de complexité.
- **Pas de confidentialité persistante.** Qui obtient la clé privée du
  wallet peut refabriquer la clé de messagerie et relire l'historique.
  C'est le prix d'une clé qu'on n'a pas à sauvegarder, et la sauvegarde
  manuelle d'une clé est exactement ce que les gens perdent.
- **Le verdict de détention est mis en cache.** Qui vend sa dernière
  pièce garde l'accès jusqu'au prochain rafraîchissement, au plus six
  heures. Bon compromis pour un réseau social, mauvais pour un coffre.
