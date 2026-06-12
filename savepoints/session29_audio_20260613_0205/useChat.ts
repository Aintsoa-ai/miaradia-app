import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { sendPushNotification } from '../lib/notifications';

export function useChat(ride_id: string, other_id: string) {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  const markAsRead = useCallback(async (sessionUser: any) => {
    if (!sessionUser || !other_id || other_id === 'undefined') return;

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('ride_id', ride_id)
      .eq('receiver_id', sessionUser.id)
      .eq('sender_id', other_id);
  }, [ride_id, other_id]);

  useEffect(() => {
    let channel: any;

    const setupChat = async () => {
      if (!other_id || other_id === 'undefined') {
        setLoading(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }
      setCurrentUserId(session.user.id);

      // Charger le profil de l'expéditeur pour l'utiliser dans la notification
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
      if (profile) setCurrentUserProfile(profile);

      await markAsRead(session.user);

      // Charger les messages existants
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('ride_id', ride_id)
        .or(`and(sender_id.eq.${session.user.id},receiver_id.eq.${other_id}),and(sender_id.eq.${other_id},receiver_id.eq.${session.user.id})`)
        .order('created_at', { ascending: true });

      if (!error) {
        setMessages(data || []);
      }
      setLoading(false);

      // Écoute temps réel
      channel = supabase
        .channel(`chat:${ride_id}:${session.user.id}:${Date.now()}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `ride_id=eq.${ride_id}`
        }, (payload) => {
          const msg = payload.new;
          const isRelated = (msg.sender_id === session.user.id && msg.receiver_id === other_id) || 
                           (msg.sender_id === other_id && msg.receiver_id === session.user.id);
          
          if (isRelated) {
            if (msg.receiver_id === session.user.id) {
              markAsRead(session.user);
            }
            
            setMessages(prev => {
              if (prev.find(m => m.id === msg.id)) return prev;
              return [...prev, msg];
            });
          }
        })
        .subscribe();
    };

    setupChat();

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [ride_id, other_id, markAsRead]);

  const sendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || !currentUserId) return;

    // 1. Insertion en base de données
    const { error } = await supabase
      .from('messages')
      .insert([{
        sender_id: currentUserId,
        receiver_id: other_id,
        ride_id: ride_id,
        content: messageContent.trim()
      }]);

    if (error) {
      console.error('Error sending message:', error.message);
      return;
    }

    // 2. ENVOI DE LA NOTIFICATION PUSH AU DESTINATAIRE
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', other_id)
      .single();

    if (receiverProfile?.push_token) {
      const senderName = currentUserProfile?.first_name || 'Un utilisateur';
      await sendPushNotification(
        receiverProfile.push_token,
        `Nouveau message de ${senderName}`,
        messageContent.trim(),
        { rideId: ride_id }
      );
    }
  };

  const sendAudioMessage = async (uri: string) => {
    if (!currentUserId || !uri) return;

    try {
      // 1. Convert URI to Blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // 2. Upload to Supabase Storage
      const fileName = `${currentUserId}-${Date.now()}.m4a`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat_audio')
        .upload(fileName, blob, { contentType: 'audio/m4a' });

      if (uploadError) throw uploadError;

      // 3. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('chat_audio')
        .getPublicUrl(fileName);

      // 4. Send as message with [AUDIO] prefix
      const audioMessage = `[AUDIO]${publicUrl}`;
      await sendMessage(audioMessage);

    } catch (error) {
      console.error('Error uploading audio:', error);
    }
  };

  return {
    messages,
    loading,
    currentUserId,
    sendMessage,
    sendAudioMessage
  };
}
