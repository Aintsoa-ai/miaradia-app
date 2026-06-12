import "../global.css";
import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";
import { useEffect, useRef } from "react";
import { CustomAlertComponent } from "../components/CustomAlert";
import { autoStartSmsListener } from "../lib/smsAutoStart";
import { registerForPushNotificationsAsync, savePushToken, addNotificationTapListener } from "../lib/notifications";
import { supabase } from "../lib/supabase";

export default function Layout() {
  const router = useRouter();
  const isSigningOut = useRef(false);

  useEffect(() => {
    // 🔒 Écouteur GLOBAL de l'état d'authentification
    // Dès qu'un signOut est détecté, redirige automatiquement vers /login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        isSigningOut.current = true;
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        } else {
          try { router.replace('/login' as any); } catch (e) {}
        }
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Démarrer le listener SMS automatiquement au lancement (Android uniquement)
    autoStartSmsListener();

    // Enregistrer pour les notifications push
    const initPushNotifications = async () => {
      try {
        const token = await registerForPushNotificationsAsync();
        if (token) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            await savePushToken(session.user.id, token);
          }
        }
      } catch (e) {
        console.error("Erreur init push:", e);
      }
    };
    initPushNotifications();

    // 🔔 Listener : redirige vers le trajet quand l'utilisateur tape sur une notification
    const removeTapListener = addNotificationTapListener((rideId) => {
      router.push(`/ride/${rideId}`);
    });

    // Protection anti-inspection sur le Web
    if (Platform.OS === "web") {
      const disableInspect = (e: KeyboardEvent) => {
        if (e.key === "F12") e.preventDefault();
        if (
          (e.ctrlKey || e.metaKey) &&
          (e.shiftKey || e.altKey) &&
          ["I", "J", "C"].includes(e.key.toUpperCase())
        ) {
          e.preventDefault();
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
          e.preventDefault();
        }
      };
      const disableContextMenu = (e: MouseEvent) => e.preventDefault();

      window.addEventListener("keydown", disableInspect);
      window.addEventListener("contextmenu", disableContextMenu);

      return () => {
        window.removeEventListener("keydown", disableInspect);
        window.removeEventListener("contextmenu", disableContextMenu);
        removeTapListener();
      };
    }

    return () => {
      removeTapListener();
    };
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ride/[id]" options={{ presentation: 'card' }} />
      </Stack>
      <CustomAlertComponent />
    </>
  );
}
