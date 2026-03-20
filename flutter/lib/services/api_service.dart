import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';
import '../models/train.dart';

class ApiService {
  // Change this to your server's IP when running on a real device
  static const String _baseUrl = 'http://localhost:3000';
  static const String _wsUrl = 'ws://localhost:3000/ws';

  WebSocketChannel? _channel;
  final StreamController<List<Train>> _trainController =
      StreamController<List<Train>>.broadcast();

  Stream<List<Train>> get trainStream => _trainController.stream;

  Future<List<Train>> fetchTrains() async {
    final results = await Future.wait([
      _fetchEndpoint('/api/trains'),
      _fetchEndpoint('/api/commuter/trains'),
    ]);
    final all = [...results[0], ...results[1]];
    return all;
  }

  Future<List<Train>> _fetchEndpoint(String path) async {
    try {
      final res = await http
          .get(Uri.parse('$_baseUrl$path'))
          .timeout(const Duration(seconds: 10));
      if (res.statusCode != 200) return [];
      final data = jsonDecode(res.body);
      final list = data is List ? data : (data['trains'] as List? ?? []);
      return list
          .cast<Map<String, dynamic>>()
          .map(Train.fromJson)
          .where((t) => t.hasPosition)
          .toList();
    } catch (_) {
      return [];
    }
  }

  void connectWebSocket() {
    try {
      _channel = WebSocketChannel.connect(Uri.parse(_wsUrl));
      _channel!.stream.listen(
        (message) {
          final data = jsonDecode(message as String);
          if (data['type'] == 'update' && data['trains'] != null) {
            final trains = (data['trains'] as List)
                .cast<Map<String, dynamic>>()
                .map(Train.fromJson)
                .where((t) => t.hasPosition)
                .toList();
            _trainController.add(trains);
          }
        },
        onDone: () => Future.delayed(
          const Duration(seconds: 5),
          connectWebSocket,
        ),
        onError: (_) => Future.delayed(
          const Duration(seconds: 5),
          connectWebSocket,
        ),
      );
    } catch (_) {
      Future.delayed(const Duration(seconds: 5), connectWebSocket);
    }
  }

  void dispose() {
    _channel?.sink.close();
    _trainController.close();
  }
}
