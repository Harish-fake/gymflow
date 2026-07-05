import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { adminDashboard, trainerDashboard, memberDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/admin', authenticate, authorize('admin', 'superadmin'), adminDashboard);
router.get('/trainer', authenticate, authorize('trainer'), trainerDashboard);
router.get('/member', authenticate, authorize('member'), memberDashboard);

export default router;
