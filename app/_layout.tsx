import "../global.css";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useEffect } from "react";
import { CustomAlertComponent, CustomAlertRef } from "../components/CustomAlert";

export default function Layout() {
  useEffect(() => {
    // Protection anti-inspection uniquement sur le Web
    if (Platform.OS === "web") {
      const disableInspect = (e: KeyboardEvent) => {
        // Bloquer F12
        if (e.key === "F12") {
          e.preventDefault();
        }
        // Bloquer Ctrl+Shift+I / J / C (Windows) et Cmd+Option+I / J / C (Mac)
        if (
          (e.ctrlKey || e.metaKey) && 
          (e.shiftKey || e.altKey) && 
          ["I", "J", "C"].includes(e.key.toUpperCase())
        ) {
          e.preventDefault();
        }
        // Bloquer Ctrl+U (Voir le code source)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "u") {
          e.preventDefault();
        }
      };

      const disableContextMenu = (e: MouseEvent) => {
        e.preventDefault();
      };

      // Activer les protections
      window.addEventListener("keydown", disableInspect);
      window.addEventListener("contextmenu", disableContextMenu);

      return () => {
        window.removeEventListener("keydown", disableInspect);
        window.removeEventListener("contextmenu", disableContextMenu);
      };
    }
  }, []);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }} initialRouteName="welcome">
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="ride/[id]" options={{ presentation: 'card' }} />
      </Stack>
      <CustomAlertComponent ref={CustomAlertRef} />
    </>
  );
}
