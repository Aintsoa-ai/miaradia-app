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
- [x] **Refonte Premium UI (S20) ✨ :** Mise en place du système "Dark Hero Header" sur les écrans "Détails du trajet", "Profil Conducteur", "Messages" et "Mon Profil". Structure aérée avec conteneurs arrondis (`borderRadius: 24`), ombres douces et fix des problèmes de superposition Z-index (`zIndex`) pour un rendu parfait sur bureau et mobile.
- [x] **Optimisation Densité Mobile & Compression (S20) ⚡ :** Réduction fine des marges (`paddingTop`, `paddingBottom`, `marginTop`) des en-têtes "Dark Hero Header" sur les petits écrans (ex: iPhone SE) pour prioriser l'information vitale sans nécessiter de scroll excessif. Augmentation agressive de la compression des photos de profil (300px, 40% JPEG) pour une taille d'application et des temps de chargement records.

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

---

## ⏳ À ACCOMPLIR

### ⚠️ Points Faibles Identifiés lors de l'Audit S21

> Ces points ont été identifiés lors de l'audit complet du 8 Juin 2026 (Session 21). Ils sont classés par priorité d'impact.

- [ ] **🔴 CRITIQUE — Dépendance au Téléphone Administrateur (Kiosque) :** Tant que nous utilisons la "Passerelle SMS", l'application dépend de l'état de la batterie et de la couverture réseau du téléphone physique de l'administrateur. *Solution future : Intégrer l'API B2B officielle MVola Telma.*
- [x] **Expiration Automatique des Trajets *(RÉALISÉ - S21)* :** ~~Les trajets avec une date de départ passée continuent d'apparaître dans les résultats de recherche~~. Filtre actif dans la recherche + badge "Trajet terminé" + tri automatique en bas dans l'onglet conducteur. ✅
- [ ] **🟠 IMPORTANT — Absence de Mode Hors-Ligne (Offline) :** Sur les Routes Nationales, les voyageurs traversent des zones sans réseau. Ils ne peuvent pas consulter leur billet ou le numéro du chauffeur s'ils ferment l'app. *Solution future : SQLite/AsyncStorage pour mettre en cache les billets validés.*
- [x] **Configuration des Notifications Push *(RÉALISÉ - S21)* :** Liaison complète du Token de notification Expo et redirection lors du clic de l'utilisateur. Reste à coupler cela avec l'envoi push lors des messages de chat.
- [ ] **🟠 IMPORTANT — Paiement "Gating" vs "Séquestre" :** Le voyageur paie 10% pour débloquer le contact, mais le reste est payé en main propre. Le chauffeur n'a aucune garantie financière de présence. *Solution future : Paiement total en séquestre in-app.*
- [ ] **🟡 MODÉRÉ — Pas de KYC (Vérification d'Identité) :** Les conducteurs ne sont pas vérifiés officiellement par leur CIN. Un badge "Vérifié CIN" renforcerait la confiance. *Solution : Formulaire upload CIN + validation admin.*
- [ ] **🟡 MODÉRÉ — Souscriptions WebSocket Multiples :** Chaque écran crée ses propres souscriptions Supabase Realtime sans centralisation. Risque de fuite mémoire sur des sessions longues. *Solution : Créer un Context React global pour gérer un seul canal Realtime partagé.*
- [ ] **🟡 MODÉRÉ — Pas de Support Malagasy :** L'application est 100% en français. La majorité des utilisateurs potentiels (chauffeurs de brousse) parle malagasy. *Solution future : i18n avec les chaînes en malagasy officiel.*
- [ ] **🟢 MINEUR — Surveillance Continue Responsive :** Après la réduction de la bande bleue timeline (S21), surveiller l'affichage sur d'autres tailles d'écran (Galaxy Fold, tablettes). *Solution : Tests visuels réguliers.*
- [ ] **🟢 MINEUR — Widget Stockage Supabase :** Pas de visibilité sur l'espace de stockage restant pour les photos de profil dans le tableau de bord admin. *Solution : Widget intégré à la page Kiosque.*

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
- [ ] **Intégration API MVola Officielle *(PROCHAINE ÉTAPE)* :** Remplacer la solution SMS Gateway par l'API officielle Telma MVola pour une validation encore plus fiable et instantanée (nécessite un compte business Telma).
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
- [ ] **Vérification d'Identité (KYC)** : Permettre aux utilisateurs d'uploader leur CIN pour obtenir un badge "Profil Vérifié par CIN".
- [ ] **Groupes de Voyage** : Créer des groupes spécifiques (ex: "Voyageurs réguliers Tana-Antsirabe") pour fidéliser la clientèle.
- [ ] **Avis Audio** : Permettre de laisser un petit message vocal en guise d'avis (très utilisé à Madagascar).

### 📱 Expérience Utilisateur (UX)
- [ ] **Mode Hors-Ligne** : Permettre de consulter ses billets et les numéros de contact même sans connexion (utile sur les RN en zone d'ombre).
- [ ] **Partage de Position Temps Réel** : Permettre au passager de partager son trajet avec ses proches pour plus de sécurité.
- [ ] **Support Multi-langue** : Malagasy complet (Vahinaly / Ofisialy) en plus du Français.
- [ ] **Micro-animations** : Ajouter des transitions fluides (Lottie) lors des chargements ou des validations de paiement.

### 🏗️ Technique & Admin
- [x] **Notifications Push de Validation *(RÉALISÉ - S21)* :** Redirection instantanée au clic sur la notification et fiabilisation de l'EAS Project ID. Reste à déclencher pour le chat.
- [ ] **Appels In-App (VoIP)** : Intégrer un bouton d'appel direct via l'app (type Messenger) après déblocage du contact.
- [ ] **Dashboard Admin Mobile** : Une application simplifiée pour l'admin pour valider les paiements en déplacement.
- [ ] **Surveillance de Stockage Supabase :** Intégrer un widget directement sur la page Kiosque de l'administrateur affichant l'espace de stockage libre restant de la base de données Supabase.
- [ ] **Expiration Automatique des Trajets :** Un trajet ne doit plus apparaître dans les résultats de recherche dès que sa date de départ est passée.
- [ ] **Message Automatique Post-Validation :** Après qu'un paiement est validé et que le contact du conducteur est affiché, envoyer automatiquement un message In-App du style : *"Une personne va vous appeler dans les minutes ou secondes qui viennent."*
- [ ] **Optimisation Realtime** : Centraliser la gestion des WebSockets Supabase (via un Context global) pour éviter les souscriptions multiples et améliorer les performances.

---

## 📋 Règles de Documentation (Charte de Mise à Jour)

> - `nos_idees.md` : Idées futures et ce qui est déjà réalisé
> - `audit.md` : Rapport d'état de santé technique de l'app
> - `README.md` : Toutes les fonctionnalités actives de l'application
> - `plan.md` : Plan de conception et architecture technique
> - **Règle :** Après chaque modification, vérifier l'impact sur mobile ET desktop, et synchroniser ces 4 documents.

*Dernière mise à jour : 8 Juin 2026 - Session 21 (UI fixes + Audit complet + Expiration trajets + Fix push notifications)*
