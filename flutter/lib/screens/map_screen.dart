import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../models/train.dart';
import '../providers/train_provider.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  Train? _selectedTrain;

  static const _initialCenter = LatLng(39.5, -98.35);
  static const _initialZoom = 4.5;

  // Protomaps tile URL — replace API key if needed
  static const _tileUrl =
      'https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=a24904bac03ad7e4';

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TrainProvider>();
    final trains = provider.trains.where((t) => t.hasPosition).toList();

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              initialCenter: _initialCenter,
              initialZoom: _initialZoom,
              minZoom: 2.0,
              maxZoom: 16.0,
              onTap: (tp, ll) => setState(() => _selectedTrain = null),
            ),
            children: [
              TileLayer(
                urlTemplate: _tileUrl,
                userAgentPackageName: 'com.openrailtracker.app',
                maxZoom: 18,
              ),
              MarkerLayer(
                markers: trains
                    .map((train) => _buildMarker(train))
                    .toList(),
              ),
            ],
          ),

          // Top bar
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            left: 12,
            right: 12,
            child: Row(
              children: [
                _MapButton(
                  icon: Icons.my_location,
                  onPressed: _locateMe,
                  tooltip: 'My location',
                ),
                const SizedBox(width: 8),
                _MapButton(
                  icon: Icons.fit_screen,
                  onPressed: () => _fitToTrains(trains),
                  tooltip: 'Fit all trains',
                ),
                const SizedBox(width: 8),
                _MapButton(
                  icon: Icons.refresh,
                  onPressed: provider.refresh,
                  tooltip: 'Refresh',
                ),
                if (provider.loading)
                  const Padding(
                    padding: EdgeInsets.only(left: 10),
                    child: SizedBox(
                      width: 20,
                      height: 20,
                      child: CircularProgressIndicator(
                          strokeWidth: 2, color: Colors.white),
                    ),
                  ),
              ],
            ),
          ),

          // Train count badge
          Positioned(
            top: MediaQuery.of(context).padding.top + 8,
            right: 12,
            child: Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
              decoration: BoxDecoration(
                color: Colors.black87,
                borderRadius: BorderRadius.circular(20),
              ),
              child: Text(
                '${trains.length} trains',
                style: const TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w600),
              ),
            ),
          ),

          // Selected train card
          if (_selectedTrain != null)
            Positioned(
              bottom: 20,
              left: 16,
              right: 16,
              child: _TrainDetailCard(
                train: _selectedTrain!,
                onClose: () => setState(() => _selectedTrain = null),
              ),
            ),
        ],
      ),
    );
  }

  Marker _buildMarker(Train train) {
    final color = _parseColor(train.color) ?? _sourceColor(train.source);
    return Marker(
      point: LatLng(train.lat!, train.lon!),
      width: 36,
      height: 36,
      child: GestureDetector(
        onTap: () => setState(() => _selectedTrain = train),
        child: Container(
          width: 36,
          height: 36,
          decoration: BoxDecoration(
            color: color,
            shape: BoxShape.circle,
            border: Border.all(
              color: _selectedTrain?.id == train.id
                  ? Colors.white
                  : Colors.black26,
              width: _selectedTrain?.id == train.id ? 2.5 : 1,
            ),
            boxShadow: const [
              BoxShadow(
                  color: Colors.black38, blurRadius: 4, offset: Offset(0, 2))
            ],
          ),
          child: Center(
            child: Text(
              train.trainNumber ?? '?',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 9,
                fontWeight: FontWeight.bold,
              ),
              overflow: TextOverflow.clip,
              maxLines: 1,
              textAlign: TextAlign.center,
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _locateMe() async {
    try {
      var perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.deniedForever) return;
      final pos = await Geolocator.getCurrentPosition(
        locationSettings:
            const LocationSettings(accuracy: LocationAccuracy.medium),
      );
      _mapController.move(LatLng(pos.latitude, pos.longitude), 10);
    } catch (_) {}
  }

  void _fitToTrains(List<Train> trains) {
    if (trains.isEmpty) return;
    final lats = trains.map((t) => t.lat!);
    final lons = trains.map((t) => t.lon!);
    final bounds = LatLngBounds(
      LatLng(lats.reduce((a, b) => a < b ? a : b),
          lons.reduce((a, b) => a < b ? a : b)),
      LatLng(lats.reduce((a, b) => a > b ? a : b),
          lons.reduce((a, b) => a > b ? a : b)),
    );
    _mapController.fitCamera(
      CameraFit.bounds(bounds: bounds, padding: const EdgeInsets.all(40)),
    );
  }

  Color? _parseColor(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    try {
      final clean = hex.replaceFirst('#', '');
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return null;
    }
  }

  Color _sourceColor(String? source) {
    final map = <String, Color>{
      'amtrak': const Color(0xFF1565C0),
      'via': const Color(0xFF1B5E20),
      'metrolink': const Color(0xFFE65100),
      'metra': const Color(0xFF4A148C),
      'mta': const Color(0xFFB71C1C),
      'lirr': const Color(0xFF880E4F),
      'njt': const Color(0xFF558B2F),
      'dart': const Color(0xFF006064),
      'bart': const Color(0xFF1A237E),
      'sounder': const Color(0xFF0D47A1),
    };
    final key = source?.toLowerCase() ?? '';
    return map.entries
            .firstWhere(
              (e) => key.contains(e.key),
              orElse: () => const MapEntry('', Color(0xFF37474F)),
            )
            .value;
  }
}

class _MapButton extends StatelessWidget {
  final IconData icon;
  final VoidCallback onPressed;
  final String tooltip;

  const _MapButton(
      {required this.icon, required this.onPressed, required this.tooltip});

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.black87,
        borderRadius: BorderRadius.circular(8),
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(8),
          child: Padding(
            padding: const EdgeInsets.all(8),
            child: Icon(icon, color: Colors.white, size: 20),
          ),
        ),
      ),
    );
  }
}

class _TrainDetailCard extends StatelessWidget {
  final Train train;
  final VoidCallback onClose;

  const _TrainDetailCard({required this.train, required this.onClose});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 8,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      color: Theme.of(context).cardColor,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    train.routeName ??
                        'Train ${train.trainNumber ?? train.id}',
                    style: const TextStyle(
                        fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ),
                IconButton(
                  onPressed: onClose,
                  icon: const Icon(Icons.close, size: 18),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 6),
            if (train.source != null)
              _row(Icons.train, train.source!.toUpperCase()),
            if (train.destination != null)
              _row(Icons.location_on, 'To: ${train.destination}'),
            if (train.status != null) _row(Icons.info_outline, train.status!),
            if (train.delay != null && train.delay! > 0)
              _row(Icons.timer_outlined, '${train.delay} min late',
                  color: Colors.orange),
            if (train.speed != null)
              _row(Icons.speed, '${train.speed!.round()} mph'),
          ],
        ),
      ),
    );
  }

  Widget _row(IconData icon, String text, {Color? color}) => Padding(
        padding: const EdgeInsets.only(top: 4),
        child: Row(
          children: [
            Icon(icon, size: 14, color: color ?? Colors.grey),
            const SizedBox(width: 6),
            Expanded(
              child: Text(text,
                  style: TextStyle(fontSize: 13, color: color),
                  overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
      );
}
