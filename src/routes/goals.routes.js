import { Router } from 'express';
import { authenticate } from '../middlewares/jwt.js';
import { resolveWorkspace } from '../middlewares/workspace.js';
import * as goalsController from '../controllers/goals.controller.js';
import { validate } from '../validators/validate.js';
import { createGoalSchema } from '../validators/goal.schemas.js';

const router = Router();
router.use(authenticate, resolveWorkspace);

router.get('/', goalsController.list);
router.post('/', validate(createGoalSchema), goalsController.create);
router.delete('/:id', goalsController.remove);
router.get('/progress', goalsController.progress);

export default router;


