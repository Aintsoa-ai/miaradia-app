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
- [x] **Rafraîchissement Instantané Mobile (S25) ⚡ :** Remplacement de `useEffect` par `useFocusEffect` (Expo Router) dans le profil. Les modifications (formulaires, validations KYC) apparaissent de manière instantanée à chaque ouverture de l'onglet sans nécessiter de recharger manuellement la page.

### 🌟 Points Forts Actuels (Avantages Compétitifs)
- **Zéro dépendance API payante** : Le système de validation SMS fait économiser les coûts B2B exorbitants des opérateurs à Madagascar.
- **Onboarding Magique** : Grâce aux 5 crédits gratuits, l'utilisateur a une expérience instantanée et gratifiante dès sa première utilisation.
- **Parité Totale Desktop/Mobile** : L'interface réagit parfaitement sur toutes les tailles d'écran avec un design premium (SaaS) très rare sur le marché local. La grille à 3 colonnes du profil exploite l'espace grand écran à merveille.
- **Sécurité et Confiance KYC** : Le système de vérification d'identité avec badge de confiance protège la communauté tout en conservant une acquisition rapide.
- **Dynamisme des Données** : Grâce aux écoutes Realtime et à `useFocusEffect`, l'application garantit une sensation de réactivité et de temps réel absolu (pas de page à recharger).

### Technique & Admin
- [x] **Système d'Avis & Réputation** : Permettre aux passagers de noter les chauffeurs.
- [x] **Sécurité des Profils** : Politique de photo réelle et choix du rôle.
- [x] **Validation Téléphone Complète 📱** : Tous les boutons mobiles (swap, autocomplétion, recherche, retour, onglets) validés fonctionnels et ergonomiques sous émulation mobile.
- [x] **Précision GPS & Toby Ratsimandrava 📍** : Mappage intelligent du Toby Ratsimandrava / Ambohijanahary Andrefana sur la bonne zone (Ouest Ambohijanahary) en traduisant les synonymes de direction (`Andrefana` -> `Ouest`), avec correctif de nettoyage sur "Renivohitra" (S10) pour bannir les fausses correspondances vers "Ivohitra (Antsirabe I)", support des graphies abrégées ("ambohijary"), et mappage automatique des noms français/coloniaux.
- [x] **Correctif Faille API Chat 💬** : Verrouillage asynchrone dans `app/chat/[id].tsx` et rectification de la transmission du nom de profil dans `app/ride/[id].tsx` pour éradiquer les erreurs `400 Bad Request` Supabase.
- [x] **Résolution Faille RLS Générateur Démo 🛠️** : Déplacement de la logique à l'intérieur du composant `AdminDashboard` de `app/admin/index.tsx` pour lier dynamiquement les trajets générés au `driver_id` de l'administrateur connecté.
- [x] **Correctif de Sécurité des Sérialisations NativeWind v4 (S12) 🛡️ :** Mise en place de blocs de détection `try/catch` sur le compilateur de NativeWind v4 pour neutraliser les crashs fatals liés aux références circulaires de navigation.
- [x] **Synchronisation automatique `auth.users` ↔ `profiles` *(RÉALISÉ - S16)* :** Mise en place d'un Trigger SQL sur Supabase assurant la création automatique et instantanée du profil public d'un nouvel utilisateur dès son inscription.
- [x] **Correction Permissions Android 8+ SMS *(RÉALISÉ - S17)* :** Implémentation du pop-up d'autorisation système natif `PermissionsAndroid.request` obligatoire depuis Android 6.0 pour débloquer l'écoute silencieuse en arrière-plan de l'application Admin Kiosque.
- [x] **Auto-Rafraîchissement Bilan Client *(RÉALISÉ - S17)* :** Mise en place d'un radar de scrutation (polling) toutes les 3 secondes côté passager. Le contact du chauffeur s'affiche instantanément dès la validation SMS.
- [x] **Auto-Rafraîchissement Kiosque Admin *(RÉALISÉ - S17)* :** Actualisation silencieuse en arrière-plan toutes les 5 secondes du tableau de bord Kiosque pour détecter instantanément l'arrivée de nouveaux paiements.
- [x] **Correction Historique Web *(RÉALISÉ - S17)* :** Fiabilisation de la flèche de retour (<-) sur Vercel/Web via un bloc de sécurité `try/catch` sur `router.canGoBack()` évitant les crashs.
- [x] **Actualisation Instantanée "Mes Trajets" *(RÉALISÉ - S18)* :** Utilisation de `useFocusEffect` sur la page "Mes Trajets" du conducteur. Dès qu'il revient sur l'onglet après publication, la liste se recharge automatiquement.
- [x] **Correctif UI Bande Bleue \& Contenu Caché *(RÉALISÉ - S21)* :** Sur l'écran Détails du Trajet (`app/ride/[id].tsx`), réduction de la largeur de la colonne timeline verticale bleue (`width: 56 → 44`, `marginRight: 16 → 12`) pour libérer de l'espace horizontal. Augmentation du `paddingBottom` du `ScrollView` (`80 → 120`) pour rendre visible le badge "Bagages: Moyen" et les équipements du véhicule sur les petits écrans mobiles.
- [x] **Expiration Automatique des Trajets Passés *(RÉALISÉ - S21)* :** Dans les résultats de recherche (`resultats-recherche.tsx`), filtre `isRideExpired()` actif : les trajets dont la date est antérieure à aujourd'hui sont exclus de l'affichage. Dans l'onglet "Je conduis" (`rides.tsx`), les trajets terminés affichent un badge gris "Trajet terminé", sont grisés (opacity 0.7) et triés automatiquement en bas de la liste — le conducteur garde son historique sans pollution visuelle.
- [x] **Configuration Officielle Notifications Push *(RÉALISÉ - S21)* :** Correction du `projectId` EAS officiel (`f2da6b63-f8d9-471a-8d58-252014dada76`) dans la configuration expo-notifications (`lib/notifications.ts`). Intégration d'un écouteur global de tap sur notification dans le Root Layout (`_layout.tsx`) redirigeant automatiquement le passager vers le détail de son voyage (`/ride/[id]`) dès validation de son paiement Mobile Money.
- [x] **Widget Stockage Supabase *(RÉALISÉ - S21)* :** Ajout d'un widget de supervision de la consommation d'espace disque des avatars (`supabase.storage.from('avatars').list()`) directement sur le tableau de bord administrateur (Kiosque).

---

## ⏳ À ACCOMPLIR

### ⚠️ Points Faibles Identifiés lors de l'Audit S21

> Ces points ont été identifiés lors de l'audit complet du 8 Juin 2026 (Session 21). Ils sont classés par priorité d'impact.

- [ ] **🔴 CRITIQUE — Dépendance au Téléphone Administrateur (Kiosque) :** L'application dépend de l'état de la batterie et de la couverture réseau du téléphone physique de l'administrateur. *Solution (API Telma) écartée pour des raisons de coût : la Passerelle SMS doit donc être maintenue comme solution robuste principale.*
- [x] **Expiration Automatique des Trajets *(RÉALISÉ - S21)* :** ~~Les trajets avec une date de départ passée continuent d'apparaître dans les résultats de recherche~~. Filtre actif dans la recherche + badge "Trajet terminé" + tri automatique en bas dans l'onglet conducteur. ✅
- [x] **Mode Hors-Ligne (Offline) *(RÉALISÉ)*** : Mise en cache via AsyncStorage des billets et du numéro du chauffeur pour consultation sécurisée sur les Routes Nationales (zones sans réseau) via `useMyRides` et `useRideDetails`.
- [x] **Notifications Push du Chat *(RÉALISÉ)*** : Couplage du Token Expo pour envoyer une notification push au destinataire lorsqu'il reçoit un nouveau message dans le chat (via le hook `useChat`).
- [ ] **🟠 IMPORTANT — Paiement "Gating" vs "Séquestre" :** Le voyageur paie 10% pour débloquer le contact, mais le reste est payé en main propre. Le chauffeur n'a aucune garantie financière de présence. *Solution future : Paiement total en séquestre in-app.*
- [ ] **🟡 MODÉRÉ — Souscriptions WebSocket Multiples :** Chaque écran crée ses propres souscriptions Supabase Realtime sans centralisation. Risque de fuite mémoire sur des sessions longues. *Solution : Créer un Context React global pour gérer un seul canal Realtime partagé.*
- [ ] **🟡 MODÉRÉ — Pas de Support Malagasy :** L'application est 100% en français. La majorité des utilisateurs potentiels (chauffeurs de brousse) parle malagasy. *Solution future : i18n avec les chaînes en malagasy officiel.*
- [ ] **🟢 MINEUR — Surveillance Continue Responsive :** Après la réduction de la bande bleue timeline (S21), surveiller l'affichage sur d'autres tailles d'écran (Galaxy Fold, tablettes). *Solution : Tests visuels réguliers.*

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
- [ ] **Publication de Location de Voiture :** Création d'une catégorie dédiée aux loueurs. Moyennant un petit frais de solidarité (1 000 Ar) payé par Mobile Money lors de la publication, l'annonce reste active pendant 24h. Les clients paieront également 1 000 Ar pour obtenir le contact du loueur.
- [ ] **Sortie en Famille / Voiture Privée :** Sous-catégorie spécifique pour les excursions ou sorties familiales privées (pas du covoiturage classique). Frais de publication 1 000 Ar. Le client intéressé paie de même pour obtenir le contact.

### 🤝 Communauté & Confiance
- [ ] **Groupes de Voyage** : Créer des groupes spécifiques (ex: "Voyageurs réguliers Tana-Antsirabe") pour fidéliser la clientèle.
- [ ] **Avis Audio** : Permettre de laisser un petit message vocal en guise d'avis (très utilisé à Madagascar).

### 📱 Expérience Utilisateur (UX)
- [x] **Mode Hors-Ligne *(RÉALISÉ)*** : Permet de consulter ses billets et les numéros de contact même sans connexion.
- [ ] **Partage de Position Temps Réel** : Permettre au passager de partager son trajet avec ses proches pour plus de sécurité.
- [ ] **Support Multi-langue** : Malagasy complet (Vahinaly / Ofisialy) en plus du Français.
- [ ] **Micro-animations** : Ajouter des transitions fluides (Lottie) lors des chargements ou des validations de paiement.

### 🏗️ Technique & Admin
- [x] **Notifications Push complètes *(RÉALISÉ)*** : Alertes push fonctionnelles pour la validation de paiement (S21) ET pour la messagerie instantanée (Chat).
- [ ] **Appels In-App (VoIP)** : Intégrer un bouton d'appel direct via l'app (type Messenger) après déblocage du contact.
- [ ] **Dashboard Admin Mobile** : Une application simplifiée pour l'admin pour valider les paiements en déplacement.
- [ ] **Expiration Automatique des Trajets :** Un trajet ne doit plus apparaître dans les résultats de recherche dès que sa date de départ est passée.
- [ ] **Message Automatique Post-Validation :** Après qu'un paiement est validé et que le contact du conducteur est affiché, envoyer automatiquement un message In-App du style : *"Une personne va vous appeler dans les minutes ou secondes qui viennent."*
- [ ] **Optimisation Realtime** : Centraliser la gestion des WebSockets Supabase (via un Context global) pour éviter les souscriptions multiples et améliorer les performances.

---

## 🏗️ Architecture & Bonnes Pratiques (Clean Architecture)

Pour garantir la maintenabilité du code et éviter la dette technique, les 5 règles suivantes doivent être strictement respectées :

1. **Séparation des préoccupations (Custom Hooks) :** Ne jamais mélanger la logique de base de données (fetch, insert, requêtes Supabase, useEffect complexes) avec l'interface graphique (HTML/JSX). Toute la logique métier doit être extraite dans des "Custom Hooks" séparés qui retournent uniquement les données et les fonctions nécessaires.
2. **Composants Modulaires (Max 150-200 lignes) :** Si un composant (page) devient trop grand, le découper obligatoirement en sous-composants réutilisables.
3. **Gestion propre des Styles :** Éviter les immenses blocs de styles inline. Utiliser Tailwind CSS (NativeWind) ou des fichiers de styles séparés pour garder les composants lisibles.
4. **Typage strict (TypeScript) :** Utiliser des interfaces typées pour la base de données. Ne jamais utiliser le type `any`.
5. **Refactorisation continue (Boy Scout Rule) :** À chaque ajout de fonctionnalité, vérifier si le fichier cible est déjà trop chargé. Si cest le cas, découper ou extraire la logique avant d'ajouter la nouvelle fonctionnalité.

---
## 📋 Règles de Documentation (Charte de Mise à Jour)

> - `nos_idees.md` : Idées futures et ce qui est déjà réalisé (Points forts/faibles)
> - `audit.md` : Rapport d'état de santé technique de l'app
> - `README.md` : Toutes les fonctionnalités actives de l'application
> - `plan.md` : Plan de conception et architecture technique
> - **Règle :** Après chaque modification, vérifier l'impact sur mobile ET desktop, et synchroniser ces 4 documents.

*Dernière mise à jour : 10 Juin 2026 - Session Polissage UI & Optimisation Focus Mobile*
