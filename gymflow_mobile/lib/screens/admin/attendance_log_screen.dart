import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../providers/auth_provider.dart';
import '../../config/theme.dart';

class AttendanceLogScreen extends ConsumerStatefulWidget {
  const AttendanceLogScreen({super.key});

  @override
  ConsumerState<AttendanceLogScreen> createState() => _AttendanceLogScreenState();
}

class _AttendanceLogScreenState extends ConsumerState<AttendanceLogScreen> {
  final _api = ApiService();
  Map<String, dynamic>? _data;
  String? _qrCodeDataUrl;
  String? _qrTimeSlot;
  bool _isLoading = true;
  bool _isGeneratingQr = false;
  final _timeSlots = ['morning', 'evening', 'general'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final data = await _api.getTodayAttendance();
      setState(() => _data = data);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _generateQr(String timeSlot) async {
    setState(() {
      _isGeneratingQr = true;
      _qrTimeSlot = timeSlot;
    });
    try {
      final gymId = ref.read(authProvider).selectedGymId;
      final result = await _api.getAttendanceQR(gymId: gymId, timeSlot: timeSlot);
      setState(() => _qrCodeDataUrl = result['qr_code']);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
      }
    } finally {
      if (mounted) setState(() => _isGeneratingQr = false);
    }
  }

  Widget _statBox(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: color.withOpacity(0.1),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.3)),
        ),
        child: Column(
          children: [
            Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 4),
            Text(label, style: TextStyle(fontSize: 12, color: GymFlowColors.textMuted)),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Today's Attendance")),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _statBox('Total', '${_data?['total'] ?? 0}', GymFlowColors.info),
                        const SizedBox(width: 12),
                        _statBox('Checked In', '${_data?['checked_in'] ?? 0}', GymFlowColors.success),
                        const SizedBox(width: 12),
                        _statBox('Checked Out', '${_data?['checked_out'] ?? 0}', GymFlowColors.warning),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Text('QR Attendance Codes', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    Row(
                      children: _timeSlots.map((slot) {
                        final isSelected = _qrTimeSlot == slot;
                        final labels = {'morning': '🌅 Morning', 'evening': '🌆 Evening', 'general': '📋 General'};
                        return Expanded(
                          child: Padding(
                            padding: EdgeInsets.only(
                              left: slot == _timeSlots.first ? 0 : 4,
                              right: slot == _timeSlots.last ? 0 : 4,
                            ),
                            child: ElevatedButton(
                              onPressed: _isGeneratingQr ? null : () => _generateQr(slot),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: isSelected ? GymFlowColors.primary : GymFlowColors.surface,
                                foregroundColor: isSelected ? Colors.white : GymFlowColors.textPrimary,
                                side: BorderSide(color: GymFlowColors.border),
                                padding: const EdgeInsets.symmetric(vertical: 10),
                              ),
                              child: _isGeneratingQr && _qrTimeSlot == slot
                                  ? const SizedBox(
                                      width: 16, height: 16,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : Text(labels[slot]!, style: const TextStyle(fontSize: 12)),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                    if (_qrCodeDataUrl != null) ...[
                      const SizedBox(height: 24),
                      Center(
                        child: Column(
                          children: [
                            Image.memory(
                              base64Decode(_qrCodeDataUrl!.split(',').last),
                              width: 200, height: 200,
                            ),
                            const SizedBox(height: 8),
                            Text('Show this QR at the gym entrance',
                                style: TextStyle(color: GymFlowColors.textMuted, fontSize: 12)),
                          ],
                        ),
                      ),
                    ],
                    const SizedBox(height: 24),
                    Text('Recent Records', style: Theme.of(context).textTheme.titleMedium),
                    const SizedBox(height: 12),
                    if ((_data?['records'] as List?)?.isEmpty ?? true)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Center(
                            child: Text('No attendance records today',
                                style: Theme.of(context).textTheme.bodyMedium),
                          ),
                        ),
                      )
                    else
                      ...(_data?['records'] as List).map((r) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: GymFlowColors.primary.withOpacity(0.1),
                                child: Icon(Icons.person, color: GymFlowColors.primary, size: 20),
                              ),
                              title: Text(r['member_name'] ?? ''),
                              subtitle: Text('${r['check_in'] ?? ''} - ${r['check_out'] ?? 'Not checked out'}'),
                              trailing: Text(r['method'] ?? '', style: TextStyle(color: GymFlowColors.textMuted, fontSize: 12)),
                            ),
                          )),
                  ],
                ),
              ),
            ),
    );
  }
}
