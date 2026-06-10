import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CustomAlert } from '../utils/alert';

export function useKyc() {
  const [loading, setLoading] = useState(false);

  const uploadImage = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
  };

  // Algorithme d'extraction de texte (OCR) et de comparaison
  const verifyIdentityWithOCR = async (imageUrl: string, formData: any) => {
    try {
      // Appel à une API OCR gratuite (OCR.space) via l'URL publique de l'image Supabase
      const response = await fetch(`https://api.ocr.space/parse/imageurl?apikey=helloworld&url=${encodeURIComponent(imageUrl)}&language=fre`);
      const json = await response.json();
      
      if (json.IsErroredOnProcessing) {
        console.log("Erreur OCR:", json.ErrorMessage);
        return false;
      }

      const extractedText = json.ParsedResults?.[0]?.ParsedText?.toUpperCase() || "";
      console.log("Texte lu par l'algorithme :", extractedText);

      // Normalisation des champs pour la comparaison
      const cleanCin = formData.cin_number.replace(/\s/g, ''); // Enlever les espaces
      const cleanExtractedText = extractedText.replace(/\s/g, ''); 
      const lastName = formData.last_name.toUpperCase().trim();

      // Comparaison Algorithmique : 
      // On cherche si le numéro de CIN (sans espace) et le Nom de famille se trouvent dans le texte lu sur la photo.
      const cinMatch = cleanExtractedText.includes(cleanCin);
      const nameMatch = extractedText.includes(lastName);

      if (cinMatch && nameMatch) {
        return true; // L'algorithme a trouvé les correspondances parfaites !
      }
      
      return false; // Les champs ne correspondent pas ou la carte est trop floue
    } catch (e) {
      console.error("Échec de l'algorithme OCR", e);
      return false;
    }
  };

  const submitKyc = useCallback(async (
    formData: any,
    rectoUri: string,
    versoUri: string
  ) => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Non connecté");
      const userId = session.user.id;

      // 1. Upload des photos
      const rectoUrl = await uploadImage(rectoUri, `kyc/${userId}_recto.jpg`);
      const versoUrl = await uploadImage(versoUri, `kyc/${userId}_verso.jpg`);

      // 2. Lancement de l'Algorithme d'Analyse Automatique
      const isVerifiedByBot = await verifyIdentityWithOCR(rectoUrl, formData);
      const finalStatus = isVerifiedByBot ? 'verified' : 'pending';

      // 3. Sauvegarde dans la base de données

      const { error } = await supabase.from('kyc_applications').insert([{
        user_id: userId,
        cin_number: formData.cin_number,
        last_name: formData.last_name,
        first_name: formData.first_name,
        birth_date: formData.birth_date,
        birth_place: formData.birth_place,
        address: formData.address,
        arrondissement: formData.arrondissement,
        profession: formData.profession,
        father_name: formData.father_name,
        mother_name: formData.mother_name,
        issue_place: formData.issue_place,
        issue_date: formData.issue_date,
        cin_recto_url: rectoUrl,
        cin_verso_url: versoUrl,
        status: finalStatus
      }]);

      if (error) throw error;
      
      // Met à jour le statut dans le profil
      await supabase.from('profiles').update({ kyc_status: finalStatus }).eq('id', userId);

      if (finalStatus === 'verified') {
        CustomAlert.alert("Félicitations !", "L'algorithme a lu votre carte et validé votre identité avec succès. Vous avez le badge !");
      } else {
        CustomAlert.alert("Vérification requise", "L'algorithme n'a pas pu lire parfaitement la carte (floue ou écriture manuscrite). Un administrateur va la valider manuellement.");
      }
      
      return true;
    } catch (e: any) {
      console.error(e);
      CustomAlert.alert("Erreur", "Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, submitKyc };
}
