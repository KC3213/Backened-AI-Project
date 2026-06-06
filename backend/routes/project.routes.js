import { Router } from 'express';
import { body } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import * as authMiddleWare from '../middleware/auth.middleware.js';

const router = Router();


router.post('/create',
    authMiddleWare.authUser,
    body('name').isString().withMessage('Name is required'),
    projectController.createProject
)

router.get('/all',
    authMiddleWare.authUser,
    projectController.getAllProject
)

router.put('/add-user',
    authMiddleWare.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('users').isArray({ min: 1 }).withMessage('Users must be an array of strings').bail()
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
    projectController.addUserToProject
)

router.post('/join',
    authMiddleWare.authUser,
    body('inviteCode').isString().isLength({ min: 4 }).withMessage('Invite code is required'),
    projectController.joinProjectByInviteCode
)

router.get('/get-project/:projectId',
    authMiddleWare.authUser,
    projectController.getProjectById
)

router.post('/:projectId/regenerate-invite',
    authMiddleWare.authUser,
    projectController.regenerateInviteCode
)

router.post('/:projectId/sprints',
    authMiddleWare.authUser,
    body('name').isString().notEmpty().withMessage('Sprint name is required'),
    projectController.createSprint
)

router.post('/:projectId/tickets',
    authMiddleWare.authUser,
    body('title').isString().notEmpty().withMessage('Ticket title is required'),
    projectController.createTicket
)

router.put('/:projectId/tickets/:ticketId',
    authMiddleWare.authUser,
    projectController.updateTicket
)

router.put('/update-file-tree',
    authMiddleWare.authUser,
    body('projectId').isString().withMessage('Project ID is required'),
    body('fileTree').isObject().withMessage('File tree is required'),
    projectController.updateFileTree
)


export default router;
