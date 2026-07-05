import 'dart:collection';

class CacheService {
  static final CacheService _instance = CacheService._internal();
  factory CacheService() => _instance;
  CacheService._internal();

  final _cache = HashMap<String, _CacheEntry>();
  final _defaultTtl = const Duration(minutes: 5);

  void set(String key, dynamic data, {Duration? ttl}) {
    _cache[key] = _CacheEntry(
      data: data,
      expiresAt: DateTime.now().add(ttl ?? _defaultTtl),
    );
  }

  dynamic get(String key) {
    final entry = _cache[key];
    if (entry == null) return null;
    if (DateTime.now().isAfter(entry.expiresAt)) {
      _cache.remove(key);
      return null;
    }
    return entry.data;
  }

  void remove(String key) => _cache.remove(key);
  void clear() => _cache.clear();

  void dispose() => _cache.clear();
}

class _CacheEntry {
  final dynamic data;
  final DateTime expiresAt;
  _CacheEntry({required this.data, required this.expiresAt});
}
