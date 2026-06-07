import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { getMe } from '../controllers/user.controller.js';
import { body } from 'express-validator';
import * as authMiddleware from '../middleware/auth.middleware.js';

const router = Router();


router.get('/me', authMiddleware.authUser, getMe);
router.post('/register',
    body('name').isString().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2 to 50 characters long'),
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
    body('avatarStyle').optional().isString().withMessage('Avatar style must be a string'),
    body('avatarSeed').optional().isString().withMessage('Avatar seed must be a string'),
    userController.createUserController);

router.post('/login',
    body('email').isEmail().withMessage('Email must be a valid email address'),
    body('password').isLength({ min: 3 }).withMessage('Password must be at least 3 characters long'),
    userController.loginController);

router.post('/google',
    body('credential').isString().notEmpty().withMessage('Google credential is required'),
    userController.googleLoginController);

router.get('/profile', authMiddleware.authUser, userController.profileController);


router.get('/logout', authMiddleware.authUser, userController.logoutController);


router.get('/all', authMiddleware.authUser, userController.getAllUsersController);


export default router;
