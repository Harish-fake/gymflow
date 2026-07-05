import 'dart:async';

class ConnectivityService {
  static final ConnectivityService _instance = ConnectivityService._internal();
  factory ConnectivityService() => _instance;
  ConnectivityService._internal();

  bool _isOnline = true;
  final StreamController<bool> _statusController = StreamController<bool>.broadcast();

  Stream<bool> get onStatusChanged => _statusController.stream;
  bool get isOnline => _isOnline;

  Future<void> initialize() async {
    _isOnline = true;
  }

  void setOnlineStatus(bool status) {
    if (_isOnline != status) {
      _isOnline = status;
      _statusController.add(status);
    }
  }

  void dispose() {
    _statusController.close();
  }
}
