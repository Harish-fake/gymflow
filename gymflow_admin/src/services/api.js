import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const cache = new Map();
const inflight = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function cacheKey(method, url, params) {
  return `${method}:${url}:${JSON.stringify(params || {})}`;
}

function dedupe(method, url, config) {
  const key = cacheKey(method, url, config.params);

  if (method === 'get') {
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiry) {
      return Promise.resolve({ data: cached.data });
    }

    if (inflight.has(key)) {
      return inflight.get(key);
    }

    const promise = apiClient({ method, url, ...config }).then((res) => {
      cache.set(key, { data: res.data, expiry: Date.now() + CACHE_TTL });
      inflight.delete(key);
      return res;
    }).catch((err) => {
      inflight.delete(key);
      throw err;
    });

    inflight.set(key, promise);
    return promise;
  }

  return apiClient({ method, url, ...config });
}

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('gymflow_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('gymflow_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

let warmedUp = false;
async function warmUp() {
  if (warmedUp) return;
  warmedUp = true;
  try {
    await apiClient.get('/health', { timeout: 5000 });
  } catch (_) {}
}

function get(url, config = {}) {
  return dedupe('get', url, config).then((r) => r.data);
}

const api = {
  warmUp,

  login: (email, password) =>
    apiClient.post('/auth/login', { email, password }).then((r) => {
      warmUp();
      return r.data;
    }),
  register: (data) =>
    apiClient.post('/auth/register', data).then((r) => r.data),
  forgotPassword: (email) =>
    apiClient.post('/auth/forgot-password', { email }).then((r) => r.data),
  getProfile: () => get('/users/me'),

  getAdminDashboard: (gymId) =>
    get('/dashboard/admin', { params: { gym_id: gymId } }),
  getTrainerDashboard: (gymId) =>
    get('/dashboard/trainer', { params: { gym_id: gymId } }),

  getMembers: (params) => get('/members', { params }),
  getMember: (id) => get(`/members/${id}`),
  createMember: (data) =>
    apiClient.post('/members', data).then((r) => r.data),
  updateMember: (id, data) =>
    apiClient.put(`/members/${id}`, data).then((r) => r.data),
  deleteMember: (id) =>
    apiClient.delete(`/members/${id}`).then((r) => r.data),
  renewMembership: (id, data) =>
    apiClient.post(`/members/${id}/renew`, data).then((r) => r.data),

  getTrainers: (params) => get('/trainers', { params }),
  getTrainer: (id) => get(`/trainers/${id}`),
  createTrainer: (data) =>
    apiClient.post('/trainers', data).then((r) => r.data),
  updateTrainer: (id, data) =>
    apiClient.put(`/trainers/${id}`, data).then((r) => r.data),
  deleteTrainer: (id) =>
    apiClient.delete(`/trainers/${id}`).then((r) => r.data),
  getTrainerMembers: (id) => get(`/trainers/${id}/members`),

  getPlans: (params) => get('/membership-plans', { params }),
  createPlan: (data) =>
    apiClient.post('/membership-plans', data).then((r) => r.data),
  updatePlan: (id, data) =>
    apiClient.put(`/membership-plans/${id}`, data).then((r) => r.data),
  deletePlan: (id) =>
    apiClient.delete(`/membership-plans/${id}`).then((r) => r.data),

  getAttendance: (params) => get('/attendance', { params }),
  getTodayAttendance: (params) => get('/attendance/today', { params }),
  checkIn: (data) =>
    apiClient.post('/attendance/check-in', data).then((r) => r.data),
  checkOut: (id) =>
    apiClient.put(`/attendance/${id}/check-out`).then((r) => r.data),
  getAttendanceQR: (params) => get('/attendance/qr', { params }),

  getPayments: (params) => get('/payments', { params }),
  createPayment: (data) =>
    apiClient.post('/payments', data).then((r) => r.data),
  getPaymentReport: (params) => get('/payments/report', { params }),

  getWorkouts: (params) => get('/workouts', { params }),
  createWorkout: (data) =>
    apiClient.post('/workouts', data).then((r) => r.data),
  updateWorkout: (id, data) =>
    apiClient.put(`/workouts/${id}`, data).then((r) => r.data),
  deleteWorkout: (id) =>
    apiClient.delete(`/workouts/${id}`).then((r) => r.data),
  getExercises: (params) => get('/workouts/exercises/list', { params }),
  createExercise: (data) =>
    apiClient.post('/workouts/exercises', data).then((r) => r.data),

  getDiets: (params) => get('/diet-plans', { params }),
  createDiet: (data) =>
    apiClient.post('/diet-plans', data).then((r) => r.data),

  getNotifications: (params) => get('/notifications', { params }),
  sendNotification: (data) =>
    apiClient.post('/notifications', data).then((r) => r.data),
  sendBulkNotification: (data) =>
    apiClient.post('/notifications/bulk', data).then((r) => r.data),
  markNotificationRead: (id) =>
    apiClient.put(`/notifications/${id}/read`).then((r) => r.data),
  deleteNotification: (id) =>
    apiClient.delete(`/notifications/${id}`).then((r) => r.data),

  getRevenueReport: (params) => get('/reports/revenue', { params }),
  getAttendanceReport: (params) => get('/reports/attendance', { params }),
  getMembershipReport: (params) => get('/reports/membership', { params }),
  getMemberGrowth: (params) => get('/reports/member-growth', { params }),
  getTrainerPerformance: (params) =>
    get('/reports/trainer-performance', { params }),

  getSettings: (params) => get('/settings', { params }),
  updateSettings: (data) =>
    apiClient.put('/settings', data).then((r) => r.data),

  exportReport: async (type, format) => {
    const response = await apiClient.get(`/reports/export/${type}`, {
      params: { format },
      responseType: format === 'xlsx' ? 'blob' : 'json',
    });
    if (format === 'xlsx') {
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_report.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      return { success: true };
    }
    return response.data;
  },

  downloadInvoice: async (id) => {
    const response = await apiClient.get(`/payments/${id}/invoice/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${id}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
    return { success: true };
  },

  clearCache: () => {
    cache.clear();
    inflight.clear();
  },
};

export default api;