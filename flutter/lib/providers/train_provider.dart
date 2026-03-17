import 'package:flutter/foundation.dart';
import '../models/train.dart';
import '../services/api_service.dart';

class TrainProvider extends ChangeNotifier {
  final ApiService _api = ApiService();

  List<Train> _trains = [];
  bool _loading = false;
  String? _error;
  String _searchQuery = '';
  bool _showDelayedOnly = false;

  List<Train> get trains => _filtered;
  bool get loading => _loading;
  String? get error => _error;
  String get searchQuery => _searchQuery;
  bool get showDelayedOnly => _showDelayedOnly;

  List<Train> get _filtered {
    var list = _trains;
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((t) {
        return (t.trainNumber?.toLowerCase().contains(q) ?? false) ||
            (t.routeName?.toLowerCase().contains(q) ?? false) ||
            (t.source?.toLowerCase().contains(q) ?? false) ||
            (t.destination?.toLowerCase().contains(q) ?? false);
      }).toList();
    }
    if (_showDelayedOnly) {
      list = list.where((t) => t.isDelayed).toList();
    }
    return list;
  }

  void init() {
    _api.trainStream.listen((trains) {
      _trains = trains;
      notifyListeners();
    });
    _api.connectWebSocket();
    refresh();
  }

  Future<void> refresh() async {
    _loading = true;
    _error = null;
    notifyListeners();
    try {
      _trains = await _api.fetchTrains();
    } catch (e) {
      _error = e.toString();
    } finally {
      _loading = false;
      notifyListeners();
    }
  }

  void setSearch(String q) {
    _searchQuery = q;
    notifyListeners();
  }

  void toggleDelayedOnly() {
    _showDelayedOnly = !_showDelayedOnly;
    notifyListeners();
  }

  @override
  void dispose() {
    _api.dispose();
    super.dispose();
  }
}
