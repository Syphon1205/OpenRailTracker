// ─── SettingsScreen ──────────────────────────────────────────────────────────
import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity, Switch, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { THEME, SERVER_URL } from "../constants/config";

export default function SettingsScreen() {
  const insets              = useSafeAreaInsets();
  const [serverUrl, setUrl] = useState(SERVER_URL);
  const [saved, setSaved]   = useState(false);

  const handleSave = async () => {
    try {
      await AsyncStorage.setItem("ort_server_url", serverUrl.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      Alert.alert("Error", "Couldn't save settings.");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
    >
      <Text style={styles.pageTitle}>Settings</Text>

      {/* ── Server section ── */}
      <SectionHeader title="Backend Server" />
      <View style={styles.card}>
        <Text style={styles.label}>Server URL</Text>
        <TextInput
          style={styles.input}
          value={serverUrl}
          onChangeText={setUrl}
          placeholder="http://192.168.1.x:3000"
          placeholderTextColor={THEME.dim}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <Text style={styles.hint}>
          On a physical device, replace localhost with your Mac's local IP address.
          Run <Text style={styles.code}>ipconfig getifaddr en0</Text> in Terminal to find it.
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, saved && styles.saveBtnSuccess]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>{saved ? "✓ Saved!" : "Save"}</Text>
        </TouchableOpacity>
      </View>

      {/* ── About section ── */}
      <SectionHeader title="About" />
      <View style={styles.card}>
        <AboutRow label="App"     value="OpenRailTracker Mobile" />
        <AboutRow label="Version" value="1.0.0" />
        <AboutRow label="Map"     value="react-native-maps" />
        <AboutRow label="Data"    value="GTFS-RT / Live feeds" />
      </View>

      {/* ── Data sources ── */}
      <SectionHeader title="Supported Railroads" />
      <View style={styles.card}>
        {[
          "Amtrak", "NJ Transit Rail", "MTA Metro-North",
          "MTA LIRR", "MBTA", "BART",
          "MARTA", "Metra", "Brightline",
          "VIA Rail Canada", "Caltrain", "Metrolink",
        ].map((rr) => (
          <View key={rr} style={styles.rrRow}>
            <Text style={styles.rr}>🚂 {rr}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function SectionHeader({ title }) {
  return <Text style={styles.sectionHeader}>{title.toUpperCase()}</Text>;
}

function AboutRow({ label, value }) {
  return (
    <View style={styles.aboutRow}>
      <Text style={styles.aboutLabel}>{label}</Text>
      <Text style={styles.aboutValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: THEME.bg },
  pageTitle: {
    fontSize: 28, fontWeight: "700", color: THEME.text,
    paddingHorizontal: 18, marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 11, fontWeight: "600", color: THEME.dim,
    letterSpacing: 1, paddingHorizontal: 18,
    marginTop: 20, marginBottom: 6,
  },
  card: {
    marginHorizontal: 12,
    backgroundColor: THEME.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: THEME.border,
    gap: 10,
  },
  label: { fontSize: 13, fontWeight: "600", color: THEME.muted },
  input: {
    backgroundColor: THEME.bg, borderRadius: 8,
    paddingHorizontal: 12, height: 44,
    borderWidth: 1, borderColor: THEME.border,
    fontSize: 15, color: THEME.text,
  },
  hint: { fontSize: 12, color: THEME.dim, lineHeight: 17 },
  code: { fontFamily: "monospace", color: THEME.accent },
  saveBtn: {
    backgroundColor: THEME.primary, borderRadius: 10,
    paddingVertical: 12, alignItems: "center",
  },
  saveBtnSuccess: { backgroundColor: THEME.green },
  saveBtnText:    { color: "#fff", fontWeight: "700", fontSize: 15 },

  aboutRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  aboutLabel: { fontSize: 13, color: THEME.muted },
  aboutValue: { fontSize: 13, color: THEME.text, fontWeight: "500" },

  rrRow: { paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: THEME.border },
  rr:    { fontSize: 14, color: THEME.text },
});
