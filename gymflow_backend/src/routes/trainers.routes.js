import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { listTrainers, getTrainer, createTrainer, updateTrainer, deleteTrainer, getTrainerMembers } from '../controllers/trainer.controller.js';

const router = Router();

router.get('/', authenticate, authorize('admin', 'superadmin'), listTrainers);
router.get('/:id', authenticate, getTrainer);
router.post('/', authenticate, authorize('admin', 'superadmin'), createTrainer);
router.put('/:id', authenticate, authorize('admin', 'superadmin'), validate(schemas.updateTrainer), updateTrainer);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), deleteTrainer);
router.get('/:id/members', authenticate, authorize('admin', 'superadmin', 'trainer'), getTrainerMembers);

export default router;
