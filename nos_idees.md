# 💡 Boîte à Idées - Miara-Dia 🚙🇲🇬

---

> [!CAUTION]
> ## 🚫 ZONE INTOUCHABLE — MOTEUR DE PAIEMENT SMS AUTOMATIQUE
>
> **NE JAMAIS MODIFIER les fichiers suivants sans autorisation explicite du chef de projet :**
>
> - `supabase/functions/sms-webhook/index.ts` — La fonction Edge de validation automatique
> - La table `bookings` dans Supabase (colonnes : `payment_status`, `payment_reference`, `payment_validated_at`, `payment_sms_body`)
> - La table `sms_logs` dans Supabase
> - La publication Realtime `supabase_realtime` sur la table `bookings`
> - Le composant de polling dans `app/ride/[id].tsx` (interval de 3 secondes côté passager)
>
> **Pourquoi ?** Ce système a été validé après 3 jours de travail intensif (Sessions 14→19). Il gère le cœur de la monétisation de l'application : la validation automatique "zéro-clic" des paiements Mobile Money (MVola / Orange Money / Airtel Money) via interception de SMS + Webhook Supabase + Realtime. **Toute modification non testée peut casser l'intégralité du flux de réservation et de paiement.**
>
> ✅ **Ce système fonctionne parfaitement en production. NE PAS Y TOUCHER.**

---

Ce document recense les idées d'amélioration et les futures fonctionnalités pour rendre l'application encore plus puissante et adaptée au contexte malgache.

> [!IMPORTANT]
> **Règle d'Or de l'Intégration :** Toute nouvelle idée de fonctionnalité validée et implémentée doit impérativement être déclinée de manière optimale sur **version téléphone** et **version ordinateur**.

---

## ✅ DÉJÀ RÉALISÉ

### Monétisation & Prix
- [x] **Validation Automatique SMS Mobile Money *(RÉALISÉ - S14)* :** Système de détection automatique des SMS MVola/Orange/Airtel Money via l'app SMS Gateway + Supabase Edge Function `sms-webhook`. Parsing des SMS, comparaison des références, déverrouillage automatique du contact chauffeur et décrémentation des places. Zéro intervention manuelle. Table `sms_logs` pour audit complet.
- [x] **Persistance Passerelle SMS en Arrière-Plan *(RÉALISÉ - S16)* :** L'écoute SMS de l'administrateur reste active même lors de la navigation dans l'application grâce à un état global persistant sauvegardé avec `AsyncStorage`.
- [x] **Sécurisation Blindée des Paiements *(RÉALISÉ - S16)* :** Le numéro du conducteur reste strictement verrouillé (statut `pending`) jusqu'à ce que la passerelle SMS valide officiellement la transaction en base de données.
- [x] **Parseur SMS MVola Real-Format *(RÉALISÉ - S16)* :** Mise à jour des regex de la passerelle SMS pour détecter avec précision le format réel des SMS MVola malgaches (montants avec espaces `1 100 Ar` et références sans deux-points `Ref 1710288383`).
- [x] **Déploiement Webhook & Test Réel 100% Validé *(RÉALISÉ - S19)* :** Résolution définitive du blocage de la validation automatique. La fonction Edge `sms-webhook` est déployée en production sur Supabase avec un algorithme de matching ultra-robuste. Test de bout en bout réussi.
- [x] **Activation du Realtime Supabase sur `bookings` *(RÉALISÉ - S19)* :** Résolution de la stagnation du spinner "Vérification en cours..." sur le navigateur web. L'activation de la table `bookings` dans la publication `supabase_realtime` permet le rafraîchissement réactif instantané de l'interface client dès la validation du paiement en base de données.

### Expérience Utilisateur (UX)
- [x] **Design SaaS Ultra Pro** : Formulaires en Split-Screen, ombres douces et carrousel d'images automatisé.
- [x] **Interface Desktop "Ultra Pro"** : Navigation responsive, header professionnel et mise en page SaaS à 100% (Accueil, Recherche, Login, Chat, Profil, Mes Voyages).
- [x] **Copie conforme BlaBlaCar sur ordinateur** : Structure dual-pane double colonne sur l'ensemble des parcours (Recherche, Détails, Publication, Voyages, Profils).
- [x] **Polissage de l'Expérience Utilisateur** : Suppression complète et absolue des rectangles de focus navigateur (`outlineStyle: 'none'`) et mise en place d'un affichage des destinations en deux lignes majuscules compactes.
- [x] **Boutons "x" d'Effacement Rapide** : Ajout de boutons de croix interactives pour vider instantanément les inputs de lieux.
- [x] **Correctif d'Alignement Vertical** : Utilisation de conteneurs ScrollView sur ordinateur pour éviter que les éléments importants (logos, boutons) soient poussés hors de l'écran.
- [x] **Sélecteurs de Dates Universels Hybrides & Ergonomie (S13) 💻📱** : Remplacement du libellé par défaut "Aujourd'hui" par "Départ" sur ordinateur et mobile. Résolution de l'incompatibilité de DateTimePickerModal sur ordinateur (Web) par l'utilisation d'overlays HTML transparents (`input type="date"` et `input type="datetime-local"`) dotés d'un index d'empilement élevé.
- [x] **Alertes Premium CustomAlert *(RÉALISÉ - S14)* :** Remplacement universel de tous les `Alert.alert` natifs par un composant `CustomAlert` modal animé professionnel.
- [x] **Badge "Super Driver" Dynamique *(RÉALISÉ - S20)* :** Calcul du badge en temps réel basé sur le nombre d'avis (>= 5) et la moyenne des notes (>= 4.5/5) directement au chargement du profil et de la carte trajet.
- [x] **Refonte Premium UI (S20/S22) ✨ :** Mise en place du système "Dark Hero Header" sur tous les écrans. Sur ordinateur, réduction de la hauteur du Hero (600px -> 480px) pour garantir que la barre de recherche (Départ/Arrivée) soit immédiatement visible "above the fold" sur tous les écrans sans scroller. Structure aérée avec conteneurs arrondis (`borderRadius: 24`), ombres douces et fix des problèmes de superposition Z-index (`zIndex`) pour un rendu parfait sur bureau et mobile.
- [x] **Dashboard Administrateur Exhaustif Premium (S22) 📊 :** Refonte totale du Kiosque avec un design SaaS "Glassmorphism/Neumorphism". Intégration d'animations fluides "façon pompe à essence" sur les compteurs financiers, de cartes de CA Global dégradées, d'un calendrier de simulation interactif, et de logos opérateurs (MVola, Airtel, Orange) pour le détail des transactions.
- [x] **Optimisation Densité Mobile & Compression (S20) ⚡ :** Réduction fine des marges (`paddingTop`, `paddingBottom`, `marginTop`) des en-têtes "Dark Hero Header" sur les petits écrans (ex: iPhone SE) pour prioriser l'information vitale sans nécessiter de scroll excessif. Augmentation agressive de la compression des photos de profil (300px, 40% JPEG) pour une taille d'application et des temps de chargement records.
- [x] **Crédits de Bienvenue / Freemium (S23) 🎁 :** Implémentation d'un système d'acquisition offrant 5 trajets gratuits aux nouveaux inscrits (`free_unlocks`). Contourne totalement la passerelle SMS et débloque le contact instantanément pour prouver la valeur de l'application sans friction.
- [x] **Vérification d'Identité KYC (S24) 🛡️ :** Formulaire complet de téléversement des pièces d'identité (CIN malgache) avec auto-formatage des dates, auto-validation instantanée pour minimiser la friction d'acquisition, et sécurisation RLS sur Supabase.
- [x] **Centre de Contrôle KYC Administrateur (S24) 📊 :** Tableau de bord Kiosque ultra-premium permettant à l'administrateur de visualiser et d'auditer toutes les demandes (photos recto/verso) avec possibilité de rejeter les faux profils.
- [x] **Refonte Barre d'Actions & Grille Profil (S25) 💻📱 :** Optimisation de la structure du profil utilisateur avec une grille à 3 colonnes sur Desktop. Déplacement des actions principales (Enregistrer, Déconnexion, Supprimer) dans une barre d'outils ("Toolbar") fluide située sous le Hero Header, alignée parfaitement avec le bouton "Validation Kiosque" des administrateurs.
- [x] **Rafraîchissement Instantané Mobile (S25) ⚡ :** Remplacement de `useEffect` par `useFocusEffect` (Expo Router) dans le profil. Les modifications (formulaires, validations KYC) apparaissent de manière instantanée à chaque ouverture de l'onglet sans nécessiter de recharger manuellement la page. Ajout d'un garde `hasLoaded.current` pour éviter les rechargements répétitifs qui ralentissaient le mobile.
- [x] **Répertoire des Chauffeurs Vérifiés (S26) 📣 :** Création de la page `/admin/users` accessible depuis le Kiosque, listant tous les profils avec `kyc_status = 'verified'` avec design ultra-premium (cartes, photo, badge vert, lien vers profil public).
- [x] **Correction Erreur KYC PGRST200 (S26) 🔧 :** Remplacement de la jointure Supabase qui échouait (`user:profiles!user_id`) par deux requêtes séparées avec fusion locale en mémoire, contournant l'absence de Foreign Key déclarée entre `kyc_applications` et `profiles`.
- [x] **Correction Erreur TypeScript KYC TS7053 (S26) 🔧 :** Ajout du typage strict `(acc: Record<string, any>)` dans la boucle `reduce()` du Centre KYC.
- [x] **Écouteur Global Auth `SIGNED_OUT` dans `_layout.tsx` (S26) 🔒 :** Ajout d'un `supabase.auth.onAuthStateChange` au niveau du Root Layout. Dès que la session est invalide (signOut), la redirection vers `/login` est automatiquement déclenchée via `window.location.href` (web) ou `router.replace` (mobile). Correction du `CustomAlert` (suppression du `setTimeout 150ms`) pour appeler `onPress` immédiatement.

### ⚡ Optimisations de Performance Mobile (S27 — 12 Juin 2026)
- [x] **Fix Bug Timer Carousel *(RÉALISÉ - S27)* :** Le timer du carousel se recréait à **chaque render** car `activeIndex` et `width` étaient des dépendances du `useEffect`. Corrigé via des **refs** (`activeIndexRef`, `widthRef`) et un tableau de dépendances vide `[]`. Le timer est désormais créé **une seule fois** au montage. Fix appliqué dans `welcome.tsx` ET `(tabs)/index.tsx`.
- [x] **Memoïsation `RideCard` avec `React.memo` *(RÉALISÉ - S27)* :** Le composant `RideCard` était re-rendu à chaque scroll de la liste. Encapsulé dans `React.memo` avec un comparateur custom (`prev.ride.id`, `seatsLeft`, `isDesktop`, `onPress`). Divise par 10+ le nombre de re-renders en liste.
- [x] **`handleBooking` memoïsé avec `useCallback` *(RÉALISÉ - S27)* :** Le callback de navigation vers le détail trajet était recréé à chaque render, cassant l'effet du `React.memo` sur `RideCard`. Corrigé avec `useCallback([router])`.
- [x] **Suppression des `console.log` en production *(RÉALISÉ - S27)* :** Suppression de 6 `console.log` dans `resultats-recherche.tsx` et `distanceService.ts`. Chaque appel `console.log` bloque le thread JavaScript principal sur Android/iOS.
- [x] **`usePlatformStats` — Chargement Différé *(RÉALISÉ - S27)* :** Les 2 requêtes DB (comptage rides + profiles) ne sont plus exécutées au démarrage. Un délai de **3 secondes** (mobile) ou 500ms (desktop) est appliqué pour ne pas concurrencer l'auth Supabase lors du cold start. Valeurs statiques affichées immédiatement (1500+, 120+, 5800+).
- [x] **Fix Spinner Infini `/publish` *(RÉALISÉ - S27)* :** Le formulaire de publication était **entièrement bloqué** par `checkingAuth = true` en attendant 2 requêtes réseau séquentielles (getSession + profiles.select). Corrigé : **formulaire visible immédiatement**, auth vérifiée en arrière-plan non-bloquant.
- [x] **Timeout 5s sur API Distance *(RÉALISÉ - S27)* :** Les appels aux APIs Nominatim (OpenStreetMap) et OSRM n'avaient **aucun timeout**. Sur réseau mobile lent, ils pouvaient bloquer indéfiniment. Ajout d'`AbortController` avec timeout de 5 secondes sur les deux.
- [x] **Headers de Cache Vercel *(RÉALISÉ - S27)* :** Configuration de `vercel.json` avec des headers `Cache-Control` agressifs : assets JS/CSS mis en cache **1 an** (`immutable`), images PNG 7 jours. La 2ème visite sur mobile est quasi-instantanée car rien n'est re-téléchargé.
- [x] **`CAROUSEL_DATA` sorti des composants *(RÉALISÉ - S27)* :** Les tableaux de données du carousel étaient définis **à l'intérieur** des fonctions composant, recréant de nouveaux tableaux à chaque render. Déplacés en constantes globales hors du composant.

---

## 🌟 Points Forts Actuels (Avantages Compétitifs)

| # | Point Fort | Impact |
|---|---|---|
| 1 | **Paiement Mobile Money Zéro-Clic** | Validation SMS Gateway entièrement automatique. Unique sur le marché malgache. |
| 2 | **Onboarding Freemium (5 crédits)** | L'utilisateur a une expérience gratuite et immédiate dès la 1ère inscription. |
| 3 | **Parité Desktop/Mobile parfaite** | Interface SaaS premium réactive sur toutes tailles d'écran. Très rare localement. |
| 4 | **Sécurité KYC + Anti-Fraude Bio** | Badge de confiance + détection des tentatives de contournement dans la bio. |
| 5 | **Temps Réel absolu (Realtime + useFocusEffect)** | Aucun rechargement manuel requis. Données toujours fraîches. |
| 6 | **Zéro dépendance API payante** | CartoDB (gratuit) + OSRM (gratuit) + SMS Gateway (gratuit). |
| 7 | **Dictionnaire Madagascar intégré** | Distances/durées pré-calculées pour toutes les RN sans réseau. |
| 8 | **CI/CD Automatique Vercel** | Chaque `git push` = mise en production en 2 minutes. |
| 9 | **Performance Mobile Optimisée (S27)** | Timer carousel fixe, RideCard memoïsé, cache Vercel 1 an, spinner bloquant supprimé. |
| 10 | **Mode Hors-Ligne** | Billets et contacts consultables sans réseau sur les routes nationales. |

---

## ⚠️ Points Faibles Identifiés

| # | Point Faible | Priorité | Solution Future |
|---|---|---|---|
| 1 | **Dépendance téléphone admin** 🔴 | CRITIQUE | Si batterie vide → paiements non validés. Solution : API MVola Telma (B2B, coûteux). |
| 2 | **Paiement Gating (10%) pas Séquestre** 🟠 | IMPORTANT | Le chauffeur n'a aucune garantie financière de présence. Solution : paiement 100% in-app en séquestre. |
| 3 | **Souscriptions WebSocket multiples** 🟡 | MODÉRÉ | Chaque écran crée ses propres souscriptions Realtime. Risque fuite mémoire longue session. Solution : Context global. |
| 4 | **Pas de support Malagasy** 🟡 | MODÉRÉ | App 100% en français. Les chauffeurs de brousse parlent malagasy. Solution : i18n. |
| 5 | **Bundle JS 2.33 MB** 🟡 | MODÉRÉ | Le bundle principal est très lourd pour le cold start sur 3G. Solution : Code Splitting / lazy imports. |
| 6 | **Surveillance Responsive** 🟢 | MINEUR | Tester sur Galaxy Fold, tablettes, écrans <320px. |
| 7 | **Message automatique post-validation manquant** 🟢 | MINEUR | Après validation paiement, envoyer auto un message chat "Le passager va vous appeler". |

---

## ⏳ À ACCOMPLIR

### 🗺️ Géographie & Itinéraires
- [ ] **Détection d'embouteillages (Tana)** : Intégrer une alerte ou une estimation de temps supplémentaire pour les axes saturés (ex: Anosizato, 67ha).
- [ ] **Axe Fluvial** : Ajouter la possibilité de publier des trajets en bateau (ex: Canal des Pangalanes ou traversées vers Sainte-Marie / Nosy Be).
- [ ] **Points de Repère (Points of Interest)** : Permettre aux conducteurs d'ajouter des points de repère connus (ex: "Arrêt devant Station Galana") au lieu de simples noms de communes.
- [ ] **Météo des Routes** : Alerte sur l'état des pistes en saison des pluies (ex: "Piste RN5 difficile actuellement").
- [ ] **Trajets Courtes Distances / Intra-District (Taxi Communautaire)** : Proposer une option pour les trajets quotidiens (Maison-Travail-Maison). Un conducteur publie son trajet matin/soir, et les gens de son quartier peuvent rentrer avec lui.
- [ ] **Sortie de Famille / Privatisation** : Ajouter une catégorie où les voyageurs cherchent spécifiquement à privatiser une voiture pour une sortie de famille (frais de publication spécifique, ex: 1 000 Ar).

### 💰 Monétisation & Prix
- [ ] **Tarification au km automatique** : Proposer un prix suggéré au chauffeur dès qu'il entre son trajet, basé sur les prix moyens du marché malgache.
- [ ] **Paiement In-App complet** : Passer d'un gating de contact à une réservation avec séquestre (l'argent est gardé par l'app jusqu'à l'arrivée).
- [ ] **Intégration API MVola Officielle *(EN PAUSE)* :** L'intégration de l'API B2B Telma est très onéreuse à Madagascar. La **Passerelle SMS** développée reste donc notre solution principale et stratégique à long terme pour la validation automatique et gratuite des paiements.
- [ ] **Abonnement Premium Chauffeur** : Permettre aux chauffeurs pro de payer un abonnement mensuel pour ne plus avoir de frais sur les réservations.
- [ ] **Offres d'Abonnement Passager (Accès Illimité Contacts)** : Proposer des abonnements pour les voyageurs réguliers au lieu de payer à chaque trajet :
  - **Hebdomadaire :** Affiche tous les numéros de conducteurs pendant une semaine entière sans surcoût.
  - **Mensuel :** Affiche tous les numéros de conducteurs pendant un mois entier.
- [ ] **Déverrouillage et Validité des Contacts** : Définir une règle métier précise : Combien de temps un contact reste-t-il déverrouillé après paiement ? (ex: 24h, 48h ou illimité pour le trajet donné). Doit-on payer pour chaque contact ou y a-t-il une limite de contacts par paiement ?
- [ ] **Programme de Fidélité Voyageur (Bonus d'Activité) :** Récompenser les passagers fidèles pour stimuler l'activité.
- [ ] **Booster une Publication** : Option payante pour les chauffeurs permettant de mettre en avant (Boost) leur annonce de trajet en tête des résultats de recherche.
- [ ] **Publication de Location de Voiture :** Création d'une catégorie dédiée aux loueurs. Moyennant un petit frais de solidarité (1 000 Ar) payé par Mobile Money lors de la publication, l'annonce reste active pendant 24h.
- [ ] **Sortie en Famille / Voiture Privée :** Sous-catégorie spécifique pour les excursions ou sorties familiales privées. Frais de publication 1 000 Ar.

### 🤝 Communauté & Confiance
- [ ] **Groupes de Voyage** : Créer des groupes spécifiques (ex: "Voyageurs réguliers Tana-Antsirabe") pour fidéliser la clientèle.
- [ ] **Avis Audio** : Permettre de laisser un petit message vocal en guise d'avis (très utilisé à Madagascar).

### 📱 Expérience Utilisateur (UX)
- [ ] **Partage de Position Temps Réel** : Permettre au passager de partager son trajet avec ses proches pour plus de sécurité.
- [ ] **Support Multi-langue** : Malagasy complet (Vahinaly / Ofisialy) en plus du Français.
- [ ] **Micro-animations (Lottie)** : Ajouter des transitions fluides lors des chargements ou des validations de paiement.
- [ ] **Message Automatique Post-Validation :** Après validation SMS, envoyer automatiquement un message In-App du style : *"Une personne va vous appeler dans les minutes qui viennent."*

### 🏗️ Technique & Admin
- [ ] **Optimisation Realtime (Context Global)** : Centraliser la gestion des WebSockets Supabase (via un Context global) pour éviter les souscriptions multiples et améliorer les performances sur les sessions longues.
- [ ] **Code Splitting / Lazy Loading** : Réduire le bundle JS initial (2.33 MB) via des imports dynamiques (`React.lazy`) pour améliorer le cold start sur mobile 3G.
- [ ] **Appels In-App (VoIP)** : Intégrer un bouton d'appel direct via l'app (type Messenger) après déblocage du contact.
- [ ] **Dashboard Admin Mobile** : Une application simplifiée pour l'admin pour valider les paiements en déplacement.
- [ ] **Expiration Automatique Cron Supabase** : Ajouter un cron Supabase qui marque automatiquement les trajets expirés en base (pas seulement côté client).

---

## 🏗️ Architecture & Bonnes Pratiques (Clean Architecture)

Pour garantir la maintenabilité du code et éviter la dette technique, les 5 règles suivantes doivent être strictement respectées :

1. **Séparation des préoccupations (Custom Hooks) :** Ne jamais mélanger la logique de base de données (fetch, insert, requêtes Supabase, useEffect complexes) avec l'interface graphique (HTML/JSX). Toute la logique métier doit être extraite dans des "Custom Hooks" séparés qui retournent uniquement les données et les fonctions nécessaires.
2. **Composants Modulaires (Max 150-200 lignes) :** Si un composant (page) devient trop grand, le découper obligatoirement en sous-composants réutilisables.
3. **Gestion propre des Styles :** Éviter les immenses blocs de styles inline. Utiliser Tailwind CSS (NativeWind) ou des fichiers de styles séparés pour garder les composants lisibles.
4. **Typage strict (TypeScript) :** Utiliser des interfaces typées pour la base de données. Ne jamais utiliser le type `any`.
5. **Refactorisation continue (Boy Scout Rule) :** À chaque ajout de fonctionnalité, vérifier si le fichier cible est déjà trop chargé. Si c'est le cas, découper ou extraire la logique avant d'ajouter la nouvelle fonctionnalité.

---

## 📋 Règles de Documentation (Charte de Mise à Jour)

> - `nos_idees.md` : Idées futures et ce qui est déjà réalisé (Points forts/faibles)
> - `audit.md` : Rapport d'état de santé technique de l'app
> - `README.md` : Toutes les fonctionnalités actives de l'application
> - `plan.md` : Plan de conception et architecture technique
> - **Règle :** Après chaque modification, vérifier l'impact sur mobile ET desktop, et synchroniser ces 4 documents.

*Dernière mise à jour : 12 Juin 2026 - Session 27 : Optimisations Performance Mobile (fix timer carousel, memo RideCard, spinner /publish, cache Vercel)*
