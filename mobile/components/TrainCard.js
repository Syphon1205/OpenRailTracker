// ─── TrainCard component ─────────────────────────────────────────────────────
import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { THEME, STATUS_COLORS, STATUS_LABELS } from "../constants/config";

const TrainCard = memo(({ train, onPress }) => {
  const status    = train.status ?? "unknown";
  const dotColor  = STATUS_COLORS[status] ?? STATUS_COLORS.unknown;
  const label     = STATUS_LABELS[status]  ?? "Unknown";

  const delay = train.delayMinutes ?? train.delay ?? 0;
  const delayText = delay > 0 ? `+${delay} min` : delay < 0 ? `${delay} min` : null;

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress?.(train)} activeOpacity={0.75}>
      {/* Left accent stripe = status color */}
      <View style={[styles.stripe, { backgroundColor: dotColor }]} />

      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.trainId} numberOfLines={1}>
            {train.trainNumber ?? train.id ?? "—"}
          </Text>
          <View style={[styles.badge, { backgroundColor: dotColor + "22" }]}>
            <View style={[styles.dot, { backgroundColor: dotColor }]} />
            <Text style={[styles.badgeText, { color: dotColor }]}>{label}</Text>
          </View>
        </View>

        <Text style={styles.route} numberOfLines={1}>
          {train.origin ?? "?"} → {train.destination ?? "?"}
        </Text>

        <View style={styles.meta}>
          <Text style={styles.metaItem}>
            🚂 {train.source ?? train.agency ?? "—"}
          </Text>
          {train.routeName ? (
            <Text style={styles.metaItem} numberOfLines={1}>📍 {train.routeName}</Text>
          ) : null}
          {delayText ? (
            <Text style={[styles.metaItem, { color: delay > 5 ? THEME.red : THEME.yellow }]}>
              ⏱ {delayText}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export default TrainCard;

const styles = StyleSheet.create({
  card: {
    flexDirection:   "row",
    backgroundColor: THEME.surface,
    borderRadius:    10,
    marginHorizontal: 12,
    marginBottom:    8,
    overflow:        "hidden",
    borderWidth:     1,
    borderColor:     THEME.border,
  },
  stripe: {
    width:  4,
    alignSelf: "stretch",
  },
  body: {
    flex:    1,
    padding: 12,
    gap:     4,
  },
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    gap: 8,
  },
  trainId: {
    fontSize:   15,
    fontWeight: "700",
    color:      THEME.text,
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           5,
    paddingHorizontal: 8,
    paddingVertical:   3,
    borderRadius:  20,
  },
  dot: {
    width:        6,
    height:       6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize:   11,
    fontWeight: "600",
  },
  route: {
    fontSize: 13,
    color:    THEME.muted,
  },
  meta: {
    flexDirection: "row",
    flexWrap:      "wrap",
    gap:           8,
    marginTop:     2,
  },
  metaItem: {
    fontSize: 12,
    color:    THEME.dim,
  },
});
