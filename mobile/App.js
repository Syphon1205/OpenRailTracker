// ─── OpenRailTracker Mobile ──────────────────────────────────────────────────
import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "react-native";

import MapScreen     from "./screens/MapScreen";
import TrainsScreen  from "./screens/TrainsScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { THEME } from "./constants/config";

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Tab.Navigator
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: THEME.surface,
              borderTopColor:  THEME.border,
              borderTopWidth:  1,
            },
            tabBarActiveTintColor:   THEME.primary,
            tabBarInactiveTintColor: THEME.dim,
            tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          }}
        >
          <Tab.Screen
            name="Map"
            component={MapScreen}
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🗺️</Text> }}
          />
          <Tab.Screen
            name="Trains"
            component={TrainsScreen}
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>🚂</Text> }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ tabBarIcon: ({ color }) => <Text style={{ fontSize: 20 }}>⚙️</Text> }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
