import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { listAttendance, todayAttendance, myAttendance, checkIn, checkOut, generateQR, attendanceCalendar, attendanceReport } from '../controllers/attendance.controller.js';

const router = Router();

router.get('/', authenticate, listAttendance);
router.get('/today', authenticate, todayAttendance);
router.get('/mine', authenticate, myAttendance);
router.get('/report', authenticate, attendanceReport);
router.get('/qr', authenticate, authorize('admin', 'superadmin'), generateQR);
router.get('/calendar', authenticate, attendanceCalendar);
router.post('/check-in', authenticate, checkIn);
router.put('/:id/check-out', authenticate, checkOut);

export default router;
