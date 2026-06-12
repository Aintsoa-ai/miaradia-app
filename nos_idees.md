# 💡 Boîte à Idées - Miara-Dia 🚙🇲🇬

---

> [!CAUTION]
> ## 🚫 ZONE INTOUCHABLE — MOTEUR DE PAIEMENT SMS AUTOMATIQUE
> **NE JAMAIS MODIFIER les fichiers suivants sans autorisation explicite du chef de projet :**
> - `supabase/functions/sms-webhook/index.ts` — Fonction Edge de validation auto
> - La table `bookings` et `sms_logs` dans Supabase
> - La publication Realtime `supabase_realtime` sur la table `bookings`
> - Le polling dans `app/ride/[id].tsx`

---

Ce document recense les idées d'amélioration et les futures fonctionnalités pour rendre l'application encore plus puissante et adaptée au contexte malgache.

## ✅ DÉJÀ RÉALISÉ

### Monétisation & Prix
- [x] **Validation Automatique SMS Mobile Money *(RÉALISÉ - S14-S19)* :** Détection automatique SMS MVola/Orange/Airtel via webhook. Matching des références, déverrouillage du contact.
- [x] **Message & Notification Post-Validation *(RÉALISÉ - S28)* :** Dès la validation du paiement, un message In-App est généré ("Le passager va vous appeler...") ET le chauffeur reçoit instantanément une notification Push.
- [x] **Tarification Intelligente & Prédictive *(RÉALISÉ - S28)* :** Lors de la publication d'un trajet, l'application analyse les historiques réels de la route sélectionnée dans la DB pour pré-remplir un prix moyen, ou utilise une estimation de 150 Ar/km si la route est nouvelle.
- [x] **Crédits de Bienvenue / Freemium (S23) 🎁 :** Implémentation d'un système d'acquisition offrant 5 trajets gratuits aux nouveaux inscrits (`free_unlocks`).

### Expérience Utilisateur (UX)
- [x] **Design SaaS Ultra Pro & Parité Desktop/Mobile** : Navigation responsive, header professionnel et mise en page SaaS à 100%. Structure dual-pane double colonne sur ordinateur.
- [x] **Vérification d'Identité KYC & Répertoire (S24-S26) 🛡️ :** Formulaire de téléversement (CIN), validation Kiosque, badge "Super Driver" certifié, liste des chauffeurs vérifiés.
- [x] **Dashboard Administrateur Exhaustif Premium (S22) 📊 :** Kiosque Glassmorphism, animations compteurs, calendrier interactif, statistiques.
- [x] **Rafraîchissement Instantané Mobile (S25) ⚡ :** `useFocusEffect` pour synchronisation immédiate sans rechargement au changement d'onglet.

### ⚡ Optimisations de Performance & Infrastructure
- [x] **Fix Boucles de Rendu & Memoïsation (S27) :** Timer carousel fixe, `RideCard` sous `React.memo`, callbacks memoïsés.
- [x] **Suppression des Blocages (S27) :** `/publish` instantané sans spinner (auth asynchrone), Timeout sur API distance.
- [x] **Code Splitting & Lazy Loading (S28) 📦 :** Allègement extrême du premier chargement sur 3G. `CustomAlert`, `DesktopHeader`, API Notifications, et les `DateTimePickerModal` sont désormais chargés *à la demande* via `React.lazy` et `Suspense`.

---

## 🌟 Points Forts Actuels (Avantages Compétitifs)

| # | Point Fort | Impact |
|---|---|---|
| 1 | **Paiement Mobile Money Zéro-Clic** | Validation SMS Gateway entièrement automatique. Unique sur le marché malgache. |
| 2 | **Onboarding Freemium (5 crédits)** | Expérience gratuite immédiate dès la 1ère inscription pour acquérir de la confiance. |
| 3 | **Design Parité Desktop/Mobile** | Interface SaaS premium réactive sur toutes tailles d'écran (très rare localement). |
| 4 | **Tarification Intelligente (S28)** | Prix suggéré automatiquement basé sur l'historique réel des trajets. |
| 5 | **Temps Réel & Notifications** | `supabase_realtime` + Notifications Push automatiques au chauffeur lors d'un paiement. |
| 6 | **Dictionnaire Madagascar Local** | Distances/durées pré-calculées pour toutes les RN sans dépendre du réseau. |
| 7 | **Performance 3G Optimisée (S27/S28)** | Code Splitting (`React.lazy`), cache Vercel 1 an, rendus différés. |

---

## ⚠️ Points Faibles Identifiés

| # | Point Faible | Priorité | Solution Future |
|---|---|---|---|
| 1 | **Dépendance téléphone admin** 🔴 | CRITIQUE | Si batterie vide → paiements non validés. Solution : API MVola Telma (B2B). |
| 2 | **Paiement Gating (10%) pas Séquestre** 🟠 | IMPORTANT | Le chauffeur n'a aucune garantie financière de présence du client. Solution : paiement 100% in-app en séquestre. |
| 3 | **Bundle Central inévitable** 🟡 | MODÉRÉ | Le moteur React/Expo pèse ~2.3 MB malgré le lazy loading. Cache Vercel compense. |
| 4 | **Souscriptions WebSocket multiples** 🟡 | MODÉRÉ | Risque de fuite mémoire longue session. Solution : Context global Realtime. |
| 5 | **Pas de support Malagasy** 🟡 | MODÉRÉ | App 100% en français, inadapté pour les chauffeurs ruraux. Solution : i18n. |

---

## ⏳ À ACCOMPLIR (Nos Idées)

### 🗺️ Géographie & Itinéraires
- [ ] **Alerte Embouteillages (Tana)** : Estimation temps supplémentaire sur les axes saturés (ex: Anosizato).
- [ ] **Axe Fluvial** : Ajouter trajets en bateau (Pangalanes / Nosy Be).
- [ ] **Points de Repère** : "Arrêt devant Station Galana" au lieu du simple nom de ville.
- [ ] **Trajets Courtes Distances / Intra-District** : Covoiturage domicile-travail.
- [ ] **Météo des Pistes** : Alerte pluie/boue.

### 💰 Monétisation & Prix
- [ ] **Paiement In-App complet (Séquestre)** : Passer d'un gating de contact à une réservation intégrale.
- [ ] **Intégration API MVola Officielle *(EN PAUSE)* :** Remplacera la passerelle SMS à terme.
- [ ] **Abonnement Premium Chauffeur** : Frais fixes mensuels pour zéro commission.
- [ ] **Pass Voyageur (Accès Illimité)** : Abo hebdo/mensuel pour débloquer les numéros.
- [ ] **Booster une Publication** : Option payante pour placer l'annonce en tête de liste.
- [ ] **Catégorie Privatisation/Location** : Frais de publication spécifique pour sorties familiales.

### 🤝 Communauté & Confiance
- [ ] **Groupes de Voyage** : Ex: "Voyageurs réguliers Tana-Antsirabe".
- [ ] **Avis Audio** : Laisser un vocal en guise d'avis (culture malgache de l'oral).

### 📱 Expérience Utilisateur (UX)
- [ ] **Partage de Position Temps Réel** : Suivi de sécurité pour les proches.
- [ ] **Support Multi-langue** : Malagasy Vahinaly / Ofisialy.
- [ ] **Micro-animations (Lottie)** : Célébrations visuelles au succès du paiement.

### 🏗️ Technique & Admin
- [ ] **Optimisation Realtime Global (Context)** : Centraliser les WebSockets Supabase.
- [ ] **Appels In-App (VoIP)** : Bouton d'appel internet direct via l'app pour économiser du crédit appel.
- [ ] **Dashboard Admin Mobile** : Une App simplifiée pour le Kiosque sur téléphone.
- [ ] **Cron Expiration Trajets** : Edge Function quotidienne nettoyant les trajets expirés en base.

---

*Dernière mise à jour : 12 Juin 2026 - Session 28 : Code Splitting (React.lazy), Notification Push au paiement, Tarification intelligente (Moyenne DB/Distance).*
