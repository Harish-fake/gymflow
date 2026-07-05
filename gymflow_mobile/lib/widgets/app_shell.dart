import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../config/theme.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../services/notification_service.dart';

class AppShell extends ConsumerStatefulWidget {
  final String title;
  final List<Widget>? actions;
  final Widget body;
  final int currentIndex;
  final bool showBackButton;

  const AppShell({
    super.key,
    required this.title,
    this.actions,
    required this.body,
    this.currentIndex = 0,
    this.showBackButton = false,
  });

  @override
  ConsumerState<AppShell> createState() => _AppShellState();
}

class _AppShellState extends ConsumerState<AppShell> with WidgetsBindingObserver {
  final _api = ApiService();
  int _unreadCount = 0;
  Timer? _refreshTimer;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _fetchUnreadCount();
    _refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) => _fetchUnreadCount());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _fetchUnreadCount();
  }

  Future<void> _fetchUnreadCount() async {
    try {
      final result = await _api.getNotifications(unreadOnly: true);
      final notifications = result['notifications'] as List? ?? [];
      if (mounted) {
        setState(() => _unreadCount = notifications.length);
        NotificationService().checkForNewNotifications(notifications);
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final role = authState.role;
    final selectedGymName = authState.selectedGymName;

    List<BottomNavigationBarItem> items;
    List<String> destinations;

    if (role == 'admin' || role == 'superadmin') {
      items = const [
        BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
        BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Members'),
        BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Attendance'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
      ];
      destinations = ['/admin/dashboard', '/admin/members', '/admin/attendance', '/profile'];
    } else if (role == 'trainer') {
      items = const [
        BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
        BottomNavigationBarItem(icon: Icon(Icons.people), label: 'Members'),
        BottomNavigationBarItem(icon: Icon(Icons.fitness_center), label: 'Workouts'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
      ];
      destinations = ['/trainer/dashboard', '/trainer/members', '/trainer/workouts/create', '/profile'];
    } else {
      items = const [
        BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
        BottomNavigationBarItem(icon: Icon(Icons.calendar_today), label: 'Attendance'),
        BottomNavigationBarItem(icon: Icon(Icons.fitness_center), label: 'Workouts'),
        BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
      ];
      destinations = ['/member/dashboard', '/member/attendance', '/member/workouts', '/profile'];
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(selectedGymName != null && selectedGymName.isNotEmpty
            ? selectedGymName
            : widget.title),
        actions: [
          if (widget.actions != null) ...widget.actions!,
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => context.push('/notifications'),
              ),
              if (_unreadCount > 0)
                Positioned(
                  right: 6,
                  top: 6,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: GymFlowColors.error,
                      shape: BoxShape.circle,
                    ),
                    child: Text(
                      '$_unreadCount',
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                  ),
                ),
            ],
          ),
        ],
      ),
      body: widget.body,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: widget.currentIndex,
        onTap: (i) {
          if (i < destinations.length) {
            context.go(destinations[i]);
          }
        },
        items: items,
      ),
    );
  }
}
