import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { CalendarCheck, QrCode, LogIn, History } from 'lucide-react';
import api from '../services/api';
import Pagination from '../components/Pagination';

export default function Attendance() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrData, setQrData] = useState(null);
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyTotalItems, setHistoryTotalItems] = useState(0);
  const [historyLimit, setHistoryLimit] = useState(50);

  useEffect(() => { loadToday(); }, []);

  useEffect(() => { loadHistory(); }, [historyPage, historyLimit]);

  async function loadToday() {
    try {
      const result = await api.getTodayAttendance();
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const result = await api.getAttendance({ page: historyPage, limit: historyLimit });
      if (Array.isArray(result)) {
        setHistoryRecords(result);
        setHistoryTotalItems(result.length);
        setHistoryTotalPages(result.length < historyLimit ? historyPage : historyPage + 1);
      } else if (result.records || result.attendance) {
        const records = result.records || result.attendance || [];
        setHistoryRecords(records);
        setHistoryTotalItems(result.total || records.length);
        setHistoryTotalPages(Math.ceil((result.total || records.length) / historyLimit) || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  }

  const handleGenerateQR = async () => {
    try {
      const result = await api.getAttendanceQR();
      setQrData(result);
    } catch (err) {
      toast.error('Failed to generate QR');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Attendance</h1>
          <p className="text-dark-400 mt-1">Today's check-ins</p>
        </div>
        <button onClick={handleGenerateQR} className="btn-primary flex items-center gap-2">
          <QrCode size={18} /> Generate QR
        </button>
      </div>

      {qrData && (
        <div className="card flex items-center gap-6">
          <img src={qrData.qr_code} alt="QR Code" className="w-32 h-32 rounded-xl" />
          <div>
            <p className="text-sm font-medium text-white">Today's QR Code</p>
            <p className="text-xs text-dark-400 mt-1">Members can scan this at the entrance</p>
            <p className="text-xs text-dark-400">Date: {qrData.date}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            <div className="card text-center">
              <p className="text-3xl font-bold text-white">{data?.total || 0}</p>
              <p className="text-sm text-dark-400 mt-1">Total Today</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-green-500">{data?.checked_in || 0}</p>
              <p className="text-sm text-dark-400 mt-1">Checked In</p>
            </div>
            <div className="card text-center">
              <p className="text-3xl font-bold text-yellow-500">{data?.checked_out || 0}</p>
              <p className="text-sm text-dark-400 mt-1">Checked Out</p>
            </div>
          </div>

          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Member</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Check In</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Check Out</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Method</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-dark-400">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.records || []).length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-12 text-dark-400">No attendance records today</td></tr>
                  ) : (
                    data?.records?.map((r, i) => (
                      <tr key={i} className="border-b border-dark-700 hover:bg-dark-800/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-medium">
                              {r.member_name?.[0] || 'M'}
                            </div>
                            <span className="text-sm font-medium text-white">{r.member_name || r.user?.profile?.full_name || 'Member'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-dark-400">{r.check_in_time || r.check_in || '-'}</td>
                        <td className="px-6 py-4 text-sm text-dark-400">{r.check_out_time || r.check_out || '-'}</td>
                        <td className="px-6 py-4 text-sm text-dark-400">{r.method?.toUpperCase() || 'QR'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-xs font-medium ${r.check_out ? 'bg-yellow-500/10 text-yellow-500' : 'bg-green-500/10 text-green-500'}`}>
                            {r.check_out ? 'CHECKED OUT' : 'CHECKED IN'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Attendance History</h2>
        {historyLoading ? (
          <div className="flex items-center justify-center h-32"><div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-700">
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Member</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Date</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Check In</th>
                    <th className="text-left px-4 py-3 text-sm font-medium text-dark-400">Check Out</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRecords.length === 0 ? (
                    <tr><td colSpan="4" className="text-center py-8 text-dark-400">No history found</td></tr>
                  ) : (
                    historyRecords.map((r, i) => (
                      <tr key={i} className="border-b border-dark-700 hover:bg-dark-800/50">
                        <td className="px-4 py-3 text-sm text-white">{r.member_name || r.user?.profile?.full_name || 'Member'}</td>
                        <td className="px-4 py-3 text-sm text-dark-400">{r.date || r.check_in_time?.substring(0, 10) || '-'}</td>
                        <td className="px-4 py-3 text-sm text-dark-400">{r.check_in_time || r.check_in || '-'}</td>
                        <td className="px-4 py-3 text-sm text-dark-400">{r.check_out_time || r.check_out || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={historyPage}
              totalPages={historyTotalPages}
              total={historyTotalItems}
              onPageChange={setHistoryPage}
              pageSize={historyLimit}
              onPageSizeChange={(size) => { setHistoryLimit(size); setHistoryPage(1); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
