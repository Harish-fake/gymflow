import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../widgets/stat_card.dart';
import '../../widgets/app_shell.dart';
import '../../config/theme.dart';
import '../../services/api_service.dart';

class AdminDashboardScreen extends ConsumerStatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  ConsumerState<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends ConsumerState<AdminDashboardScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _data;
  Map<String, dynamic>? _revenueData;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _api.getAdminDashboard(),
        _api.getRevenueReport(),
      ]);
      setState(() {
        _data = results[0];
        _revenueData = results[1];
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final stats = _data?['stats'] as Map<String, dynamic>?;
    final monthly = (_revenueData?['monthly'] as List?) ?? [];

    return AppShell(
      title: 'Admin Dashboard',
      actions: [
        IconButton(icon: const Icon(Icons.qr_code_scanner), onPressed: () => context.push('/qr-scanner')),
      ],
      body: RefreshIndicator(
        onRefresh: _loadData,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_isLoading)
                const Center(child: CircularProgressIndicator())
              else ...[
                GridView.count(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.4,
                  children: [
                    StatCard(
                      title: 'Total Members',
                      value: '${stats?['total_members'] ?? 0}',
                      icon: Icons.people,
                      color: GymFlowColors.secondary,
                    ),
                    StatCard(
                      title: 'Active',
                      value: '${stats?['active_members'] ?? 0}',
                      icon: Icons.verified_user,
                      color: GymFlowColors.success,
                    ),
                    StatCard(
                      title: 'Expired',
                      value: '${stats?['expired_members'] ?? 0}',
                      icon: Icons.timer_off,
                      color: GymFlowColors.error,
                    ),
                    StatCard(
                      title: "Today's Attendance",
                      value: '${stats?['today_attendance'] ?? 0}',
                      icon: Icons.calendar_today,
                      color: GymFlowColors.primary,
                    ),
                    StatCard(
                      title: 'Monthly Revenue',
                      value: '₹${stats?['monthly_revenue'] ?? 0}',
                      icon: Icons.currency_rupee,
                      color: GymFlowColors.warning,
                    ),
                    StatCard(
                      title: 'Trainers',
                      value: '${stats?['total_trainers'] ?? 0}',
                      icon: Icons.fitness_center,
                      color: GymFlowColors.info,
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Revenue Overview', style: Theme.of(context).textTheme.headlineLarge),
                const SizedBox(height: 12),
                Card(
                  child: Container(
                    height: 220,
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 8),
                    child: monthly.isEmpty
                        ? Center(
                            child: Text('No revenue data yet',
                                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: GymFlowColors.textMuted)),
                          )
                        : BarChart(
                            BarChartData(
                              alignment: BarChartAlignment.spaceAround,
                              maxY: (monthly.map((m) => (m['revenue'] as num?)?.toDouble() ?? 0).reduce(
                                      (a, b) => a > b ? a : b) *
                                  1.2),
                              barTouchData: BarTouchData(
                                touchTooltipData: BarTouchTooltipData(
                                  getTooltipItem: (group, groupIndex, rod, rodIndex) {
                                    return BarTooltipItem(
                                      '₹${rod.toY.toInt()}',
                                      TextStyle(color: GymFlowColors.primary, fontWeight: FontWeight.bold, fontSize: 12),
                                    );
                                  },
                                ),
                              ),
                              titlesData: FlTitlesData(
                                leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                bottomTitles: AxisTitles(
                                  sideTitles: SideTitles(
                                    showTitles: true,
                                    getTitlesWidget: (value, meta) {
                                      final idx = value.toInt();
                                      if (idx < 0 || idx >= monthly.length) return const SizedBox();
                                      final month = monthly[idx];
                                      return Padding(
                                        padding: const EdgeInsets.only(top: 8),
                                        child: Text(month['label']?.toString().substring(0, 3) ?? '',
                                            style: const TextStyle(fontSize: 10, color: GymFlowColors.textMuted)),
                                      );
                                    },
                                  ),
                                ),
                              ),
                              borderData: FlBorderData(show: false),
                              gridData: FlGridData(
                                show: true,
                                drawVerticalLines: false,
                                horizontalInterval: 10000,
                                getDrawingHorizontalLine: (value) => FlLine(
                                  color: GymFlowColors.border.withOpacity(0.3),
                                  strokeWidth: 1,
                                ),
                              ),
                              barGroups: monthly.asMap().entries.map((entry) {
                                final i = entry.key;
                                final m = entry.value;
                                return BarChartGroupData(
                                  x: i,
                                  barRods: [
                                    BarChartRodData(
                                      toY: (m['revenue'] as num?)?.toDouble() ?? 0,
                                      color: GymFlowColors.primary,
                                      width: 20,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                    ),
                                  ],
                                );
                              }).toList(),
                            ),
                          ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
