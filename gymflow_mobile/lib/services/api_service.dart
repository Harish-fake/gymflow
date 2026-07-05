import 'dart:async';
import 'dart:collection';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import '../config/constants.dart';
import 'cache_service.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final String? details;
  ApiException({required this.message, this.statusCode, this.details});
  @override
  String toString() => message;
}

class _QueuedRequest {
  final Future<dynamic> Function() requestFn;
  final Completer<dynamic> completer;
  _QueuedRequest(this.requestFn, this.completer);
}

class _DebounceEntry {
  final Completer<dynamic> completer;
  _DebounceEntry(this.completer);
}

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  String? _token;
  String? _refreshToken;
  bool _warmedUp = false;
  bool _isRefreshing = false;

  static const int _maxConcurrentRequests = 4;
  int _activeRequests = 0;
  final Queue<_QueuedRequest> _requestQueue = Queue();

  final Set<String> _inflightRequests = {};
  final Map<String, List<_DebounceEntry>> _debounceTimers = {};

  Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString(StorageKeys.token);
    _refreshToken = prefs.getString(StorageKeys.refreshToken);
  }

  Future<void> warmUp() async {
    if (_warmedUp) return;
    _warmedUp = true;
    try {
      final uri = Uri.parse('${ApiConstants.baseUrl}/health');
      await http.get(uri).timeout(const Duration(seconds: 5));
    } catch (_) {}
  }

  void setToken(String? token) {
    _token = token;
  }

  void setRefreshToken(String? token) {
    _refreshToken = token;
  }

  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (_token != null) 'Authorization': 'Bearer $_token',
      };

  Future<void> _saveTokens(Map<String, dynamic> response) async {
    final prefs = await SharedPreferences.getInstance();
    if (response.containsKey('token')) {
      _token = response['token'];
      await prefs.setString(StorageKeys.token, _token!);
    }
    if (response.containsKey('refresh_token')) {
      _refreshToken = response['refresh_token'];
      await prefs.setString(StorageKeys.refreshToken, _refreshToken!);
    }
  }

  Future<void> clearTokens() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(StorageKeys.token);
    await prefs.remove(StorageKeys.refreshToken);
    _token = null;
    _refreshToken = null;
  }

  Future<Map<String, dynamic>> refreshAuthToken() async {
    if (_refreshToken == null) throw ApiException(message: 'No refresh token');
    final response = await http.post(
      Uri.parse('${ApiConstants.baseUrl}/auth/refresh'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'refresh_token': _refreshToken}),
    );
    if (response.statusCode != 200) {
      await clearTokens();
      throw ApiException(statusCode: 401, message: 'Session expired');
    }
    final data = jsonDecode(response.body);
    await _saveTokens(data);
    return data;
  }

  String _cacheKey(String method, String path, Map<String, String>? queryParams) {
    return '$method:$path${queryParams?.toString() ?? ''}';
  }

  String _debounceKey(String method, String path, Map<String, dynamic>? body) {
    return '$method:$path${body?.toString() ?? ''}';
  }

  Future<dynamic> _request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    Map<String, String>? queryParams,
  }) async {
    final uri = Uri.parse('${ApiConstants.baseUrl}$path').replace(
      queryParameters: queryParams,
    );
    final cacheKey = _cacheKey(method, path, queryParams);

    if (method == 'GET') {
      final cached = await CacheService().get(cacheKey);
      if (cached != null) return cached;
    }

    return _enqueueRequest(() => _executeRequest(method, path, uri, body, cacheKey));
  }

  Future<dynamic> _enqueueRequest(Future<dynamic> Function() requestFn) async {
    if (_activeRequests < _maxConcurrentRequests) {
      _activeRequests++;
      try {
        return await requestFn();
      } finally {
        _activeRequests--;
        _processQueue();
      }
    }

    final completer = Completer<dynamic>();
    _requestQueue.add(_QueuedRequest(requestFn, completer));
    return completer.future;
  }

  void _processQueue() {
    while (_activeRequests < _maxConcurrentRequests && _requestQueue.isNotEmpty) {
      final queued = _requestQueue.removeFirst();
      _activeRequests++;
      queued.requestFn().then((value) {
        _activeRequests--;
        queued.completer.complete(value);
        _processQueue();
      }).catchError((error) {
        _activeRequests--;
        queued.completer.completeError(error);
        _processQueue();
      });
    }
  }

  Future<dynamic> _executeRequest(
    String method,
    String path,
    Uri uri,
    Map<String, dynamic>? body,
    String cacheKey,
  ) async {
    final debounceKey = _debounceKey(method, path, body);

    if (method == 'GET') {
      if (_inflightRequests.contains(debounceKey)) {
        final completer = Completer<dynamic>();
        _debounceTimers.putIfAbsent(debounceKey, () => []);
        _debounceTimers[debounceKey]!.add(_DebounceEntry(completer));
        return completer.future;
      }
      _inflightRequests.add(debounceKey);
    }

    try {
      late http.Response response;
      var headers = _headers;

      Future<http.Response> _makeHttpCall() async {
        switch (method) {
          case 'GET':
            return await http.get(uri, headers: headers).timeout(const Duration(seconds: 20));
          case 'POST':
            return await http.post(uri, headers: headers, body: body != null ? jsonEncode(body) : null).timeout(const Duration(seconds: 20));
          case 'PUT':
            return await http.put(uri, headers: headers, body: body != null ? jsonEncode(body) : null).timeout(const Duration(seconds: 20));
          case 'DELETE':
            return await http.delete(uri, headers: headers).timeout(const Duration(seconds: 20));
          default:
            throw Exception('Unsupported method: $method');
        }
      }

      response = await _makeHttpCall();

      if (response.statusCode == 401 && _refreshToken != null && !_isRefreshing) {
        _isRefreshing = true;
        try {
          await refreshAuthToken();
          headers = _headers;
          response = await _makeHttpCall();
        } finally {
          _isRefreshing = false;
        }
      }

      if (response.statusCode >= 200 && response.statusCode < 300) {
        if (response.body.isEmpty) return {};
        final data = jsonDecode(response.body);
        if (method == 'GET') {
          await CacheService().set(cacheKey, data);
        }
        return data;
      } else {
        final error = jsonDecode(response.body);
        throw ApiException(
          statusCode: response.statusCode,
          message: error['error'] ?? 'Request failed',
          details: error['details'],
        );
      }
    } on ApiException {
      rethrow;
    } catch (e) {
      if (method == 'GET') {
        final cached = await CacheService().get(cacheKey);
        if (cached != null) return cached;
      }
      throw ApiException(message: 'Network error: ${e.toString()}');
    } finally {
      if (method == 'GET') {
        _inflightRequests.remove(debounceKey);
        final pending = _debounceTimers.remove(debounceKey);
        if (pending != null) {
          for (final entry in pending) {
            if (!entry.completer.isCompleted) {
              entry.completer.completeError(ApiException(message: 'Request deduplicated'));
            }
          }
        }
      }
    }
  }

  // Auth
  Future<Map<String, dynamic>> login(String email, String password) async {
    final result = await _request('POST', '/auth/login', body: {'email': email, 'password': password});
    await _saveTokens(result);
    return result;
  }

  Future<Map<String, dynamic>> register(String email, String password, String fullName, {String? phone, String role = 'member'}) async {
    final result = await _request('POST', '/auth/register', body: {
      'email': email,
      'password': password,
      'full_name': fullName,
      'phone': phone,
      'role': role,
    });
    await _saveTokens(result);
    return result;
  }

  Future<void> forgotPassword(String email) async {
    await _request('POST', '/auth/forgot-password', body: {'email': email});
  }

  // Gym
  Future<List<dynamic>> getGyms() async {
    final result = await _request('GET', '/gyms');
    return result is List ? result : result['gyms'] ?? [];
  }

  Future<Map<String, dynamic>> selectGym(String gymId) async {
    final result = await _request('POST', '/gyms/$gymId/select');
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(StorageKeys.selectedGymId, gymId);
    return result;
  }

  // Profile
  Future<Map<String, dynamic>> getProfile() async {
    return await _request('GET', '/users/me');
  }

  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> data) async {
    return await _request('PUT', '/users/me', body: data);
  }

  // Dashboard
  Future<Map<String, dynamic>> getAdminDashboard({String? gymId}) async {
    return await _request('GET', '/dashboard/admin', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> getTrainerDashboard({String? gymId}) async {
    return await _request('GET', '/dashboard/trainer', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> getMemberDashboard({String? gymId}) async {
    return await _request('GET', '/dashboard/member', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  // Members
  Future<List<dynamic>> getMembers({String? gymId, String? status, int page = 1}) async {
    final result = await _request('GET', '/members', queryParams: {
      if (gymId != null) 'gym_id': gymId,
      if (status != null) 'status': status,
      'page': page.toString(),
    });
    return result['members'] ?? [];
  }

  Future<Map<String, dynamic>> getMember(String id) async {
    return await _request('GET', '/members/$id');
  }

  Future<Map<String, dynamic>> getMemberAttendance(String userId) async {
    return await _request('GET', '/members/$userId/attendance');
  }

  Future<Map<String, dynamic>> getMemberPayments(String userId) async {
    return await _request('GET', '/members/$userId/payments');
  }

  Future<Map<String, dynamic>> createMember(Map<String, dynamic> data) async {
    return await _request('POST', '/members', body: data);
  }

  Future<Map<String, dynamic>> updateMember(String id, Map<String, dynamic> data) async {
    return await _request('PUT', '/members/$id', body: data);
  }

  Future<Map<String, dynamic>> renewMembership(String id, Map<String, dynamic> data) async {
    return await _request('POST', '/members/$id/renew', body: data);
  }

  Future<Map<String, dynamic>> deleteMember(String id) async {
    return await _request('DELETE', '/members/$id');
  }

  // Trainers
  Future<List<dynamic>> getTrainers({String? gymId}) async {
    final result = await _request('GET', '/trainers', queryParams: gymId != null ? {'gym_id': gymId} : null);
    return result is List ? result : result['trainers'] ?? [];
  }

  Future<Map<String, dynamic>> getTrainer(String id) async {
    return await _request('GET', '/trainers/$id');
  }

  Future<Map<String, dynamic>> createTrainer(Map<String, dynamic> data) async {
    return await _request('POST', '/trainers', body: data);
  }

  Future<Map<String, dynamic>> updateTrainer(String id, Map<String, dynamic> data) async {
    return await _request('PUT', '/trainers/$id', body: data);
  }

  Future<Map<String, dynamic>> deleteTrainer(String id) async {
    return await _request('DELETE', '/trainers/$id');
  }

  // Membership Plans
  Future<List<dynamic>> getPlans({String? gymId}) async {
    final result = await _request('GET', '/membership-plans', queryParams: gymId != null ? {'gym_id': gymId} : null);
    return result is List ? result : result['plans'] ?? [];
  }

  Future<Map<String, dynamic>> createPlan(Map<String, dynamic> data) async {
    return await _request('POST', '/membership-plans', body: data);
  }

  Future<Map<String, dynamic>> updatePlan(String id, Map<String, dynamic> data) async {
    return await _request('PUT', '/membership-plans/$id', body: data);
  }

  Future<Map<String, dynamic>> deletePlan(String id) async {
    return await _request('DELETE', '/membership-plans/$id');
  }

  // Attendance
  Future<Map<String, dynamic>> checkIn(String gymId, {String method = 'manual'}) async {
    return await _request('POST', '/attendance/check-in', body: {'gym_id': gymId, 'method': method});
  }

  Future<Map<String, dynamic>> checkOut(String id) async {
    return await _request('PUT', '/attendance/$id/check-out');
  }

  Future<List<dynamic>> getMyAttendance() async {
    final result = await _request('GET', '/attendance/mine');
    if (result is List) return result;
    return (result as Map)['records'] ?? [];
  }

  Future<Map<String, dynamic>> getTodayAttendance({String? gymId}) async {
    return await _request('GET', '/attendance/today', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> getAttendanceQR({String? gymId, String? timeSlot}) async {
    final params = <String, String>{};
    if (gymId != null) params['gym_id'] = gymId;
    if (timeSlot != null) params['time_slot'] = timeSlot;
    return await _request('GET', '/attendance/qr', queryParams: params);
  }

  Future<Map<String, dynamic>> getAttendanceCalendar({int? month, int? year}) async {
    final params = <String, String>{};
    if (month != null) params['month'] = '$month';
    if (year != null) params['year'] = '$year';
    return await _request('GET', '/attendance/calendar', queryParams: params);
  }

  // Payments
  Future<Map<String, dynamic>> getPayments({int page = 1, int limit = 20}) async {
    return await _request('GET', '/payments', queryParams: {'page': '$page', 'limit': '$limit'});
  }

  Future<Map<String, dynamic>> createRazorpayOrder(String planId) async {
    return await _request('POST', '/payments/razorpay/order', body: {'plan_id': planId});
  }

  // Reports
  Future<Map<String, dynamic>> getRevenueReport({String? gymId}) async {
    return await _request('GET', '/reports/revenue', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> getMembershipReport({String? gymId}) async {
    return await _request('GET', '/reports/membership', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> getAttendanceReport({String? gymId}) async {
    return await _request('GET', '/reports/attendance', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  // Workouts
  Future<Map<String, dynamic>> getWorkouts({String? gymId}) async {
    return await _request('GET', '/workouts', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> getExercises({String? gymId}) async {
    return await _request('GET', '/workouts/exercises/list', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  Future<Map<String, dynamic>> createWorkout(Map<String, dynamic> data) async {
    return await _request('POST', '/workouts', body: data);
  }

  Future<Map<String, dynamic>> completeWorkout(String id) async {
    return await _request('PUT', '/workouts/$id/complete');
  }

  // Diet Plans
  Future<Map<String, dynamic>> createDiet(Map<String, dynamic> data) async {
    return await _request('POST', '/diet-plans', body: data);
  }

  Future<Map<String, dynamic>> getDiets({String? gymId}) async {
    return await _request('GET', '/diet-plans', queryParams: gymId != null ? {'gym_id': gymId} : null);
  }

  // Progress
  Future<Map<String, dynamic>> getMyProgress() async {
    return await _request('GET', '/progress/my');
  }

  Future<Map<String, dynamic>> addProgress(Map<String, dynamic> data) async {
    return await _request('POST', '/progress', body: data);
  }

  // Notifications
  Future<Map<String, dynamic>> getNotifications({bool unreadOnly = false}) async {
    final params = <String, String>{};
    if (unreadOnly) params['unread'] = 'true';
    return await _request('GET', '/notifications', queryParams: params);
  }

  Future<Map<String, dynamic>> markNotificationRead(String id) async {
    return await _request('PUT', '/notifications/$id/read');
  }
}
