import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../validators/validate.js';
import { loginSchema, registerSchema } from '../validators/auth.schemas.js';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middlewares/jwt.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.me);
router.post('/refresh', authController.refresh);
router.post('/verify/send', authenticate, authController.sendVerification);
router.post('/verify', authController.verifyEmail);
router.post('/forgot', rateLimit({ windowMs: 15*60*1000, max: 20 }), authController.forgotPassword);
router.post('/reset', authController.resetPassword);
router.post('/reset/verify', rateLimit({ windowMs: 15*60*1000, max: 50 }), authController.verifyResetOtp);

export default router;


