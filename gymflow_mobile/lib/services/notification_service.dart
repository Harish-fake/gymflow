class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  bool _initialized = false;

  Future<void> initialize() async {
    if (_initialized) return;
    _initialized = true;
  }

  Future<void> showNotification({required String title, required String body}) async {
    print('Notification: $title - $body');
  }

  void checkForNewNotifications(List<dynamic> notifications) {
    if (notifications.isNotEmpty) {
      final latest = notifications.first;
      showNotification(
        title: latest['title'] ?? 'New Notification',
        body: latest['body'] ?? '',
      );
    }
  }

  void dispose() {}
}
