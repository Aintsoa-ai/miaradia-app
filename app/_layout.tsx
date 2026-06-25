import "../global.css";
import { Stack, useRouter } from "expo-router";
import { Platform } from "react-native";
import React, { useEffect, useRef, Suspense } from "react";
// Import lazy pour réduire le bundle initial
const CustomAlertComponent = React.lazy(() => import("../components/CustomAlert").then(m => ({ default: m.CustomAlertComponent })));
import { supabase } from "../lib/supabase";
import { LanguageProvider } from "../hooks/useTranslation";
import * as Updates from 'expo-updates';

export default function Layout() {
  const router = useRouter();
  const isSigningOut = useRef(false);

  useEffect(() => {
    // 🔒 Écouteur GLOBAL de l'état d'authentification
    // Dès qu'un signOut est détecté, redirige automatiquement vers /login
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        isSigningOut.current = true;
        if (Platform.OS === 'web') {
          if (typeof window !== 'undefined') window.location.href = '/login';
        } else {
          try { router.replace('/login' as any); } catch (e) {}
        }
      }
    });
    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 🔄 Vérification des mises à jour OTA (Over-The-Air)
    async function onFetchUpdateAsync() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          import("../utils/alert").then(({ CustomAlert }) => {
            const now = new Date();
            const dateStr = now.toLocaleDateString('fr-FR');
            const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
            
            CustomAlert.alert(
              "Mise à jour disponible 🚀",
              `Une nouvelle version de l'application a été téléchargée le ${dateStr} à ${timeStr}.\n\nL'application va redémarrer pour l'appliquer.`,
              [{ text: "Redémarrer l'application", onPress: () => Updates.reloadAsync() }]
            );
          });
        }
      } catch (error) {
        console.log(`Error fetching latest Expo update: ${error}`);
      }
    }
    
    if (Platform.OS !== "web" && !__DEV__) {
      onFetchUpdateAsync();
    }

    // Démarrer le listener SMS automatiquement au lancement (Android uniquement)
    import("../lib/smsAutoStart").then(m => m.autoStartSmsListener());

    // Enregistrer pour les notifications push
    const initPushNotifications = async () => {
      try {
        const { registerForPushNotificationsAsync, savePushToken } = await import("../lib/notifications");
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

    let removeTapListener: (() => void) | undefined;
    // 🔔 Listener : redirige vers le trajet quand l'utilisateur tape sur une notification
    import("../lib/notifications").then(m => {
      removeTapListener = m.addNotificationTapListener((rideId) => {
        router.push(`/ride/${rideId}`);
      });
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

      // 🛑 Piège à DevTools : Si l'inspecteur est ouvert, l'app se fige constamment
      const debuggerTrap = setInterval(() => {
        // eslint-disable-next-line no-debugger
        debugger;
      }, 100);

      return () => {
        window.removeEventListener("keydown", disableInspect);
        window.removeEventListener("contextmenu", disableContextMenu);
        clearInterval(debuggerTrap);
        if (removeTapListener) removeTapListener();
      };
    }

    return () => {
      if (removeTapListener) removeTapListener();
    };
  }, []);

  return (
    <LanguageProvider>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ride/[id]" options={{ presentation: 'card' }} />
      </Stack>
      <Suspense fallback={null}>
        <CustomAlertComponent />
      </Suspense>
    </LanguageProvider>
  );
}
