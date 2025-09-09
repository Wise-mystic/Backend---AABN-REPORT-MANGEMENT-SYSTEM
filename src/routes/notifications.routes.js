import { Router } from 'express';
import { authenticate } from '../middlewares/jwt.js';
import { resolveWorkspace } from '../middlewares/workspace.js';
import * as notificationsController from '../controllers/notifications.controller.js';

const router = Router();
router.use(authenticate, resolveWorkspace);

router.get('/', notificationsController.list);
router.post('/:id/read', notificationsController.markRead);

export default router;


