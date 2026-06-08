// @ts-nocheck
// Edge Function : delete-account
// Supprime toutes les données d'un utilisateur (profil, trajets, réservations, messages, avis, avatar)
// Nécessite un JWT valide de l'utilisateur connecté

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      }
    });
  }

  try {
    // Vérifier que l'utilisateur est bien connecté via son JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client avec droits admin (service role) pour pouvoir supprimer le compte auth
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Client avec le JWT de l'utilisateur pour vérifier son identité
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Session invalide' }), { status: 401 });
    }

    const userId = user.id;
    console.log(`Suppression du compte pour l'utilisateur: ${userId}`);

    // 1. Supprimer les messages envoyés et reçus
    await adminClient.from('messages').delete().eq('sender_id', userId);
    await adminClient.from('messages').delete().eq('receiver_id', userId);

    // 2. Supprimer les avis donnés et reçus
    await adminClient.from('reviews').delete().eq('reviewer_id', userId);
    await adminClient.from('reviews').delete().eq('driver_id', userId);

    // 3. Supprimer les réservations
    await adminClient.from('bookings').delete().eq('passenger_id', userId);
    await adminClient.from('bookings').delete().eq('driver_id', userId);

    // 4. Supprimer les trajets publiés
    await adminClient.from('rides').delete().eq('driver_id', userId);

    // 5. Supprimer la photo de profil dans le Storage
    await adminClient.storage.from('avatars').remove([`${userId}.jpg`, `${userId}.jpeg`, `${userId}.png`]);

    // 6. Supprimer le profil public
    await adminClient.from('profiles').delete().eq('id', userId);

    // 7. Supprimer le compte auth (nécessite service role)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('Erreur suppression auth user:', deleteError);
      throw deleteError;
    }

    console.log(`✅ Compte ${userId} supprimé avec succès.`);

    return new Response(JSON.stringify({
      success: true,
      message: 'Compte supprimé avec succès'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (error) {
    console.error('Erreur suppression compte:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erreur interne' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
