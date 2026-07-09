// app/_layout.tsx
import React from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import Header from "../components/header"; // Make sure the path matches your project
import './global.css';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SafeAreaView className="flex-1 bg-background">
        {/* 👇 Global Header appears on every screen */}
        <Header />

        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="products/[id]" />
        </Stack>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
