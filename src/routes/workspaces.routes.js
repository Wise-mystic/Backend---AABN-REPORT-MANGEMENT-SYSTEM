import { Router } from 'express';
import { authenticate } from '../middlewares/jwt.js';
import * as workspacesController from '../controllers/workspaces.controller.js';
import { resolveWorkspace } from '../middlewares/workspace.js';
import { requireRole } from '../middlewares/rbac.js';

const router = Router();
router.use(authenticate);

router.get('/', workspacesController.list);
router.post('/', workspacesController.create);
router.post('/members', workspacesController.addMember);
router.get('/:id/members', resolveWorkspace, requireRole('manager'), workspacesController.listMembers);
router.post('/:id/members', resolveWorkspace, requireRole('admin'), workspacesController.addMember);
router.put('/:id/members/:memberId', resolveWorkspace, requireRole('admin'), workspacesController.updateMember);
router.delete('/:id/members/:memberId', resolveWorkspace, requireRole('admin'), workspacesController.removeMember);

export default router;


