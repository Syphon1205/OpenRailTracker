// ─── TrainsScreen ────────────────────────────────────────────────────────────
// Scrollable, searchable list of all active trains.

import React, { useState, useMemo } from "react";
import {
  View, Text, StyleSheet, FlatList,
  TextInput, TouchableOpacity, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTrains } from "../hooks/useTrains";
import TrainCard from "../components/TrainCard";
import { THEME } from "../constants/config";

const STATUSES = ["all", "on-time", "early", "late", "delayed"];
const STATUS_LABEL = { all: "All", "on-time": "On Time", early: "Early", late: "Late", delayed: "Delayed" };

export default function TrainsScreen() {
  const insets  = useSafeAreaInsets();
  const { trains, loading, error, refresh, lastUpdated } = useTrains();

  const [query,     setQuery]     = useState("");
  const [statusFilter, setStatus] = useState("all");
  const [selected, setSelected]   = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return trains.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (t.trainNumber ?? "").toLowerCase().includes(q) ||
        (t.id          ?? "").toLowerCase().includes(q) ||
        (t.origin      ?? "").toLowerCase().includes(q) ||
        (t.destination ?? "").toLowerCase().includes(q) ||
        (t.source      ?? "").toLowerCase().includes(q) ||
        (t.routeName   ?? "").toLowerCase().includes(q)
      );
    });
  }, [trains, query, statusFilter]);

  const liveCount    = trains.filter((t) => t.status === "on-time" || t.status === "early").length;
  const delayedCount = trains.filter((t) => t.status === "delayed" || t.status === "late").length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Trains</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={refresh}>
            <Text style={styles.refreshIcon}>↻</Text>
          </TouchableOpacity>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatChip label="Total"   value={trains.length} color={THEME.primary} />
          <StatChip label="On Time" value={liveCount}     color={THEME.green}   />
          <StatChip label="Delayed" value={delayedCount}  color={THEME.red}     />
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Search trains, routes, stations…"
            placeholderTextColor={THEME.dim}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>

        {/* Status filter chips */}
        <View style={styles.chips}>
          {STATUSES.map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.chip, statusFilter === s && styles.chipActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, statusFilter === s && styles.chipTextActive]}>
                {STATUS_LABEL[s]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── List ── */}
      {loading && trains.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator color={THEME.primary} size="large" />
          <Text style={styles.loadingText}>Loading trains…</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>Couldn't load trains</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(t) => t.id ?? t.trainNumber ?? Math.random().toString()}
          renderItem={({ item }) => <TrainCard train={item} onPress={() => {}} />}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 16 }}
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyIcon}>🚂</Text>
              <Text style={styles.emptyText}>No trains match your search</Text>
            </View>
          }
          refreshing={loading}
          onRefresh={refresh}
        />
      )}

      {/* ── Footer timestamp ── */}
      {lastUpdated && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Text style={styles.footerText}>
            Updated {lastUpdated.toLocaleTimeString()}  ·  {filtered.length} of {trains.length} trains
          </Text>
        </View>
      )}
    </View>
  );
}

function StatChip({ label, value, color }) {
  return (
    <View style={[styles.statChip, { borderColor: color + "33" }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: THEME.bg },
  header: {
    backgroundColor: THEME.surface,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
    paddingHorizontal: 14,
    paddingBottom: 12,
    gap: 10,
  },
  headerTop: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 14,
  },
  title:       { fontSize: 22, fontWeight: "700", color: THEME.text },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: THEME.bg, alignItems: "center", justifyContent: "center",
  },
  refreshIcon: { fontSize: 20, color: THEME.primary },

  statsRow:  { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1, paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: THEME.bg, borderRadius: 10,
    borderWidth: 1, alignItems: "center",
  },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11, color: THEME.muted, marginTop: 1 },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: THEME.bg, borderRadius: 10,
    paddingHorizontal: 12, height: 42,
    borderWidth: 1, borderColor: THEME.border,
  },
  searchIcon:  { fontSize: 18, color: THEME.dim, marginRight: 8 },
  searchInput: { flex: 1, fontSize: 15, color: THEME.text },

  chips:      { flexDirection: "row", gap: 6 },
  chip: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 20,
    backgroundColor: THEME.bg, borderWidth: 1, borderColor: THEME.border,
  },
  chipActive:     { backgroundColor: THEME.primary, borderColor: THEME.primary },
  chipText:       { fontSize: 12, fontWeight: "500", color: THEME.muted },
  chipTextActive: { color: "#fff" },

  centered:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 40 },
  loadingText: { color: THEME.muted, fontSize: 15 },
  emptyIcon:   { fontSize: 40 },
  emptyText:   { color: THEME.muted, fontSize: 15, textAlign: "center" },
  errorIcon:   { fontSize: 36 },
  errorText:   { color: THEME.text,  fontSize: 17, fontWeight: "600" },
  errorSub:    { color: THEME.muted, fontSize: 13, textAlign: "center" },
  retryBtn: {
    marginTop: 4, paddingVertical: 10, paddingHorizontal: 24,
    backgroundColor: THEME.primary, borderRadius: 10,
  },
  retryBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  footer: {
    paddingHorizontal: 14, paddingTop: 8,
    backgroundColor: THEME.surface,
    borderTopWidth: 1, borderTopColor: THEME.border,
  },
  footerText: { fontSize: 12, color: THEME.dim, textAlign: "center" },
});
