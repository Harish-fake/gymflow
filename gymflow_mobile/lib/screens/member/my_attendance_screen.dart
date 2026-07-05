import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';

class MyAttendanceScreen extends ConsumerStatefulWidget {
  const MyAttendanceScreen({super.key});

  @override
  ConsumerState<MyAttendanceScreen> createState() => _MyAttendanceScreenState();
}

class _MyAttendanceScreenState extends ConsumerState<MyAttendanceScreen> {
  final _api = ApiService();
  List<dynamic> _records = [];
  List<dynamic> _calendarDates = [];
  bool _isLoading = true;
  int _currentMonth = DateTime.now().month;
  int _currentYear = DateTime.now().year;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _api.getMyAttendance(),
        _api.getAttendanceCalendar(month: _currentMonth, year: _currentYear),
      ]);
      if (mounted) {
        setState(() {
          _records = results[0] as List<dynamic>;
          _calendarDates = (results[1] as Map<String, dynamic>)['dates'] as List<dynamic>? ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Set<int> get _presentDays =>
      _calendarDates.map((d) => DateTime.parse(d['date']).day).toSet();

  Future<void> _checkIn() async {
    try {
      final gymId = ref.read(authProvider).selectedGymId;
      final result = await _api.checkIn(gymId ?? '');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Checked in successfully!'), backgroundColor: GymFlowColors.success),
        );
        _load();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    }
  }

  void _prevMonth() {
    setState(() {
      if (_currentMonth == 1) {
        _currentMonth = 12;
        _currentYear--;
      } else {
        _currentMonth--;
      }
    });
    _load();
  }

  void _nextMonth() {
    setState(() {
      if (_currentMonth == 12) {
        _currentMonth = 1;
        _currentYear++;
      } else {
        _currentMonth++;
      }
    });
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final daysInMonth = DateTime(_currentYear, _currentMonth + 1, 0).day;
    final firstWeekday = DateTime(_currentYear, _currentMonth, 1).weekday % 7;
    final monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];

    return Scaffold(
      appBar: AppBar(title: const Text('My Attendance')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Container(
                  margin: const EdgeInsets.all(16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: GymFlowColors.surface,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: GymFlowColors.border),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.chevron_left),
                            onPressed: _prevMonth,
                          ),
                          Text('${monthNames[_currentMonth - 1]} $_currentYear',
                              style: Theme.of(context).textTheme.titleMedium),
                          IconButton(
                            icon: const Icon(Icons.chevron_right),
                            onPressed: _nextMonth,
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
                            .map((d) => SizedBox(
                                  width: 32,
                                  child: Text(d,
                                      textAlign: TextAlign.center,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: GymFlowColors.textMuted,
                                        fontWeight: FontWeight.w600,
                                      )),
                                ))
                            .toList(),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 0,
                        runSpacing: 4,
                        children: <Widget>[
                          ...List.generate(firstWeekday, (i) => const SizedBox(width: 36)),
                          ...List.generate(daysInMonth, (day) {
                            final isPresent = _presentDays.contains(day);
                            final isToday = day == DateTime.now().day &&
                                _currentMonth == DateTime.now().month &&
                                _currentYear == DateTime.now().year;
                            return Container(
                              width: 32,
                              height: 32,
                              margin: const EdgeInsets.symmetric(horizontal: 4),
                              decoration: BoxDecoration(
                                color: isPresent ? GymFlowColors.success : (isToday ? GymFlowColors.primary.withOpacity(0.2) : Colors.transparent),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  '$day',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: isToday ? FontWeight.bold : FontWeight.normal,
                                    color: isPresent ? Colors.white : (isToday ? GymFlowColors.primary : GymFlowColors.textSecondary),
                                  ),
                                ),
                              ),
                            );
                          }),
                        ],
                      ),
                    ],
                  ),
                ),
                SizedBox(
                  width: double.infinity,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    child: ElevatedButton.icon(
                      onPressed: _checkIn,
                      icon: const Icon(Icons.login),
                      label: const Text('Check In Now'),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: ListView.builder(
                    itemCount: _records.length,
                    itemBuilder: (c, i) {
                      final r = _records[i];
                      final checkInStr = r['check_in']?.toString() ?? '';
                      final checkOutStr = r['check_out']?.toString() ?? '';
                      return Card(
                        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                        child: ListTile(
                          leading: Icon(Icons.calendar_today, color: GymFlowColors.primary),
                          title: Text(r['date'] ?? ''),
                          subtitle: Text(
                            '${checkInStr.length >= 19 ? checkInStr.substring(11, 19) : checkInStr} - ${checkOutStr.length >= 19 ? checkOutStr.substring(11, 19) : '...'}'),
                          trailing: Text(r['method'] ?? '', style: const TextStyle(fontSize: 12, color: GymFlowColors.textMuted)),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
