# Battler en ligne

_Plan rédigé le 2026-10-26 (version 0.119.0), à la demande de l'utilisateur. Aucun code n'est écrit : ce document fixe le but, le montage et les étapes, et liste les décisions à prendre._

## 1. Le but

**Premier objectif** (décision de l'utilisateur, 2026-10-26) : **partager le jeu avec des amis**. Chacun ouvre un lien, se connecte avec son compte Google, et retrouve **son historique lié à son compte**, sur n'importe quel appareil.

**Hors du premier objectif**, gardé pour plus tard (§ 10) : gérer une communauté, des classements, des salons de paris sur téléphone, le PvP asynchrone, la vérification des combats par le serveur, la remontée des combats pour l'équilibrage.

Conséquence : pas besoin, pour l'instant, que le serveur tienne les graines ou les cotes, ni qu'il rejoue les combats. Entre amis, la triche n'est pas un sujet. Le serveur ne fait que **garder les sauvegardes de chacun**.

## 2. Le montage retenu : l'option A

| Pièce | Rôle | Coût |
| --- | --- | --- |
| **Firebase Authentication** (plan gratuit Spark, rien d'autre de Firebase) | la connexion avec Google ; elle délivre au navigateur un jeton signé qui prouve qui est le joueur | gratuit |
| **Le VPS Infomaniak** | sert le jeu (fichiers statiques), et une petite API qui garde les sauvegardes | déjà payé (3 CHF par mois) |
| **Caddy** sur le VPS | le serveur web : HTTPS automatique, fichiers du jeu, relais vers l'API | gratuit |
| **Une API Node** sur le VPS | reçoit le jeton, le vérifie avec les clés publiques de Google (`firebase-admin`, sans appel payant), lit et écrit les sauvegardes du seul joueur authentifié | gratuit |
| **SQLite** sur le VPS | la base : un seul fichier, sans serveur à faire tourner | gratuit |

Pourquoi ce partage : Google gère ce qui est dangereux à coder soi-même (mots de passe, connexion, sécurité des comptes). Le VPS garde les données en Suisse et reste maître du jeu pour les étapes suivantes (§ 10). Rien n'enferme : changer de fournisseur de connexion ne touche que la vérification du jeton.

### Le trajet d'une sauvegarde

1. Le joueur clique sur « Se connecter » ; la fenêtre Google s'ouvre (Firebase Auth) ; le navigateur reçoit un jeton.
2. À chaque envoi, le jeu joint ce jeton à sa requête vers l'API (`/api/...`, même domaine que le jeu).
3. L'API vérifie le jeton et en tire l'identifiant du joueur. **L'identifiant vient toujours du jeton, jamais du contenu de la requête** : personne ne peut écrire chez un autre.
4. L'API lit ou écrit la ligne de ce joueur dans SQLite.

## 3. Le VPS suffit-il ?

**Oui, largement, pour un cercle d'amis.** Estimations (ordres de grandeur, à confirmer sur le VPS, § 9) :

| Ressource | Disponible | Besoin estimé |
| --- | --- | --- |
| Mémoire | 2 Go | Caddy, 20 à 40 Mo ; API Node, 60 à 100 Mo ; SQLite, négligeable. Le cache et le poller météo restent à côté |
| Processeur | 1 cœur | l'API ne fait que lire et écrire du JSON : quasi nul. Les combats tournent dans le navigateur des joueurs |
| Disque | 20 Go | le jeu : environ 73 Mo par version (en garder 3, moins de 300 Mo) ; les sauvegardes : moins de 1 Mo par joueur (l'historique est déjà plafonné à 300 matchs, `MAX_MATCHES`) |
| Trafic | à vérifier dans la formule | **le seul vrai point** : une première visite télécharge environ 73 Mo. Pour dix amis, aucun souci ; les visites suivantes viennent du cache du navigateur |

Le poids du jeu reste à surveiller plus que le serveur. Compresser les illustrations (WebP ou AVIF) réduirait la première visite ; c'est facultatif pour ce premier objectif, et le gain est à mesurer. Si un jour le trafic devenait un problème, on peut placer un cache gratuit (Cloudflare) devant le VPS sans rien changer d'autre.

## 4. Ce qu'on sauvegarde

Les données vivent aujourd'hui dans le `localStorage` du navigateur, sous des clés versionnées :

| Clé | Contenu | En ligne ? |
| --- | --- | --- |
| `battler:history:v1` | l'historique : totaux par personnage, 300 derniers matchs | **oui**, c'est le but |
| `battler:campaign:v4` | la campagne en cours | **oui** (on reprend sa partie sur un autre appareil) |
| `battler:campaign-heritage:v1` | l'héritage de campagne par champion | **oui** |
| `battler:muted`, `battler:music-muted`, réglages de console et de test | préférences de l'appareil | **non** : elles restent propres à chaque appareil |

**Le modèle de données le plus simple : une copie fidèle des clés.** Une table des joueurs (identifiant, e-mail, nom, dates de création et de dernière visite) et une table des sauvegardes (joueur, clé, contenu JSON tel quel, version du jeu qui l'a écrit, date de mise à jour). Avantages :
- **aucun changement de format** : le contenu en ligne est exactement celui du `localStorage`, et la règle de rétrocompatibilité de `history:v1` s'applique telle quelle ;
- le jour où l'on veut des statistiques en SQL (§ 10), on ajoute une table des matchs à côté, sans casser celle-ci.

**On note la version du jeu avec chaque sauvegarde.** Elle ne sert à rien aujourd'hui, mais un combat ne se rejoue à l'identique qu'avec la version du moteur qui l'a produit : sans cette information, les données d'aujourd'hui seraient inutilisables pour les étapes suivantes.

## 5. La synchronisation : local d'abord

Le principe : **le `localStorage` reste la copie de travail.** Le jeu fonctionne comme aujourd'hui, connecté ou non, et le compte ajoute seulement la sauvegarde en ligne.

- **Sans compte** : rien ne change. Le jeu reste jouable en invité, entièrement en local.
- **Première connexion sur un appareil** :
  - le compte est vide : on envoie les données de l'appareil (**import** de l'historique existant, on ne perd rien) ;
  - l'appareil est vide : on récupère celles du compte ;
  - les deux sont remplis : **un écran de choix**, une fois, clé par clé (« garder celle de cet appareil » ou « celle du compte », avec le nombre de matchs et la date de chaque côté). On ne fusionne pas deux historiques : les totaux par personnage sont cumulés et ne se recomposent pas à partir des matchs.
- **Ensuite** : à chaque fin de match, de tournoi ou d'étape de campagne, l'envoi part en arrière-plan, groupé (pas un envoi par combat simulé). À l'ouverture du jeu, on récupère la version du compte si elle est plus récente.
- **Deux appareils en même temps** : le plus récent gagne, clé par clé. Pour un jeu entre amis, c'est suffisant ; on le dit dans l'écran de compte.
- **Hors ligne ou serveur indisponible** : le jeu continue en local, l'envoi est retenté plus tard, et un petit indicateur le montre. **Le VPS en panne ne casse jamais le jeu.**

## 6. L'interface

Dans les règles du projet : un jeu vidéo, pas une page web ; contrôles du kit seulement (`src/components/kit.tsx`, glyphes de `BattlerIcon`) ; aucun emoji.

- **Accueil** : un bouton « Se connecter » du kit ; une fois connecté, une pastille avec le nom du joueur (sa photo Google est un contenu, pas une commande, donc admise dans la pastille, pas dans un bouton).
- **Écran du compte** (menu superposé) : nom, état de la synchronisation (« à jour », « en attente », « hors ligne »), « Se déconnecter », « Supprimer mes données en ligne ».
- **Écran de choix** de la première connexion (§ 5).
- **Compte non invité** (si la liste d'invités est retenue, § 8) : un message clair, le jeu reste jouable en invité.
- Une **page courte « Ce qu'on garde »** : e-mail, nom, sauvegardes ; où (en Suisse) ; comment tout supprimer.

**Limite connue** : la connexion Google se fait mal sur le navigateur d'une télévision. Le premier objectif vise l'ordinateur et la tablette ; la télé reste jouable en invité.

## 7. La sécurité, à la mesure du projet

- L'API n'accepte que les requêtes avec un jeton valide, et n'écrit que chez le joueur du jeton.
- Taille maximale d'une sauvegarde (par exemple 1 Mo), et un nombre limité de requêtes par minute et par joueur.
- L'API n'écoute que derrière Caddy ; seuls les ports 22, 80 et 443 sont ouverts (pare-feu).
- SSH par clé seulement ; mises à jour de sécurité automatiques du système.
- L'API tourne comme un service système avec son propre utilisateur, séparé du cache et du poller météo.
- **Sauvegarde quotidienne** du fichier SQLite, avec copie hors du VPS (sinon une panne du disque efface tous les historiques).
- Le domaine du jeu est déclaré dans Firebase (« domaines autorisés »), pour que la connexion ne fonctionne que depuis lui.

## 8. Mise en ligne et environnement de développement

- **Déploiement** : construire le jeu en local (`npx vite build`), envoyer `dist/` sur le VPS ; mettre l'API à jour en même temps. Un seul script, pour que le jeu et l'API soient toujours déployés ensemble.
- **Le développement ne change pas** : sans adresse d'API configurée, le jeu reste entièrement local. Le serveur de dev, `logs/combats/`, `npm run logs` et les deux machines continuent comme aujourd'hui.
- **Le serveur de dev ne parle pas à l'API de production** par défaut, pour ne pas mélanger tes parties de test avec ton historique en ligne.

## 9. Décisions à prendre, et vérifications à faire

### Décisions de l'utilisateur

| | Question | Proposition de l'agent |
| --- | --- | --- |
| D1 | **Ouvert ou sur invitation ?** N'importe quel compte Google, ou une liste d'e-mails autorisés ? | **Sur invitation** : une liste d'e-mails dans la configuration de l'API. Le lien peut circuler sans que des inconnus créent des comptes |
| D2 | **L'adresse** : un domaine ou un sous-domaine (par exemple `battler.<ton-domaine>`) ? | un sous-domaine d'un domaine que tu as déjà |
| D3 | **Le jeu lui-même est-il public ?** Ou seulement visible après connexion ? | public : le mode invité marche, seules les sauvegardes en ligne demandent un compte |
| D4 | **Réviser le principe 6** de `INTENTION.md` (« Pas de serveur ni de compte ») | le réécrire en « **Local d'abord.** Le jeu marche sans compte ni serveur ; un compte ajoute la sauvegarde en ligne » |
| D5 | **La campagne en cours se synchronise-t-elle ?** | oui (§ 4) ; à confirmer, car reprendre une partie sur un autre appareil en change un peu l'usage |
| D6 | **Les droits sur les images et les sons** : tes abonnements ChatGPT et ElevenLabs autorisent-ils une diffusion publique, même entre amis ? | à vérifier de ton côté avant la mise en ligne |

### Vérifications sur le VPS (à faire par l'utilisateur, ou par l'agent avec un accès)

- système installé et version ; Node déjà présent ou non ;
- mémoire et disque libres avec le cache et le poller en marche (`free -h`, `df -h`) ;
- un serveur web déjà en place (ports 80 et 443 pris ?) : Caddy peut aussi servir les autres usages ;
- trafic inclus et débit dans la formule Infomaniak.

## 10. Les étapes

Chaque étape se livre et se vérifie seule, et le jeu reste jouable à chaque étape.

| Étape | Contenu | Résultat pour les amis |
| --- | --- | --- |
| **0. Préalables** | décisions D1 à D6 ; vérifications du VPS ; création du projet Firebase (connexion Google seule) ; domaine | rien encore |
| **1. Mise en ligne statique** | Caddy sur le VPS, HTTPS, script de déploiement | **le jeu est partageable par un lien**, avec un historique local à chaque appareil. Premier objectif à moitié atteint, sans compte |
| **2. Couche de stockage** | dans le jeu, un seul point d'accès aux sauvegardes à la place des appels directs au `localStorage` (`history.ts`, `campaign.ts`), avec ses tests ; aucun changement visible | rien de visible |
| **3. Connexion** | Firebase Auth, bouton et écran du compte | on se connecte, rien n'est encore synchronisé |
| **4. API et base** | API Node, SQLite, vérification du jeton, liste d'invités, limites, service système | — |
| **5. Synchronisation** | import à la première connexion, écran de choix, envois groupés, reprise hors ligne, indicateur | **premier objectif atteint** : l'historique suit le compte |
| **6. Solidité** | sauvegarde quotidienne, surveillance simple (le service tourne-t-il ?), suppression des données, page « Ce qu'on garde » | — |

Les étapes 1 et 2 ne dépendent pas de Firebase : on peut les faire tout de suite.

### Plus tard, hors du premier objectif

Dans l'ordre où ils s'appuient les uns sur les autres :
1. **Remonter les combats** (graine, version, combattants, reliques) dans une table des matchs, pour mesurer l'équilibre sur des parties réelles et les rejouer avec `npm run logs`.
2. **Les salons de paris sur téléphone** (modèle Jackbox : la télé affiche, les téléphones parient), par WebSocket sur le VPS. **Condition** : le serveur tire la graine et calcule les cotes, et ne les révèle qu'après la clôture des mises ; sinon la graine donne l'issue et les cotes ne sont plus cachées. Le moteur tourne en Node, donc le serveur peut importer `src/game/` tel quel.
3. **Les classements et le PvP asynchrone**, avec un serveur qui fournit les graines et rejoue les combats déclarés.

## 11. Documents à mettre à jour à la livraison

- `INTENTION.md` § 6 (décision D4), puis le résumé de `CLAUDE.md` ;
- `ARCHITECTURE.md` : la couche de stockage, l'API, le déploiement ;
- `FEATURES.md` : une section « Compte et sauvegarde en ligne » ;
- `ETAT.md`, `CHANGELOG.md`, `package.json` à chaque étape livrée ;
- ce document : les décisions prises et ce qui a été mesuré sur le VPS.
