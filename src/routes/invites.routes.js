import { Router } from 'express';
import { authenticate } from '../middlewares/jwt.js';
import { resolveWorkspace, setWorkspaceFromParam } from '../middlewares/workspace.js';
import { requireRole } from '../middlewares/rbac.js';
import * as invites from '../controllers/invites.controller.js';
import { validate } from '../validators/validate.js';
import { createInviteSchema, acceptInviteSchema } from '../validators/invite.schemas.js';
import rateLimit from 'express-rate-limit';

const router = Router();

// Authenticated workspace-scoped invite management
router.use(authenticate);

router.get('/:id/invites', setWorkspaceFromParam('id'), resolveWorkspace, requireRole('manager'), invites.list);
router.post('/:id/invites', setWorkspaceFromParam('id'), resolveWorkspace, requireRole('manager'), rateLimit({ windowMs: 15*60*1000, max: 20 }), validate(createInviteSchema), invites.create);
router.post('/:id/invites/:inviteId/resend', setWorkspaceFromParam('id'), resolveWorkspace, requireRole('manager'), rateLimit({ windowMs: 15*60*1000, max: 20 }), invites.resend);
router.delete('/:id/invites/:inviteId', setWorkspaceFromParam('id'), resolveWorkspace, requireRole('manager'), invites.revoke);

// Public accept endpoint (no workspace path; token carries association)
router.post('/accept', validate(acceptInviteSchema), invites.accept);

export default router;


