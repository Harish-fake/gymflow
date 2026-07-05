import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { listDiets, getDiet, createDiet, updateDiet, deleteDiet } from '../controllers/diet.controller.js';

const router = Router();

router.get('/', authenticate, listDiets);
router.get('/:id', authenticate, getDiet);
router.post('/', authenticate, authorize('admin', 'trainer'), createDiet);
router.put('/:id', authenticate, authorize('admin', 'trainer'), validate(schemas.updateDiet), updateDiet);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), deleteDiet);

export default router;
