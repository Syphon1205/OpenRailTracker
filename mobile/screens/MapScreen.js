// ─── MapScreen ───────────────────────────────────────────────────────────────
// Shows all active trains on a map using react-native-maps.
// Works in Expo Go without any native builds.

import React, { useState, useCallback, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ScrollView, ActivityIndicator,
} from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrains } from "../hooks/useTrains";
import { THEME, STATUS_COLORS } from "../constants/config";

const INITIAL_REGION = {
  latitude:      39.5,
  longitude:    -98.35,
  latitudeDelta:  30,
  longitudeDelta: 50,
};

export default function MapScreen() {
  const insets                      = useSafeAreaInsets();
  const { trains, loading, error, refresh, lastUpdated } = useTrains();
  const [selected, setSelected]     = useState(null);
  const mapRef                      = useRef(null);

  const trainCount = trains.length;

  const handleMarkerPress = useCallback((train) => {
    setSelected(train);
  }, []);

  const handleFlyTo = useCallback((train) => {
    if (!train?.lat || !train?.lon) return;
    mapRef.current?.animateToRegion({
      latitude:      parseFloat(train.lat),
      longitude:     parseFloat(train.lon),
      latitudeDelta:  0.5,
      longitudeDelta: 0.5,
    }, 500);
  }, []);

  const delay      = selected?.delayMinutes ?? selected?.delay ?? 0;
  const delayText  = delay > 0 ? `+${delay} min late` : delay < 0 ? `${Math.abs(delay)} min early` : "On schedule";
  const statusColor = STATUS_COLORS[selected?.status ?? "unknown"];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>OpenRailTracker</Text>
          <Text style={styles.subtitle}>
            {loading ? "Loading…" : error ? `Error: ${error}` : `${trainCount} active trains`}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        mapType="mutedStandard"
        showsUserLocation
        showsCompass={false}
      >
        {trains.map((train) => {
          const lat = parseFloat(train.lat ?? train.latitude);
          const lon = parseFloat(train.lon ?? train.longitude);
          if (!lat || !lon || isNaN(lat) || isNaN(lon)) return null;
          const color = STATUS_COLORS[train.status ?? "unknown"];
          return (
            <Marker
              key={train.id ?? train.trainNumber ?? `${lat},${lon}`}
              coordinate={{ latitude: lat, longitude: lon }}
              onPress={() => handleMarkerPress(train)}
              tracksViewChanges={false}
            >
              <View style={[styles.trainMarker, { borderColor: color }]}>
                <View style={[styles.markerDot, { backgroundColor: color }]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* ── Loading overlay ── */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={THEME.primary} size="large" />
        </View>
      )}

      {/* ── Status pill ── */}
      {lastUpdated && !loading && (
        <View style={[styles.statusPill, { bottom: insets.bottom + 16 }]}>
          <Text style={styles.statusPillText}>
            Updated {lastUpdated.toLocaleTimeString()}
          </Text>
        </View>
      )}

      {/* ── Train detail sheet ── */}
      <Modal
        visible={!!selected}
        transparent
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setSelected(null)} />
        {selected && (
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            {/* Handle */}
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTrainId}>
                  Train {selected.trainNumber ?? selected.id ?? "—"}
                </Text>
                <Text style={styles.sheetAgency}>
                  {selected.source ?? selected.agency ?? "Unknown railroad"}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {selected.status ?? "unknown"}
                </Text>
              </View>
            </View>

            <View style={styles.sheetRow}>
              <SheetItem label="From"        value={selected.origin ?? "—"} />
              <SheetItem label="To"          value={selected.destination ?? "—"} />
            </View>
            <View style={styles.sheetRow}>
              <SheetItem label="Route"       value={selected.routeName ?? selected.route ?? "—"} />
              <SheetItem label="Delay"       value={delayText} valueColor={delay > 5 ? THEME.red : delay < 0 ? THEME.accent : THEME.green} />
            </View>
            {selected.speed != null && (
              <View style={styles.sheetRow}>
                <SheetItem label="Speed"     value={`${Math.round(selected.speed)} mph`} />
                <SheetItem label="Heading"   value={selected.bearing != null ? `${Math.round(selected.bearing)}°` : "—"} />
              </View>
            )}

            <View style={styles.sheetActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => { handleFlyTo(selected); setSelected(null); }}
              >
                <Text style={styles.actionBtnText}>📍 Center on map</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnOutline]}
                onPress={() => setSelected(null)}
              >
                <Text style={[styles.actionBtnText, { color: THEME.muted }]}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

function SheetItem({ label, value, valueColor }) {
  return (
    <View style={styles.sheetItem}>
      <Text style={styles.sheetLabel}>{label}</Text>
      <Text style={[styles.sheetValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: THEME.bg },
  header: {
    flexDirection:   "row",
    alignItems:      "center",
    justifyContent:  "space-between",
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  title:    { fontSize: 17, fontWeight: "700", color: THEME.text },
  subtitle: { fontSize: 13, color: THEME.muted, marginTop: 2 },
  refreshBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: THEME.surfaceHi,
    alignItems: "center", justifyContent: "center",
  },
  refreshIcon: { fontSize: 20, color: THEME.primary },

  map:    { flex: 1 },

  trainMarker: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, backgroundColor: THEME.bg,
    alignItems: "center", justifyContent: "center",
  },
  markerDot: { width: 8, height: 8, borderRadius: 4 },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,16,31,0.5)",
    alignItems: "center", justifyContent: "center",
  },

  statusPill: {
    position: "absolute",
    left: 12, right: 12,
    backgroundColor: "rgba(12,22,40,0.85)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    alignSelf: "center",
  },
  statusPillText: { fontSize: 12, color: THEME.muted, textAlign: "center" },

  /* Bottom sheet */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: THEME.surface,
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: THEME.border,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: THEME.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16,
  },
  sheetTrainId: { fontSize: 20, fontWeight: "700", color: THEME.text },
  sheetAgency:  { fontSize: 13, color: THEME.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  statusDot:  { width: 7, height: 7, borderRadius: 3.5 },
  statusText: { fontSize: 12, fontWeight: "600" },

  sheetRow:  { flexDirection: "row", gap: 12, marginBottom: 12 },
  sheetItem: { flex: 1, backgroundColor: THEME.bg, borderRadius: 8, padding: 10 },
  sheetLabel: { fontSize: 11, color: THEME.dim, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  sheetValue: { fontSize: 14, fontWeight: "600", color: THEME.text },

  sheetActions: { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: THEME.primary, alignItems: "center",
  },
  actionBtnOutline: { backgroundColor: THEME.bg },
  actionBtnText: { fontSize: 14, fontWeight: "600", color: "#fff" },
});
