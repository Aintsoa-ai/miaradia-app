import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CustomAlert } from '../utils/alert';

export function useKyc() {
  const [loading, setLoading] = useState(false);

  const uploadImage = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await new Response(blob).arrayBuffer();
    
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, arrayBuffer, { upsert: true, contentType: 'image/jpeg' });
      
    if (error) throw error;
    
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    return publicUrl;
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

      // 2. Validation instantanée (Zéro friction comme demandé)
      const finalStatus = 'verified';

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

      CustomAlert.alert("Félicitations !", "Votre carte a été reçue et votre profil est maintenant officiellement VÉRIFIÉ ! ✅");
      
      return true;
    } catch (e: any) {
      console.error(e);
      CustomAlert.alert("Erreur de sauvegarde", e.message || "Une erreur est survenue lors de l'envoi. Veuillez réessayer.");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, submitKyc };
}
