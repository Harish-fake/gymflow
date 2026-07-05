import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validate.js';
import { listWorkouts, getWorkout, createWorkout, updateWorkout, deleteWorkout, completeWorkout, listExercises, createExercise } from '../controllers/workout.controller.js';

const router = Router();

router.get('/', authenticate, listWorkouts);
router.get('/:id', authenticate, getWorkout);
router.post('/', authenticate, authorize('admin', 'trainer'), createWorkout);
router.put('/:id', authenticate, authorize('admin', 'trainer'), validate(schemas.updateWorkout), updateWorkout);
router.delete('/:id', authenticate, authorize('admin', 'superadmin'), deleteWorkout);
router.put('/:id/complete', authenticate, completeWorkout);
router.get('/exercises/list', authenticate, listExercises);
router.post('/exercises', authenticate, authorize('admin', 'trainer'), createExercise);

export default router;
