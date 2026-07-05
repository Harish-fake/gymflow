import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../config/theme.dart';
import '../../providers/auth_provider.dart';

class SplashScreen extends ConsumerStatefulWidget {
  const SplashScreen({super.key});

  @override
  ConsumerState<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends ConsumerState<SplashScreen> {
  double _opacity = 0;
  String _statusText = 'Initializing...';
  bool _showRetry = false;
  Timer? _retryTimer;
  bool _retrying = false;

  @override
  void initState() {
    super.initState();
    _startAnimations();
    _startRetryTimer();
  }

  @override
  void dispose() {
    _retryTimer?.cancel();
    super.dispose();
  }

  void _startAnimations() {
    Future.microtask(() {
      if (mounted) setState(() => _opacity = 1);
    });

    Future.delayed(const Duration(milliseconds: 800), () {
      if (mounted) setState(() => _statusText = 'Loading your profile...');
    });

    Future.delayed(const Duration(seconds: 2), () {
      if (!mounted) return;
      final authState = ref.read(authProvider);
      if (!authState.isLoading) {
        _navigate(authState);
      }
    });
  }

  void _startRetryTimer() {
    _retryTimer = Timer(const Duration(seconds: 10), () {
      if (mounted) setState(() => _showRetry = true);
    });
  }

  void _navigate(AuthState authState) {
    if (authState.isAuthenticated) {
      if (authState.selectedGymId == null) {
        context.go('/gym-selection');
      } else {
        switch (authState.role) {
          case 'admin':
          case 'superadmin':
            context.go('/admin/dashboard');
            break;
          case 'trainer':
            context.go('/trainer/dashboard');
            break;
          default:
            context.go('/member/dashboard');
        }
      }
    } else {
      context.go('/login');
    }
  }

  void _retry() {
    setState(() {
      _showRetry = false;
      _statusText = 'Retrying...';
      _retrying = true;
    });
    _retryTimer?.cancel();
    ref.read(authProvider.notifier).loadSavedSession().then((_) {
      if (mounted) setState(() => _retrying = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (_, state) {
      if (!state.isLoading && !_retrying) {
        _navigate(state);
      }
    });

    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [GymFlowColors.primary, GymFlowColors.primaryDark],
          ),
        ),
        child: Center(
          child: AnimatedOpacity(
            opacity: _opacity,
            duration: const Duration(milliseconds: 600),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.fitness_center, size: 80, color: Colors.white),
                const SizedBox(height: 24),
                const Text(
                  'GymFlow',
                  style: TextStyle(fontSize: 36, fontWeight: FontWeight.bold, color: Colors.white),
                ),
                const SizedBox(height: 8),
                Text(
                  _statusText,
                  style: const TextStyle(fontSize: 16, color: Colors.white70),
                ),
                if (_showRetry) ...[
                  const SizedBox(height: 32),
                  ElevatedButton.icon(
                    onPressed: _retry,
                    icon: const Icon(Icons.refresh),
                    label: const Text('Retry'),
                    style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: GymFlowColors.primary),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
