# Miara-Dia (Blabla Car Gasy) 🚙🇲🇬

> [!CAUTION]
> ## 🚫 ZONE INTOUCHABLE — MOTEUR DE PAIEMENT SMS AUTOMATIQUE
> **NE JAMAIS MODIFIER** : `supabase/functions/sms-webhook/index.ts`, les tables `bookings` et `sms_logs` dans Supabase, la publication Realtime `supabase_realtime`, et le polling passager dans `app/ride/[id].tsx`.
> Ce système de validation "zéro-clic" des paiements Mobile Money **fonctionne parfaitement en production** après 3 jours de travail. Toute modification non testée peut casser le cœur de la monétisation. ✅ **NE PAS Y TOUCHER.**

Application de covoiturage moderne dédiée aux routes nationales de Madagascar.

> [!IMPORTANT]
> **Charte de Développement Responsive (Règle d'Or) :** Toute mise à jour, développement de fonctionnalité ou correctif doit impérativement être pensé, testé et validé sur **les deux plateformes** :
> 1. **💻 Version Ordinateur (Desktop) :** Layout double colonne (dual-pane) ultra-pro, alignements fluides, pas d'outline focus, et boutons cliquables optimisés pour la souris.
> 2. **📱 Version Téléphone (Mobile) :** Rendu ergonomique et condensé d'une seule colonne, boutons tactiles larges, saisie adaptée au clavier virtuel, et en-têtes compacts sans débordement.
>
> Aucun compromis n'est accepté : la perfection visuelle doit être absolue sur les deux résolutions.

---

## 🚀 Fonctionnalités Opérationnelles (État : Stable ✅)

### 1. Authentification & Sécurité
- **Gating Strict :** Accès aux trajets et à la publication réservé aux membres.
- **Redirection Intelligente :** L'utilisateur est renvoyé automatiquement vers sa destination après connexion.
- **Zéro Espaces :** Nettoyage automatique (`.trim()`) des champs pour éviter les erreurs.

### 2. Moteur de Recherche Madagascar *(AMÉLIORÉ)*
- **Nomenclature Technique *(NOUVEAU)* :** Formatage automatique des sélections au format pro : `RN.Ville-Quartier` (ex: `RN1.Antananarivo-Alasora`).
- **Base de Données Géographique Complète *(NOUVEAU)* :** Base structurée en **6 Provinces → 23 Régions → 119 Districts → Communes → Fokontany** couvrant tout Madagascar, répartie en 7 fichiers optimisés (`constants/locations/`).
- **Autocomplétion Ultra-Précise *(AMÉLIORÉ)* :** Suggestions depuis la Province jusqu'au Fokontany/Quartier pour toutes les grandes villes (Antananarivo 6 arrondissements, Toamasina, Mahajanga, Fianarantsoa, Antsiranana, Toliara...).
- **Recherche Multi-Termes Tolérante *(NOUVEAU - SESSION 13)* :** Résolution définitive du bug de non-correspondance des requêtes de recherche ("sur ordinateur et sur téléphone ça n'arrive pas à trouver de trajet") provoqué par la différence entre les noms de quartiers/districts ultra-détaillés issus de l'autocomplétion (ex: "Antananarivo-Renivohitra (District)" ou "Analakely (Antananarivo I)") et les noms plus généraux enregistrés en base de données (ex: "Antananarivo"). Implémentation d'un extracteur de termes intelligent (`extractCleanSearchTerms`) qui décompose et nettoie les chaînes complexes en sous-termes (commune, district, quartier, numéro de route), et interroge Supabase avec des clauses `OR` multi-termes très tolérantes pour garantir 100% de trajets trouvés.
- **Recherche de Passages *(NOUVEAU)* :** Les voyageurs peuvent trouver des trajets même si leur destination est une **ville de passage (escale)** et non la destination finale du chauffeur.
- **Barre de Recherche Transparente & Sticky :** Barre de recherche intuitive avec un bouton "effacer" global (`x`) pour fluidifier l'expérience, qui reste visible ("Sticky") en haut de l'écran lors du défilement sur ordinateur.
- **Filtres de Véhicules :** Barre de filtres (Tout / Voiture / Minibus / Moto) avec compteurs dynamiques.
- **Filtres Avancés (Équipements) *(AMÉLIORÉ)*:** Modale complète permettant de filtrer par tri (prix, heure, durée), par statut vérifié, et par de nombreux équipements (Max. 2 à l'arrière, Réservation instantanée, Climatisation, Animaux acceptés, etc.).
- **Expiration des Trajets Passés *(NOUVEAU - SESSION 21)* :** Intégration du filtre `isRideExpired()` excluant automatiquement tous les trajets expirés (date de départ dépassée) des résultats de recherche.
- **Carte Interactive :** Bouton "Afficher sur la carte" qui ouvre Google Maps avec le trajet.
- **Escales & Tarifs :** Affichage des villes de passage et prix associés.
- **Sélecteur de Date Adaptatif (Web & Mobile) *(NOUVEAU - SESSION 13)* :** Remplacement du libellé par défaut "Aujourd'hui" par "Départ" en couleur grise de placeholder. Sur téléphone (application native), ouverture du calendrier système natif. Sur ordinateur/web de bureau et mobile web, superposition d'un input date HTML standard (`<input type="date">`) transparent dans un conteneur `<div>` avec déclenchement `.showPicker()`, assurant le fonctionnement fiable du calendrier du navigateur lors du clic sur le conteneur.

### 3. Calcul Automatique Distance & Durée *(AMÉLIORÉ)*
- **Dictionnaire Madagascar Prioritaire :** L'application vérifie *toujours* notre dictionnaire interne `lib/distancesMadagascar.ts` en premier. S'il connaît la route (ex: Tana-Toliara), il utilise les vraies durées adaptées à Madagascar.
- **API Temps Réel :** Si la route est inconnue de notre dictionnaire, l'app interroge **OpenStreetMap (Nominatim + OSRM)** en solution de secours.
- **Heure d'Arrivée Automatique *(NOUVEAU)* :** Calculée et remplie instantanément dès la saisie de la date/heure de départ : `Heure départ + Durée du trajet`. S'actualise en temps réel si l'on change la destination.

### 4. Formatage des Prix *(NOUVEAU)*
- **Séparateur de milliers :** Tous les prix sont formatés avec des espaces : `80 000 Ar`, `800 000 Ar`, `8 000 000 Ar`.
- **Couverture totale :** Appliqué sur **tous** les écrans (résultats, détail trajet, profil conducteur, admin, mes voyages, saisie conducteur).

### 5. Écran Résultats de Recherche *(REDESIGN)*
- **Carte de Trajet Propre :** Timeline verticale (départ → arrivée) avec distance et durée dans un badge.
- **Prix mis en avant :** Badge bleu avec prix formaté (ex: `10 000 Ar`).
- **Heure d'arrivée affichée :** Calculée automatiquement depuis l'heure de départ.
- **Conducteur clair :** Photo, note ⭐, badge "Super Driver" bien séparés.
- **Icône véhicule :** Moto ou voiture identifiés clairement.
- **Fond de Carte Madagascar :** Remplacement de l'API payante Google Maps par une tuile cartographique vectorielle (CartoDB Voyager) pour un fond de carte gratuit et esthétique.
- **Refonte UI des Filtres *(NOUVEAU)* :** Interface moderne style iOS avec des blocs de réglages groupés (Tri, Confiance, Équipements) et un accès repensé via une icône dans l'en-tête.
- **Alerte Bac Automatique *(NOUVEAU)* :** Détection intelligente des traversées fluviales avec affichage d'une icône ⛴️.
- **Politique de Bagages *(NOUVEAU)* :** Affichage visuel de la taille autorisée et de la présence d'une galerie sur l'annonce.

### 6. Publication de Trajet *(AMÉLIORÉ - SESSION 28)*
- **Tarification Intelligente *(NOUVEAU - S28)* :** Le système analyse la base de données en temps réel pour pré-remplir le prix suggéré en fonction de l'historique des trajets passés sur la même route, ou estime un tarif basé sur la distance (150 Ar/km).
- **Alerte Trafic & Météo *(NOUVEAU - S28)* :** Détection automatique des heures de pointe (Matin/Soir) sur les goulots d'étranglement de la capitale (Anosizato, By-pass). Affichage d'une alerte au chauffeur et ajustement automatique de l'heure d'arrivée (+45min).
- **Chargement Instantané (S27) :** Le formulaire s'affiche immédiatement sans spinner bloquant (auth asynchrone).
- **Itinéraire Intelligent & Exhaustif :** L'application connaît toutes les Routes Nationales (RN1 à RN44) et suggère des villes escales.
- **Gestion des Raccourcis (Transversales) :** Reconnaissance des routes transversales (ex: Faratsiho pour éviter Tana, Ambositra-Manja pour éviter Antsirabe).
- **Choix de l'Itinéraire :** Si plusieurs chemins sont possibles, le conducteur peut choisir son tracé préféré (ex: "Via Tana" ou "Via Raccourci") via des boutons de sélection.
- **Politique de Bagages *(NOUVEAU)* :** Sélection de la taille (Petit/Moyen/Gros) et switch "Galerie de toit" intégré à la publication.
- **Interface Épurée :** Remplacement de l'accordéon complexe par une liste de suggestions "One-Click". Un clic sur une suggestion l'ajoute ou la retire du trajet.
- **Calcul d'arrivée instantané :** Synchronisation totale entre date de départ, durée et heure d'arrivée estimée.
- **Géo-Désambiguïsation :** Résolution intelligente des noms de quartiers identiques (ex: Tanambao) en utilisant le contexte du district (Arrondissements en chiffres romains : Antananarivo II, IV, etc.).
- **Sélecteur de Date et Heure Adaptatif (Web & Mobile) *(NOUVEAU - SESSION 13)* :** Sur téléphone (application native), utilisation de DateTimePickerModal. Sur ordinateur/web de bureau, intégration d'un sélecteur date/heure natif HTML (`<input type="datetime-local">`) transparent, doté de `zIndex: 99999` pour une réactivité parfaite et immédiate au clic, sans gêner la disposition.

### 7. Espace Conducteur & Profil *(AMÉLIORÉ - SESSION 29)*
- **Support Multi-langue / i18n *(NOUVEAU - S29)* 🇲🇬 :** Implémentation d'un système de traduction bilingue natif (Français ↔️ Malagasy Andavanandro). Bascule instantanée de toute l'application via le bouton de langue dans le profil, sans rechargement lourd (gestion par Context React + AsyncStorage), pour inclure tous les chauffeurs locaux.
- **Modification Complète :** Nom, prénom, téléphone, photo de profil.
- **Cache-Busting & Rafraîchissement Instantané (S25) :** La nouvelle photo de profil s'affiche immédiatement. Sur téléphone, l'utilisation de `useFocusEffect` garantit le rafraîchissement immédiat de toutes les données du profil dès l'ouverture de la page sans rechargement manuel.
- **Détails Véhicule :** Choix (Voiture, 4x4, Minibus, Moto) et champ pour la marque.
- **Préférences et Équipements :** Ajout de multiples options à cocher (Climatisation, Sièges Inclinables, Prises, etc.) qui s'enregistrent en base et pré-remplissent automatiquement chaque nouvelle annonce.
- **Barre d'Actions Ergonomique (S25) :** Les boutons de sauvegarde, déconnexion, changement de langue et suppression sont regroupés intelligemment sous l'en-tête, formant une barre d'actions responsive.
- **Gestion des Annonces :** Sur la page de détail de *son propre trajet*, le chauffeur dispose d'un panneau pour ajuster les places en temps réel (boutons `+` et `-`) ou supprimer totalement l'annonce.
- **Historique & Trajets Expirés :** Les trajets terminés/passés dans l'onglet "Je conduis" sont automatiquement détectés, grisés (opacité `0.7`), marqués d'un badge `"Trajet terminé"` et triés en bas de liste. L'historique du chauffeur est préservé tout en libérant l'espace supérieur pour les trajets actifs.

### 8. Système de Paiement Mobile Money *(STABLE - SESSION 19)*
- **Gating de Contact :** Le numéro du conducteur est masqué jusqu'au paiement.
- **Multi-Opérateurs & UI Premium :** Modale de sélection élégante pour MVola, Orange Money, Airtel Money.
- **Frais dynamiques :** 10% du prix du trajet (min 1 000, max 5 000 Ar).
- **Validation Zéro-Clic (Passerelle SMS) :** Paiement via Mobile Money validé automatiquement via une application Android locale lisant les SMS, reliée à Supabase par une Edge Function (`sms-webhook`) ultra-performante.
- **Crédits de Bienvenue (Freemium) 🎁 :** Distribution automatique de 5 trajets gratuits (`free_unlocks`) à tous les nouveaux inscrits, permettant de débloquer des contacts de chauffeurs sans paiement pour construire la confiance.
- **Auto-Rafraîchissement Realtime :** Les statuts de réservation se mettent à jour instantanément à la seconde près côté passager (sans rechargement de page) grâce à `supabase_realtime`.
- **Notifications Push Expo *(AMÉLIORÉ - S21)* :** Envoi d'une notification push silencieuse et immédiate sur le téléphone du passager dès que le webhook valide son paiement Mobile Money en arrière-plan. Correction complète du `projectId` EAS officiel et liaison d'un écouteur global de tap redirigeant instantanément le passager vers le détail de son voyage (`/ride/[id]`).
- **Table `sms_logs` :** Audit complet de tous les SMS Mobile Money reçus.
- **Sécurisation Blindée :** Le numéro du chauffeur reste strictement verrouillé tant que la passerelle SMS n'a pas confirmé le paiement en base de données, empêchant tout contournement manuel.
- **Chat de Confirmation Automatique :** Immédiatement après la validation du paiement, le système insère de manière asynchrone un message automatique dans le chat de la réservation.

### 9. Tableau de Bord Administrateur *(REDESIGN PREMIUM - SESSION 22)*
- **Validation Automatique :** Suppression de la validation manuelle chronophage.
- **Design Exhaustif SaaS :** Architecture 3 colonnes sur Desktop avec cartes Glassmorphism, ombres douces et dégradés (Dark Blue vers Slate).
- **Compteurs Animés :** Effet "pompe à essence" (défilement rapide) sur tous les chiffres financiers lors du changement de sélection de date.
- **Statistiques Utilisateurs :** Affichage RH (conducteurs, voyageurs) avec des composants visuels modernes.
- **Ventilation Financière Dynamique :** Calendrier interactif qui, au clic, affiche instantanément le CA du jour sélectionné ventilé avec les logos opérateurs (MVola, Airtel, Orange) et le nombre de trajets publiés.
- **Centre KYC Ultra-Premium *(NOUVEAU - S24)* :** Interface d'audit complète permettant de visualiser les cartes d'identité soumises (photos Recto/Verso, infos extraites) et de révoquer ou approuver manuellement les profils en un clic avec un design Glassmorphism.
- **Widgets de Supervision :** Mini-widget de la passerelle SMS et carte complète d'utilisation de l'espace disque Supabase (barre de progression).
- **Passerelle SMS Admin :** L'administrateur installe l'APK Android (EAS Build) SMS Gateway sur son téléphone personnel. Chaque SMS Mobile Money reçu est automatiquement lu et valide les trajets sans aucune action manuelle. Depuis S17, l'application implémente `PermissionsAndroid.request` pour afficher le pop-up obligatoire de permission système (Android >= 6.0), débloquant l'écoute SMS.
- **Auto-Rafraîchissement Bilan Client & Admin :** Polling silencieux de sécurité toutes les 3 secondes côté passager et 5 secondes côté Kiosque.

### 10. Système de Réputation & Avis *(NOUVEAU - V2.0)*
- **Notation 5 Étoiles :** Les passagers peuvent noter les chauffeurs après chaque trajet terminé.
- **Commentaires vérifiés :** Les avis sont liés à une réservation réelle pour garantir leur authenticité.
- **Badge "Super Driver" Dynamique *(NOUVEAU - S20)* :** Attribution dynamique et en temps réel aux chauffeurs exemplaires (Moyenne >= 4.5 et >= 5 avis), affiché sur le profil et la carte du trajet.
- **Historique Interactif :** Bouton "Noter le chauffeur" dynamique dans l'onglet "Mes Voyages" pour les trajets passés.
- **Profil Public Enrichi :** Affichage de la moyenne globale et de la liste chronologique des commentaires.

### 11. Inscription & Sécurité des Profils *(NOUVEAU - V2.0)*
- **Sélection de Rôle :** Choix explicite entre Voyageur et Conducteur lors de l'inscription.
- **Politique "Vrai Visage" & Qualité :** Photo de profil obligatoire dès l'inscription. Le visage doit être clair, net et identifiable.
- **Règles de Netteté :** Interdiction des photos floues (sauf flou artistique d'arrière-plan portrait). Rejet des photos de voitures, paysages ou masques.
- **Vérification d'Identité (KYC) *(NOUVEAU - S24)* :** Formulaire de vérification (Recto/Verso CIN, Adresse, Profession) avec algorithme d'auto-formatage de la saisie des dates et auto-validation instantanée pour une acquisition rapide ("zéro friction"). Le conducteur validé reçoit un badge "Identité Vérifiée ✅" affiché publiquement.
- **Algorithme Anti-Fraude (Bio) :** L'application analyse la biographie du conducteur lors de la sauvegarde du profil. L'algorithme convertit les mots textuels en chiffres (Français et Malgache : "zero", "trente", "telo", "efatra") et bloque instantanément l'enregistrement s'il détecte une tentative de dissimuler un numéro de téléphone Mobile Money (préfixes 03x et séquence > 9 chiffres) pour contourner le système de monétisation.

### 12. Messagerie Interne Temps Réel *(AMÉLIORÉ - S29)*
- **Chat Instantané :** Communication directe entre passager et conducteur via Supabase Realtime.
- **Messages Vocaux Éphémères 🎙️ *(NOUVEAU - S29)* :**
  - **Interface WhatsApp :** Bouton Micro adaptatif, graphique d'ondes dynamique (Waveform) réagissant à la voix, et chronomètre en temps réel.
  - **Code Splitting / Optimisation Web :** Technologie d'enregistrement `expo-av` avec désactivation automatique du *metering* (analyse des décibels) sur navigateur Web pour empêcher les crashs silencieux de Chrome, garantissant un enregistrement parfait sur tous les supports.
  - **Sécurité Anti-Spam :** Annulation automatique des enregistrements involontaires de moins de 1 seconde.
  - **Nettoyage Automatique (Robot Cron) :** Une fonction *Edge Function* (`clean-audio-cron`) s'exécute chaque nuit pour supprimer physiquement tous les fichiers vocaux dont le trajet remonte à plus de 24h, garantissant que l'espace de stockage Supabase (500 Mo) ne soit jamais saturé.
- **Accès Premium :** La messagerie est débloquée en même temps que le numéro de téléphone après validation du paiement.
- **Badge de Notification :** Badge rouge dynamique sur l'onglet "Messages" indiquant le nombre de nouveaux messages reçus en temps réel.

### 13. Interface Ultra-Pro Desktop & Mobile *(AMÉLIORÉ - SESSION 20)* 💻✨
- **Mise en Page Double Colonne (Dual-Pane) :** Déploiement d'un design inspiré de BlaBlaCar (Teal sombre `#1E3A5F`, Bleu vif `#2563EB`, Fond gris doux `#F1F5F9`) sur grand écran et condensé sur mobile.
- **Dark Hero Header :** Refonte premium des en-têtes (Détails du trajet, Profil Conducteur, Chat, Mon Profil) offrant un contraste élevé et un esthétisme SaaS de haut niveau.
- **Résultats de Recherche (`app/resultats-recherche.tsx`) :** Sidebar de filtres latérale fixe à gauche (Tri, Confiance, Équipements) et grille de résultats aérée à droite.
- **Fiche de Détail du Trajet (`app/ride/[id].tsx`) :** En-tête bleu inversé superposé aux cartes de détails (gestion optimisée du `zIndex` pour éviter les coupures/désordres), avec timeline interactive d'itinéraire à gauche, et conteneur de réservation flottant à droite.
- **Publication de Trajet (`app/(tabs)/publish.tsx`) :** Formulaire limité à une largeur de `680px` et centré avec sélection en un clic des villes d'escale suggérées.
- **Gestion des Voyages (`app/(tabs)/rides.tsx`) :** Tableau de bord de type SaaS (`max-w-4xl`) avec onglets en pilules de sélection et cartes d'itinéraire haut de gamme.
- **Profil Public Conducteur (`app/driver/[id].tsx`) :** Section véhicule et galerie photo à gauche intégrées dans des cartes aux bords fortement arrondis (`borderRadius: 24`), et résumé de confiance avec contacts à droite.
- **Polissages Esthétiques & Expérience Utilisateur :**
  - **Visibilité Immédiate sur Ordinateur 💻 :** Réduction de la hauteur du conteneur carrousel (Hero) de `600px` à `480px` sur Desktop pour garantir que la barre de recherche soit parfaitement visible (above the fold) sans nécessiter de scroll, même sur de petits ordinateurs portables.
  - **Densité Mobile Optimisée ⚡ :** Réduction des espacements superflus sur petits écrans (iPhone SE) pour placer le bouton d'action au-dessus de la ligne de flottaison.
  - **Compression d'Image Extrême 🗜️ :** Algorithme de compression agressif (300px max, 0.4 qualité) sur les photos de profil, pour un affichage instantané et zéro surcharge serveur.
  - **Suppression ABSOLUE des rectangles noirs (Focus) :** Injection de `style={{ outlineStyle: 'none' }}` et de la classe `outline-none` sur l'ensemble des champs de saisie (`TextInput`) de l'application, éliminant définitivement tout rectangle noir de focus navigateur sur ordinateur et téléphone.
  - **Bouton d'Effacement Rapide "x" :** Ajout de petits boutons interactifs d'effacement rapide à l'extrémité droite des zones de saisie textuelle de lieux (Départ / Arrivée) sur ordinateur et téléphone.
  - **Saisie & Formatage des destinations :** Rendu compact en deux lignes avec limitation stricte de retour à la ligne (`numberOfLines={1}`) et transformation en capitales du nom de la commune (en noir) et de la Route Nationale (en gris).
  - **Correctif d'Alignement Login/Signup :** Migration du conteneur de formulaire de connexion vers un `ScrollView` flexible à défilement vertical, prévenant toute troncature ou décalage de l'icône bleue de voiture sur les écrans à hauteur réduite.
  - **Opacité & Superposition Autocomplete :** Correction d'un bug d'affichage sur React Native Web où les modales de suggestions s'affichaient avec un arrière-plan transparent, se superposant de manière chaotique aux champs inférieurs.
  - **Interface Premium de Gestion des Escales & Tarifs :** Design accordéon mutuellement exclusif, pliage automatique au blur, tarifs d'escale optionnels et lisibilité universelle des chiffres.
- **Robustesse & Résolution de Bugs :**
  - **Résolution Radicale Universelle du Faux-Positif Navigation Context :** Correction définitive d'un crash fatal lors du chargement des différents écrans provoqué par l'utilisation de l'attribut `className` sur les composants tiers `Ionicons` / `MaterialCommunityIcons` sous NativeWind v4 (remplacé par `style`).
  - **Précision GPS & Géolocalisation Toby Ratsimandrava & Multi-Zones :** Résolution d'un problème d'ambiguïté de reverse-geocoding qui mappait incorrectement la position de l'utilisateur à Andrefana Ambohijanahary (Toby Ratsimandrava) sur une zone (Cité 67ha). Intégration d'un dictionnaire d'alias linguistiques directionnels (`Andrefana` -> `Ouest`).
  - **Traduction Automatique des Noms Coloniaux :** Traduction et résolution des requêtes et retours d'API utilisant encore les appellations coloniales françaises (`Tamatave` -> `Toamasina`, `Majunga` -> `Mahajanga`, etc.).
  - **Résolution Faille de Synchronisation Chat :** Correction d'un crash API Supabase (`400 Bad Request`) sur la messagerie direct provoqué par une désynchronisation asynchrone d'Expo Router.
  - **Résolution Faille RLS Générateur Démo :** Résolution d'un crash d'insertion Supabase (`code: 42501`) en liant les trajets démo générés au `driver_id` de l'administrateur connecté.
  - **Résolution du Gel Clavier & Focus Android :** Remplacement du montage/démontage dynamique instable des `TextInput` par le patron de conception premium *Stable Input Overlay*.
  - **Sélecteurs de Dates Universels Hybrides :** Intégration d'inputs HTML superposés et invisibles uniquement sur le Web, résolvant l'absence d'affichage du sélecteur de date/heure sur ordinateur.
  - **Moteur de Recherche Madagascar Intelligent :** Intégration d'un extracteur de termes complexes (`extractCleanSearchTerms`) décomposant et nettoyant les entrées d'autocomplétion, éliminant définitivement les erreurs de trajets non trouvés.
- **Correction de la Flèche de Retour Web :** Utilisation sécurisée de `router.canGoBack()` enveloppée dans un bloc `try/catch` empêchant le navigateur de planter lorsqu'on actualise directement une page sans historique.
- **Alertes Professionnelles `CustomAlert` :** Remplacement universel de `Alert.alert` natif par un composant `CustomAlert` modal animé intégré globalement dans `app/_layout.tsx`.

### 14. Optimisations de Performance Mobile & Web *(AMÉLIORÉ - SESSION 28)* ⚡
- **Code Splitting / Lazy Loading *(NOUVEAU - S28)* :** `CustomAlert`, `DesktopHeader`, et `DateTimePickerModal` sont chargés à la demande (`React.lazy`) pour alléger le bundle JS initial sur connexion 3G.
- **Fix Timer Carousel :** Utilisation de `refs` au lieu de dépendances React pour un timer stable.
- **`RideCard` Memoïsé :** Composant encapsulé dans `React.memo` avec callback memoïsé.
- **`/publish` Instantané :** Suppression du spinner bloquant `checkingAuth`.
- **Headers Cache Vercel :** Assets JS/CSS en cache 1 an (`immutable`).

---

## 🌐 Déploiement & Infrastructure

| Plateforme | URL | Statut |
|---|---|---|
| **Web (Vercel)** | https://miaradia-app.vercel.app | ✅ En production |
| **Code source** | https://github.com/Aintsoa-ai/miaradia-app | ✅ Public |
| **Backend** | https://yqttaeukmnstyxbabkqz.supabase.co | ✅ Actif |
| **Edge Function SMS** | `.../functions/v1/sms-webhook` | ✅ Déployée |

**CI/CD :** Chaque `git push` sur la branche `master` déclenche automatiquement un nouveau déploiement sur Vercel.

---

## 🛠️ Architecture Technique

### Fichiers Utilitaires (`lib/`)
| Fichier | Rôle |
|---|---|
| `lib/supabase.ts` | Client Supabase |
| `lib/formatPrice.ts` | Formatage des prix avec espaces milliers |
| `lib/distancesMadagascar.ts` | Dictionnaire distances routes nationales MG |
| `lib/distanceService.ts` | API OpenStreetMap pour distances temps réel |
| `lib/locationFormatter.ts` | Formate la sélection au format `RN.Ville-Quartier` |
| `lib/itinerarySuggestions.ts` | Suggère les escales logiques selon l'axe routier (RN) |

### Composants Clés (`components/`)
| Fichier | Rôle |
|---|---|
| `components/CustomAlert.tsx` | Modale d'alerte premium animée (remplace Alert.alert) |
| `components/PaymentModal.tsx` | Modale de sélection de paiement Mobile Money |
| `components/RideCard.tsx` | Carte de trajet memoïsée (React.memo) pour listes performantes |

### Hooks Réutilisables (`hooks/`)
| Fichier | Rôle |
|---|---|
| `hooks/usePlatformStats.ts` | Statistiques plateforme avec chargement différé (3s sur mobile) |
| `hooks/useMyRides.ts` | Liste des trajets du conducteur avec cache AsyncStorage |
| `hooks/useRideDetails.ts` | Détails d'un trajet avec cache offline |
| `hooks/useChat.ts` | Messagerie temps réel avec push notifications |

### Utilitaires (`utils/`)
| Fichier | Rôle |
|---|---|
| `utils/alert.ts` | Intercepteur global pour CustomAlert |

### Supabase Edge Functions (`supabase/functions/`)
| Fonction | URL | Rôle |
|---|---|---|
| `sms-webhook` | `.../functions/v1/sms-webhook` | Reçoit les SMS MVola/Orange/Airtel, compare les références et valide automatiquement les paiements |

---

*Dernière mise à jour : **12 Juin 2026** — Session 28 : Code Splitting (React.lazy), Notification Push au paiement, Tarification intelligente.*
