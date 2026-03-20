class Train {
  final String id;
  final String? trainNumber;
  final String? routeName;
  final String? source;
  final double? lat;
  final double? lon;
  final double? speed;
  final String? status;
  final String? destination;
  final String? origin;
  final int? delay; // minutes
  final String? color;

  const Train({
    required this.id,
    this.trainNumber,
    this.routeName,
    this.source,
    this.lat,
    this.lon,
    this.speed,
    this.status,
    this.destination,
    this.origin,
    this.delay,
    this.color,
  });

  bool get hasPosition => lat != null && lon != null;
  bool get isDelayed => (delay ?? 0) > 5;
  bool get isLive => status?.toLowerCase().contains("moving") == true ||
      (speed ?? 0) > 1;

  factory Train.fromJson(Map<String, dynamic> j) {
    final rawLat = j['lat'];
    final rawLon = j['lon'] ?? j['lng'];
    return Train(
      id: j['id']?.toString() ?? j['trainNumber']?.toString() ?? '',
      trainNumber: j['trainNumber']?.toString(),
      routeName: j['routeName']?.toString() ?? j['routeShortName']?.toString(),
      source: j['source']?.toString(),
      lat: rawLat != null ? (rawLat as num).toDouble() : null,
      lon: rawLon != null ? (rawLon as num).toDouble() : null,
      speed: j['speed'] != null ? (j['speed'] as num).toDouble() : null,
      status: j['status']?.toString(),
      destination: j['destination']?.toString(),
      origin: j['origin']?.toString(),
      delay: j['delay'] != null ? (j['delay'] as num).round() : null,
      color: j['color']?.toString(),
    );
  }
}
