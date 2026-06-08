import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#00AFF5',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    token = await Notifications.getExpoPushTokenAsync({
      projectId: 'b56eb1bb-cb46-4e00-a544-77e8abfccbba', // We'll just let Expo resolve it if possible, but projectId might be required if using EAS
    }).then(t => t.data).catch(e => {
        console.error("Error getting Expo Push Token:", e);
        return null;
    });
    console.log("EXPO PUSH TOKEN:", token);
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function savePushToken(userId: string, token: string) {
    if (!token) return;
    try {
        await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    } catch (e) {
        console.error('Error saving push token', e);
    }
}
