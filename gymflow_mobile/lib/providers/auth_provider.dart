import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';
import '../models/user.dart';
import '../config/constants.dart';

class AuthState {
  final bool isAuthenticated;
  final bool isLoading;
  final String? error;
  final User? user;
  final UserProfile? profile;
  final String? token;
  final String? role;
  final List<Gym> gyms;
  final String? selectedGymId;
  final String? selectedGymName;

  const AuthState({
    this.isAuthenticated = false,
    this.isLoading = true,
    this.error,
    this.user,
    this.profile,
    this.token,
    this.role,
    this.gyms = const [],
    this.selectedGymId,
    this.selectedGymName,
  });

  AuthState copyWith({
    bool? isAuthenticated,
    bool? isLoading,
    String? error,
    User? user,
    UserProfile? profile,
    String? token,
    String? role,
    List<Gym>? gyms,
    String? selectedGymId,
    String? selectedGymName,
    bool clearError = false,
  }) {
    return AuthState(
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
      isLoading: isLoading ?? this.isLoading,
      error: clearError ? null : (error ?? this.error),
      user: user ?? this.user,
      profile: profile ?? this.profile,
      token: token ?? this.token,
      role: role ?? this.role,
      gyms: gyms ?? this.gyms,
      selectedGymId: selectedGymId ?? this.selectedGymId,
      selectedGymName: selectedGymName ?? this.selectedGymName,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiService _api;

  AuthNotifier(this._api) : super(const AuthState()) {
    _init();
  }

  Future<void> _init() async {
    await _api.init();
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(StorageKeys.token);
    final role = prefs.getString(StorageKeys.userRole);
    final gymId = prefs.getString(StorageKeys.selectedGymId);
    final gymName = prefs.getString(StorageKeys.selectedGymName);

    final cachedAuth = prefs.getString('cached_auth_state');
    if (cachedAuth != null) {
      try {
        final data = jsonDecode(cachedAuth) as Map<String, dynamic>;
        final cachedUser = data['user'] != null ? User.fromJson(data['user']) : null;
        final cachedProfile = data['profile'] != null ? UserProfile.fromJson(data['profile']) : null;
        final cachedGyms = data['gyms'] != null
            ? (data['gyms'] as List).map((g) => Gym.fromJson(g)).toList()
            : <Gym>[];

        state = state.copyWith(
          isAuthenticated: data['is_authenticated'] ?? false,
          isLoading: true,
          user: cachedUser ?? state.user,
          profile: cachedProfile ?? state.profile,
          role: cachedUser?.role ?? role,
          gyms: cachedGyms.isNotEmpty ? cachedGyms : state.gyms,
          selectedGymId: gymId,
          selectedGymName: gymName,
        );
      } catch (_) {}
    }

    if (token != null) {
      final tokenExpiry = prefs.getInt('token_expiry');
      if (tokenExpiry != null && DateTime.now().millisecondsSinceEpoch > tokenExpiry) {
        await _api.clearTokens();
        await prefs.remove(StorageKeys.token);
        await prefs.remove(StorageKeys.refreshToken);
        await prefs.remove(StorageKeys.userRole);
        await prefs.remove(StorageKeys.userId);
        await prefs.remove('cached_auth_state');
        state = state.copyWith(isLoading: false);
        return;
      }

      try {
        final profile = await _api.getProfile();
        final userData = profile['user'];
        final profileData = profile['profile'];
        final gymsData = profile['gyms'];

        final user = userData != null ? User.fromJson(userData) : null;
        final userProfile = profileData != null ? UserProfile.fromJson(profileData) : null;
        final gyms = gymsData != null ? (gymsData as List).map((g) => Gym.fromJson(g)).toList() : <Gym>[];

        await _cacheAuthState(user, userProfile, gyms, prefs);

        state = state.copyWith(
          isAuthenticated: true,
          isLoading: false,
          user: user,
          profile: userProfile,
          role: user?.role ?? role,
          gyms: gyms,
          selectedGymId: gymId,
          selectedGymName: gymName,
        );
      } catch (e) {
        await _api.clearTokens();
        await prefs.remove(StorageKeys.token);
        await prefs.remove(StorageKeys.refreshToken);
        await prefs.remove(StorageKeys.userRole);
        await prefs.remove(StorageKeys.userId);
        await prefs.remove('cached_auth_state');
        state = const AuthState(isLoading: false);
      }
    } else {
      state = state.copyWith(isLoading: false);
    }
  }

  Future<void> _cacheAuthState(User? user, UserProfile? profile, List<Gym> gyms, SharedPreferences prefs) async {
    final cacheData = {
      'is_authenticated': true,
      'user': user?.toJson(),
      'profile': profile?.toJson(),
      'gyms': gyms.map((g) => g.toJson()).toList(),
    };
    await prefs.setString('cached_auth_state', jsonEncode(cacheData));
  }

  Future<void> loadSavedSession() async {
    state = const AuthState(isLoading: true);
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(StorageKeys.token);
    if (token != null) {
      _api.setToken(token);
      final refreshToken = prefs.getString(StorageKeys.refreshToken);
      if (refreshToken != null) _api.setRefreshToken(refreshToken);
      try {
        final profile = await _api.getProfile();
        final userData = profile['user'];
        final profileData = profile['profile'];
        final gymsData = profile['gyms'];
        final user = userData != null ? User.fromJson(userData) : null;
        final userProfile = profileData != null ? UserProfile.fromJson(profileData) : null;
        final gyms = gymsData != null ? (gymsData as List).map((g) => Gym.fromJson(g)).toList() : <Gym>[];
        final gymId = prefs.getString(StorageKeys.selectedGymId);
        final gymName = prefs.getString(StorageKeys.selectedGymName);
        await _cacheAuthState(user, userProfile, gyms, prefs);
        state = state.copyWith(
          isAuthenticated: true, isLoading: false,
          user: user, profile: userProfile,
          role: user?.role, gyms: gyms,
          selectedGymId: gymId, selectedGymName: gymName,
        );
      } catch (e) {
        await _api.clearTokens();
        await prefs.remove(StorageKeys.token);
        await prefs.remove('cached_auth_state');
        state = const AuthState(isLoading: false);
      }
    } else {
      state = const AuthState(isLoading: false);
    }
  }

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null, clearError: true);
    try {
      final result = await _api.login(email, password);
      final user = User.fromJson(result['user']);
      final gyms = result['gyms'] != null ? (result['gyms'] as List).map((g) => Gym.fromJson(g)).toList() : <Gym>[];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(StorageKeys.userRole, user.role);
      await prefs.setString(StorageKeys.userId, user.id);

      final profileData = result['profile'];
      final profile = profileData != null ? UserProfile.fromJson(profileData) : null;

      await _cacheAuthState(user, profile, gyms, prefs);

      state = state.copyWith(
        isAuthenticated: true,
        isLoading: false,
        user: user,
        profile: profile,
        role: user.role,
        gyms: gyms,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> logout() async {
    await _api.clearTokens();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(StorageKeys.token);
    await prefs.remove(StorageKeys.refreshToken);
    await prefs.remove(StorageKeys.userRole);
    await prefs.remove(StorageKeys.userId);
    await prefs.remove(StorageKeys.selectedGymId);
    await prefs.remove(StorageKeys.selectedGymName);
    await prefs.remove('cached_auth_state');
    state = const AuthState(isLoading: false);
  }

  Future<void> selectGym(String gymId, {String? gymName}) async {
    try {
      await _api.selectGym(gymId);
      state = state.copyWith(selectedGymId: gymId, selectedGymName: gymName);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void clearError() {
    state = state.copyWith(clearError: true);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  final api = ref.read(apiServiceProvider);
  return AuthNotifier(api);
});

final apiServiceProvider = Provider<ApiService>((ref) {
  return ApiService();
});
