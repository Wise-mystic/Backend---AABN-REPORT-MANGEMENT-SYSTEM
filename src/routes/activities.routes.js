import { Router } from 'express';
import * as activitiesController from '../controllers/activities.controller.js';
import { authenticate } from '../middlewares/jwt.js';
import { validate } from '../validators/validate.js';
import { createActivitySchema, updateActivitySchema, metricsSchema, listQuerySchema, createCommentSchema } from '../validators/activity.schemas.js';
import { resolveWorkspace } from '../middlewares/workspace.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();

router.use(authenticate, resolveWorkspace);

router.get('/', validate(listQuerySchema, 'query'), activitiesController.list);
router.post('/', validate(createActivitySchema), activitiesController.create);
router.put('/:id', validate(updateActivitySchema), activitiesController.update);
router.delete('/:id', requireRole('manager'), activitiesController.remove);
router.patch('/:id/metrics', validate(metricsSchema), activitiesController.updateMetrics);
router.post('/:id/assign', requireRole('manager'), activitiesController.assign);
router.post('/:id/approve', requireRole('manager'), activitiesController.approve);
router.get('/stats', activitiesController.stats);
router.get('/export', activitiesController.exportData);
router.get('/:id/comments', activitiesController.listComments);
router.post('/:id/comments', validate(createCommentSchema), activitiesController.createComment);
router.delete('/:id/comments/:commentId', activitiesController.deleteComment);

export default router;


