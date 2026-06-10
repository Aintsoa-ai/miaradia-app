import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

// ✅ ID EAS officiel du projet (app.json > extra.eas.projectId)
const EAS_PROJECT_ID = 'f2da6b63-f8d9-471a-8d58-252014dada76';

// Afficher les notifications même quand l'app est ouverte (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Demande la permission et retourne le token push Expo.
 * À appeler au démarrage de l'app (dans _layout.tsx).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  // Canal Android avec vibration et couleur Miara-Dia
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('miaradia-default', {
      name: 'Miara-Dia',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2563EB',
      sound: 'default',
    });
  }

  if (!Device.isDevice) {
    console.log('[Push] Appareil physique requis pour les notifications push.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Permission refusée par l\'utilisateur.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: EAS_PROJECT_ID,
    });
    const token = tokenData.data;
    console.log('[Push] ✅ Token Expo Push :', token);
    return token;
  } catch (e) {
    console.error('[Push] ❌ Erreur obtention token :', e);
    return null;
  }
}

/**
 * Sauvegarde le token push dans le profil Supabase de l'utilisateur.
 * Appelé après connexion ou obtention du token.
 */
export async function savePushToken(userId: string, token: string | null): Promise<void> {
  if (!token || !userId) return;
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ push_token: token })
      .eq('id', userId);
    if (error) throw error;
    console.log('[Push] ✅ Token sauvegardé en BDD pour userId:', userId);
  } catch (e) {
    console.error('[Push] ❌ Erreur sauvegarde token :', e);
  }
}

/**
 * Enregistre un listener qui s'active quand l'utilisateur tape sur une notification.
 * Retourne la fonction de nettoyage (à appeler dans useEffect cleanup).
 * 
 * @param onNavigate - Callback appelé avec le rideId extrait de la notification
 */
export function addNotificationTapListener(
  onNavigate: (rideId: string) => void
): () => void {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as { rideId?: string };
    if (data?.rideId) {
      console.log('[Push] 👆 Tap sur notification, navigation vers trajet:', data.rideId);
      onNavigate(String(data.rideId));
    }
  });

  return () => subscription.remove();
}

/**
 * Envoie une notification Push via l'API Expo Push.
 */
export async function sendPushNotification(expoPushToken: string, title: string, body: string, data: any = {}) {
  const message = {
    to: expoPushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  };

  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
    console.log('[Push] ✅ Notification envoyée avec succès à', expoPushToken);
  } catch (error) {
    console.error('[Push] ❌ Erreur lors de l\'envoi de la notification:', error);
  }
}
