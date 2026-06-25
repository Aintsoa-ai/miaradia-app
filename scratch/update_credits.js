const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
const supabaseAnonKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function removeFreeCredits() {
  console.log("Recherche du profil de thierry RAMAROKOTO...");
  
  // 1. Chercher le profil par nom (sensible à la casse ou ilike)
  const { data: profiles, error: searchError } = await supabase
    .from('profiles')
    .select('id, full_name, free_unlocks')
    .ilike('full_name', '%thierry%RAMAROKOTO%');

  if (searchError) {
    console.error("Erreur lors de la recherche:", searchError);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log("Aucun utilisateur trouvé avec ce nom.");
    
    // Essayons de lister les derniers inscrits pour l'aider à trouver
    const { data: recent } = await supabase.from('profiles').select('id, full_name').order('created_at', { ascending: false }).limit(5);
    console.log("Voici les 5 derniers inscrits :", recent);
    return;
  }

  console.log("Profil trouvé :", profiles[0]);
  const userId = profiles[0].id;

  // 2. Mettre à jour les free_unlocks à 0
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ free_unlocks: 0 })
    .eq('id', userId);

  if (updateError) {
    console.error("Erreur lors de la mise à jour:", updateError);
  } else {
    console.log("✅ Succès : Les crédits gratuits de thierry RAMAROKOTO ont été mis à 0 !");
  }
}

removeFreeCredits();
