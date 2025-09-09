import { Router } from 'express';
import { authenticate } from '../middlewares/jwt.js';
import { resolveWorkspace } from '../middlewares/workspace.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = Router();
router.use(authenticate, resolveWorkspace);

router.get('/series', analyticsController.series);
router.get('/dashboard', analyticsController.dashboard);

export default router;


