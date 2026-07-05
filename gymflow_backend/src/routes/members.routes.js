import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { listMembers, getMember, createMember, updateMember, deleteMember, getMemberAttendance, getMemberPayments, renewMembership } from '../controllers/member.controller.js';

const router = Router();

router.get('/', authenticate, authorize('admin', 'superadmin', 'trainer'), listMembers);
router.get('/:id', authenticate, getMember);
router.post('/', authenticate, authorize('admin', 'superadmin'), createMember);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), validate(schemas.updateMember), updateMember);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), deleteMember);
router.get('/:id/attendance', authenticate, getMemberAttendance);
router.get('/:id/payments', authenticate, getMemberPayments);
router.post('/:id/renew', authenticate, authorize('admin', 'superadmin'), renewMembership);

export default router;
