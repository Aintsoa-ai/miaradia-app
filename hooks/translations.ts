export type Language = 'fr' | 'mg';

export const translations = {
  fr: {
    // Onglets (Tabs)
    "tab_search": "Rechercher",
    "tab_publish": "Publier",
    "tab_rides": "Vos trajets",
    "tab_chat": "Messages",
    "tab_profile": "Profil",

    // Page de Recherche (Home)
    "search_title": "Où allez-vous ?",
    "search_subtitle": "Trouvez votre covoiturage à Madagascar",
    "search_departure": "Lieu de départ",
    "search_arrival": "Lieu d'arrivée",
    "search_date": "Aujourd'hui",
    "search_button": "Rechercher un trajet",
    
    // Page de Publication
    "publish_title": "Publier un trajet",
    "publish_departure": "D'où partez-vous ?",
    "publish_arrival": "Où allez-vous ?",
    "publish_price": "Prix trajet (Ar)",
    "publish_seats": "Places libres",
    "publish_button": "Publier le trajet",
    "publish_vehicle": "Votre Véhicule",
    "publish_car": "Véhicule",
    "publish_moto": "Moto",
    "publish_date": "Date et heure de départ",

    // Profil & Paramètres
    "profile_title": "Votre Profil",
    "profile_logout": "Se déconnecter",
    "profile_language": "Changer de langue",
    "profile_save": "Enregistrer le profil",
    "profile_delete": "Supprimer mon compte",
    "profile_personal_info": "Informations Personnelles",
    "profile_vehicle": "Mon Véhicule",
    "profile_equipment": "Équipements & Règles",
  },
  mg: {
    // Onglets (Tabs) - Malagasy Andavanandro
    "tab_search": "Hitady",
    "tab_publish": "Hizara dia", // Partager un trajet
    "tab_rides": "Ny diako", // Mes trajets
    "tab_chat": "Hafatra", // Messages
    "tab_profile": "Kaontiko", // Mon compte / Profil

    // Page de Recherche (Home)
    "search_title": "Ho aiza ianao ?", // Où allez-vous ?
    "search_subtitle": "Tadiavo eto ny fiara hiarahana dia", // Trouvez ici la voiture pour voyager ensemble
    "search_departure": "Toerana hiaingana", // Lieu de départ
    "search_arrival": "Toerana ahatongavana", // Lieu d'arrivée
    "search_date": "Daty hiaingana", // Date de départ
    "search_button": "Hitady fiara", // Chercher une voiture
    
    // Page de Publication
    "publish_title": "Hizara dia",
    "publish_departure": "Miainga avy aiza ?", // D'où partez-vous ?
    "publish_arrival": "Ho aiza ny dia ?", // Où allez-vous ?
    "publish_price": "Saran-dalana (Ar)", // Frais de route / Prix
    "publish_seats": "Toerana banga", // Places vides
    "publish_button": "Hamoaka ny dia", // Publier le trajet
    "publish_vehicle": "Ny fiaranao", // Votre véhicule
    "publish_car": "Fiara", // Voiture
    "publish_moto": "Moto", // Moto
    "publish_date": "Daty sy lera hiaingana", // Date et heure de départ

    // Profil & Paramètres
    "profile_title": "Mombamomba anao", // Votre profil
    "profile_logout": "Hiala", // Quitter / Se déconnecter
    "profile_language": "Hanova fiteny", // Changer de langue
    "profile_save": "Hitehiriza ny mombamomba", // Enregistrer le profil
    "profile_delete": "Hofafana ny kaonty", // Supprimer mon compte
    "profile_personal_info": "Mombamomba ahy", // Informations Personnelles
    "profile_vehicle": "Ny fiarako", // Mon Véhicule
    "profile_equipment": "Fitaovana & Fitsipika", // Equipements & Règles
  }
};

export type TranslationKey = keyof typeof translations.fr;
