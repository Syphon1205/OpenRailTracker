import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/train.dart';
import '../providers/train_provider.dart';

class TrainsScreen extends StatelessWidget {
  const TrainsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<TrainProvider>();
    final trains = provider.trains;

    return Scaffold(
      appBar: AppBar(
        title: Text('${trains.length} Trains'),
        actions: [
          IconButton(
            icon: Icon(
              Icons.timer_outlined,
              color: provider.showDelayedOnly ? Colors.orange : null,
            ),
            tooltip: 'Delayed only',
            onPressed: provider.toggleDelayedOnly,
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: provider.refresh,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(52),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search trains, routes…',
                prefixIcon: const Icon(Icons.search, size: 18),
                filled: true,
                fillColor: Theme.of(context).cardColor,
                contentPadding: const EdgeInsets.symmetric(vertical: 8),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: provider.setSearch,
            ),
          ),
        ),
      ),
      body: provider.loading && trains.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : provider.error != null && trains.isEmpty
              ? Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.wifi_off, size: 48, color: Colors.grey),
                      const SizedBox(height: 12),
                      Text('Cannot reach server',
                          style: TextStyle(color: Colors.grey.shade600)),
                      const SizedBox(height: 8),
                      ElevatedButton(
                          onPressed: provider.refresh,
                          child: const Text('Retry')),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: provider.refresh,
                  child: ListView.builder(
                    itemCount: trains.length,
                    itemBuilder: (context, index) =>
                        _TrainTile(train: trains[index]),
                  ),
                ),
    );
  }
}

class _TrainTile extends StatelessWidget {
  final Train train;
  const _TrainTile({required this.train});

  @override
  Widget build(BuildContext context) {
    final color = _hexColor(train.color) ?? Colors.blueGrey;
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: color,
        radius: 20,
        child: Text(
          train.trainNumber ?? '?',
          style: const TextStyle(
              color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
          overflow: TextOverflow.clip,
          maxLines: 1,
          textAlign: TextAlign.center,
        ),
      ),
      title: Text(
        train.routeName ?? 'Train ${train.trainNumber ?? train.id}',
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(fontWeight: FontWeight.w600),
      ),
      subtitle: Row(
        children: [
          if (train.source != null)
            Text(train.source!.toUpperCase(),
                style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
          if (train.destination != null) ...[
            Text(' → ', style: TextStyle(color: Colors.grey.shade400)),
            Expanded(
              child: Text(train.destination!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 12)),
            ),
          ],
        ],
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (train.isDelayed)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.orange.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: Colors.orange.withValues(alpha: 0.5)),
              ),
              child: Text(
                '+${train.delay}m',
                style: const TextStyle(
                    color: Colors.orange,
                    fontSize: 11,
                    fontWeight: FontWeight.w600),
              ),
            ),
          if (train.speed != null)
            Text('${train.speed!.round()} mph',
                style:
                    TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        ],
      ),
    );
  }

  Color? _hexColor(String? hex) {
    if (hex == null || hex.isEmpty) return null;
    try {
      return Color(int.parse('FF${hex.replaceFirst('#', '')}', radix: 16));
    } catch (_) {
      return null;
    }
  }
}
