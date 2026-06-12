// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Calcul de la date d'il y a 24 heures
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    console.log("Démarrage du nettoyage des vocaux...");

    // 1. Récupérer tous les messages audio dont le trajet est passé depuis plus de 24h
    // Note: 'rides!inner(date)' garantit qu'on filtre uniquement sur les messages dont le trajet respecte la condition
    const { data: messages, error: fetchError } = await supabaseClient
      .from('messages')
      .select('id, content, rides!inner(date)')
      .like('content', '[AUDIO]%')
      .lt('rides.date', yesterday);

    if (fetchError) throw fetchError;

    if (!messages || messages.length === 0) {
      console.log("Aucun vocal expiré à nettoyer.");
      return new Response(JSON.stringify({ message: "Aucun vocal à nettoyer" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`${messages.length} vocaux expirés trouvés. Nettoyage en cours...`);

    const filesToDelete = [];
    const messageIdsToUpdate = [];

    // 2. Extraire le nom du fichier de l'URL
    for (const msg of messages) {
      const url = msg.content.replace('[AUDIO]', '');
      // L'URL publique ressemble à : https://[...]/storage/v1/object/public/chat_audio/fichier.m4a
      const parts = url.split('/');
      const fileName = parts[parts.length - 1]; // Récupère le dernier bout (le nom du fichier)

      if (fileName) {
        filesToDelete.push(fileName);
        messageIdsToUpdate.push(msg.id);
      }
    }

    // 3. Supprimer physiquement les fichiers du Bucket Supabase Storage
    if (filesToDelete.length > 0) {
      const { error: storageError } = await supabaseClient
        .storage
        .from('chat_audio')
        .remove(filesToDelete);

      if (storageError) {
        console.error("Erreur lors de la suppression des fichiers du storage:", storageError);
      } else {
        console.log(`${filesToDelete.length} fichiers supprimés du Storage.`);
      }
    }

    // 4. Mettre à jour les messages dans la base de données pour indiquer l'expiration
    if (messageIdsToUpdate.length > 0) {
      const { error: updateError } = await supabaseClient
        .from('messages')
        .update({ content: '[Vocal expiré]' })
        .in('id', messageIdsToUpdate);

      if (updateError) {
        console.error("Erreur lors de la mise à jour de la table messages:", updateError);
      } else {
        console.log("Textes des messages mis à jour avec succès.");
      }
    }

    return new Response(JSON.stringify({ 
      message: "Nettoyage terminé avec succès.", 
      deletedCount: filesToDelete.length 
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Erreur fatale du Cron:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
})
