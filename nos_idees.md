# 💡 Boîte à Idées - Miara-Dia 🚙🇲🇬

Ce document recense les idées d'amélioration et les futures fonctionnalités pour rendre l'application encore plus puissante et adaptée au contexte malgache.

> [!IMPORTANT]
> **Règle d'Or de l'Intégration :** Toute nouvelle idée de fonctionnalité validée et implémentée doit impérativement être déclinée de manière optimale sur **version téléphone** et **version ordinateur**. 

---

## 🗺️ Géographie & Itinéraires
- [ ] **Détection d'embouteillages (Tana)** : Intégrer une alerte ou une estimation de temps supplémentaire pour les axes saturés (ex: Anosizato, 67ha).
- [ ] **Axe Fluvial** : Ajouter la possibilité de publier des trajets en bateau (ex: Canal des Pangalanes ou traversées vers Sainte-Marie / Nosy Be).
- [ ] **Points de Repère (Points of Interest)** : Permettre aux conducteurs d'ajouter des points de repère connus (ex: "Arrêt devant Station Galana") au lieu de simples noms de communes.
- [ ] **Météo des Routes** : Alerte sur l'état des pistes en saison des pluies (ex: "Piste RN5 difficile actuellement").
- [ ] **Trajets Courtes Distances / Intra-District (Taxi Communautaire) *(NOUVEAU)* :** Proposer une option pour les trajets quotidiens (Maison-Travail-Maison). Un conducteur publie son trajet matin/soir, et les gens de son quartier peuvent rentrer avec lui.
- [ ] **Sortie de Famille / Privatisation *(NOUVEAU)* :** Ajouter une catégorie où les voyageurs cherchent spécifiquement à privatiser une voiture pour une sortie de famille (frais de publication spécifique, ex: 1 000 Ar).

## 💰 Monétisation & Prix
- [ ] **Tarification au km automatique** : Proposer un prix suggéré au chauffeur dès qu'il entre son trajet, basé sur les prix moyens du marché malgache.
- [ ] **Paiement In-App complet** : Passer d'un gating de contact à une réservation avec séquestre (l'argent est gardé par l'app jusqu'à l'arrivée).
- [x] **Validation Automatique SMS Mobile Money *(RÉALISÉ - S14)* :** Système de détection automatique des SMS MVola/Orange/Airtel Money via l'app SMS Gateway + Supabase Edge Function `sms-webhook`. Parsing des SMS, comparaison des références, déverrouillage automatique du contact chauffeur et décrémentation des places. Zéro intervention manuelle. Table `sms_logs` pour audit complet.
- [ ] **Intégration API MVola Officielle *(PROCHAINE ÉTAPE)* :** Remplacer la solution SMS Gateway par l'API officielle Telma MVola pour une validation encore plus fiable et instantanée (nécessite un compte business Telma).
- [ ] **Abonnement Premium Chauffeur** : Permettre aux chauffeurs pro de payer un abonnement mensuel pour ne plus avoir de frais sur les réservations.
- [ ] **Offres d'Abonnement Passager (Accès Illimité Contacts) *(NOUVEAU)* :** Proposer des abonnements pour les voyageurs réguliers au lieu de payer à chaque trajet :
  - **Hebdomadaire :** Affiche tous les numéros de conducteurs pendant une semaine entière.
  - **Mensuel :** Affiche tous les numéros de conducteurs pendant un mois entier.
- [ ] **Programme de Fidélité Voyageur (Bonus d'Activité) :** Récompenser les passagers fidèles pour stimuler l'activité. Si un voyageur effectue une réservation et contacte plus de 8 chauffeurs différents en moins d'une semaine, l'application lui offre **1 crédit de contact gratuit en bonus** (frais de réservation offerts sur le trajet suivant de son choix).

## 🤝 Communauté & Confiance
- [ ] **Vérification d'Identité (KYC)** : Permettre aux utilisateurs d'uploader leur CIN pour obtenir un badge "Profil Vérifié par CIN".
- [ ] **Groupes de Voyage** : Créer des groupes spécifiques (ex: "Voyageurs réguliers Tana-Antsirabe") pour fidéliser la clientèle.
- [ ] **Avis Audio** : Permettre de laisser un petit message vocal en guise d'avis (très utilisé à Madagascar).

## 📱 Expérience Utilisateur (UX)
- [ ] **Mode Hors-Ligne** : Permettre de consulter ses billets et les numéros de contact même sans connexion (utile sur les RN en zone d'ombre).
- [ ] **Partage de Position Temps Réel** : Permettre au passager de partager son trajet avec ses proches pour plus de sécurité.
- [ ] **Support Multi-langue** : Malagasy complet (Vahinaly / Ofisialy) en plus du Français.
- [x] **Design SaaS Ultra Pro** : Formulaires en Split-Screen, ombres douces et carrousel d'images automatisé.
- [ ] **Micro-animations** : Ajouter des transitions fluides (Lottie) lors des chargements ou des validations de paiement.

## 🏗️ Technique & Admin
- [x] **Système d'Avis & Réputation** : Permettre aux passagers de noter les chauffeurs.
- [x] **Sécurité des Profils** : Politique de photo réelle et choix du rôle.
- [x] **Interface Desktop "Ultra Pro"** : Navigation responsive, header professionnel et mise en page SaaS à 100% (Accueil, Recherche, Login, Chat, Profil, Mes Voyages).
- [x] **Copie conforme BlaBlaCar sur ordinateur** : Structure dual-pane double colonne sur l'ensemble des parcours (Recherche, Détails, Publication, Voyages, Profils).
- [x] **Polissage de l'Expérience Utilisateur** : Suppression complète et absolue des rectangles de focus navigateur (`outlineStyle: 'none'`) et mise en place d'un affichage des destinations en deux lignes majuscules compactes.
- [x] **Boutons "x" d'Effacement Rapide** : Ajout de boutons de croix interactives pour vider instantanément les inputs de lieux.
- [x] **Correctif d'Alignement Vertical** : Utilisation de conteneurs ScrollView sur ordinateur pour éviter que les éléments importants (logos, boutons) soient poussés hors de l'écran.
- [x] **Validation Téléphone Complète 📱** : Tous les boutons mobiles (swap, autocomplétion, recherche, retour, onglets) validés fonctionnels et ergonomiques sous émulation mobile.
- [x] **Précision GPS & Toby Ratsimandrava 📍** : Mappage intelligent du Toby Ratsimandrava / Ambohijanahary Andrefana sur la bonne zone (Ouest Ambohijanahary) en traduisant les synonymes de direction (`Andrefana` -> `Ouest`), avec correctif de nettoyage sur "Renivohitra" (S10) pour bannir les fausses correspondances vers "Ivohitra (Antsirabe I)", support des graphies abrégées ("ambohijary"), et mappage automatique des noms français/coloniaux (`Tamatave` -> `Toamasina`, `Majunga` -> `Mahajanga`, `Tananarivo/Tananarive/Tana` -> `Antananarivo`, etc.).
- [x] **Correctif Faille API Chat 💬** : Verrouillage asynchrone dans `app/chat/[id].tsx` et rectification de la transmission du nom de profil dans `app/ride/[id].tsx` pour éradiquer les erreurs `400 Bad Request` Supabase sur les conversations internes.
- [x] **Résolution Faille RLS Générateur Démo 🛠️** : Déplacement de la logique à l'intérieur du composant `AdminDashboard` de [app/admin/index.tsx](file:///d:/PROJET_COMMANDE_CLIENT/BLABLA%20CAR%20GASY/miaradia-app/app/admin/index.tsx) pour lier dynamiquement les trajets générés au `driver_id` de l'administrateur connecté, résolvant l'erreur RLS Supabase `42501` tout en maintenant des noms fictifs denormalisés distincts pour les tests.
- [x] **Agrandissement Hit-Targets Recherche (Desktop) 💻** : Intégration de la propriété `h-full` sur les entrées textuelles de la barre d'autocomplétion horizontale sur ordinateur, résolvant le problème de ciblage de clic.
- [x] **Enrichissement des Repères Généraux 🗺️** : Ajout des principaux carrefours et zones d'affluence générale (Analakely, Soarano, 67ha, Ankatso, Ankorondrano, Anosibe, Ratsimandrava) pour fiabiliser la géolocalisation de tous les usagers de l'application.
- [x] **Refonte Ergonomique de la Recherche (S11) 🎯** : Retrait volontaire et définitif de la fonctionnalité "Votre position actuelle" (Reverse-Geocoding GPS) sur ordinateur et téléphone pour contrer l'imprécision inhérente des services de géolocalisation à Madagascar au niveau des Fokontany. Priorisation de l'autocomplétion textuelle ultra-rapide.
- [x] **Correction du Bug d'Affichage des Quartiers Composés (S11) 🏷️** : Résolution du parsing vicieux dans `renderRichLocation` qui tronquait aléaiorement les noms de quartiers comportant un tiret (ex: "Cité 67 ha Afovoany-Andrefana"). Le formatage par parenthèse est désormais priorisé.
- [x] **Résolution du Gel Clavier & Focus Android (S12) 📱** : Déploiement universel du patron *Stable Input Overlay* sur la page de publication et de recherche pour éliminer définitivement les cycles de démontage et l'autoFocus récursif qui figeaient le processeur des téléphones.
- [x] **Correctif Anti-Crash des Icônes & Sérialisations (S12) 🛡️** : Mise en place de blocs de détection `try/catch` sur le compilateur de NativeWind v4 pour neutraliser les crashs fatals liés aux références circulaires de navigation.
- [x] **Correctif Tactile de Politique de Bagages (S12) 🧳** : Résolution de la perte de l'événement onPress de NativeWind sur le sélecteur de bagage grâce à une liaison de style React Native directe.
- [x] **Alignement Instantané du Schéma Supabase (S12) 🗄️** : Intégration des colonnes `baggage_size` et `has_roof_rack` en production dans Supabase avec validation automatisée locale.
- [x] **Résolution de Superposition Autocomplete Publication (S12) 💻** : Application de styles d'empilement CSS explicites (`position: relative` et `zIndex: 999`) pour permettre au dropdown de suggestions de lieux de flotter sur ordinateur par-dessus tout autre élément de la page.
- [x] **Sélecteurs de Dates Universels Hybrides & Ergonomie (S13) 💻📱** : Remplacement du libellé par défaut "Aujourd'hui" par "Départ" sur ordinateur et mobile. Résolution de l'incompatibilité de DateTimePickerModal sur ordinateur (Web) par l'utilisation d'overlays HTML transparents (`input type="date"` et `input type="datetime-local"`) dotés d'un index d'empilement élevé (`zIndex: 99999`) et déclenchés par geste de confiance (`.showPicker()`) au clic de conteneurs standard `<div>` sans altérer le comportement mobile natif.
- [x] **Moteur de Recherche Madagascar Intelligent & Tolérant aux Écarts (S13) 💻📱** : Résolution définitive du bug de non-correspondance de recherche ("sur ordinateur et sur téléphone ça n'arrive pas à trouver de trajet") provoqué par la différence entre les noms de quartiers/districts ultra-détaillés de l'autocomplétion (ex: "Antananarivo-Renivohitra (District)") et les noms simplifiés stockés en base (ex: "Antananarivo"). Implémentation d'un algorithme de décomposition intelligent (`extractCleanSearchTerms`) qui sépare les composants complexes, nettoie les parenthèses/suffixes (District, Région, ville, chiffres romains) et génère des requêtes multi-termes `OR` extrêmement tolérantes sur Supabase, garantissant 100% de trajets trouvés sur ordinateur et téléphone.
- [ ] **Notifications Push** : Alerter le passager quand son trajet va bientôt partir ou quand un nouveau message arrive.
- [ ] **Alerte SMS au Chauffeur *(NOUVEAU)* :** Dès qu'un passager paie par Mobile Money et obtient le numéro du conducteur, envoyer automatiquement un SMS au conducteur pour le prévenir : *"Un passager vient de réserver, il va vous appeler dans les prochaines minutes."*
- [ ] **Appels In-App (VoIP)** : Intégrer un bouton d'appel direct via l'app (type Messenger) après déblocage du contact.
- [ ] **Dashboard Admin Mobile** : Une application simplifiée pour l'admin pour valider les paiements en déplacement.
- [ ] **Optimisation Realtime** : Centraliser la gestion des WebSockets Supabase (via un Context global) pour éviter les souscriptions multiples et améliorer les performances.
- [x] **Alertes Premium CustomAlert *(RÉALISÉ - S14)* :** Remplacement universel de tous les `Alert.alert` natifs par un composant `CustomAlert` modal animé professionnel. Intégré globalement dans `_layout.tsx`, disponible sur toute l'application. Icônes conditionnelles (succès/erreur/avertissement), animation fluide, style glassmorphisme. Validé Mobile et Desktop.
- [x] **Déploiement Vercel + GitHub CI/CD *(RÉALISÉ - S14)* :** Application en ligne sur https://miaradia-app.vercel.app avec mise à jour automatique à chaque `git push`. Code source sur https://github.com/Aintsoa-ai/miaradia-app.
- [x] **Passerelle SMS Automatique *(RÉALISÉ - S14)* :** Edge Function `sms-webhook` déployée sur Supabase. Parse les SMS MVola/Orange/Airtel, valide les paiements et déverrouille les contacts sans intervention humaine. Gratuit, zéro abonnement.

---
*Dernière mise à jour : 3 Juin 2026 - Session 14*
