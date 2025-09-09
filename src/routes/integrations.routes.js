import { Router } from 'express';
import { authenticate } from '../middlewares/jwt.js';
import { resolveWorkspace } from '../middlewares/workspace.js';
import * as integrationsController from '../controllers/integrations.controller.js';

const router = Router();
router.use(authenticate, resolveWorkspace);

router.get('/settings', integrationsController.getSettings);
router.post('/settings', integrationsController.updateSettings);
router.get('/calendar.ics', integrationsController.ics);
router.get('/google/auth-url', integrationsController.googleAuthUrl);
router.post('/google/callback', integrationsController.googleCallback);

export default router;


