import projectModel from '../models/project.model.js';
import * as projectService from '../services/project.service.js';
import userModel from '../models/user.model.js';
import { validationResult } from 'express-validator';


export const createProject = async (req, res) => {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { name } = req.body;
        const loggedInUser = await userModel.findOne({ email: req.user.email });
        const userId = loggedInUser._id;

        const newProject = await projectService.createProject({ name, userId });

        res.status(201).json(newProject);

    } catch (err) {
        console.log(err);
        res.status(400).send(err.message);
    }



}

export const getAllProject = async (req, res) => {
    try {

        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const allUserProjects = await projectService.getAllProjectByUserId({
            userId: loggedInUser._id
        })

        return res.status(200).json({
            projects: allUserProjects
        })

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const addUserToProject = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { projectId, users } = req.body

        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })


        const project = await projectService.addUsersToProject({
            projectId,
            users,
            userId: loggedInUser._id
        })

        return res.status(200).json({
            project,
        })

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }


}

export const removeUserFromProject = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const project = await projectService.removeUserFromProject({
            projectId: req.params.projectId,
            memberId: req.params.memberId,
            userId: loggedInUser._id
        })

        return res.status(200).json({
            project,
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const getProjectById = async (req, res) => {

    const { projectId } = req.params;

    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const project = await projectService.getProjectById({
            projectId,
            userId: loggedInUser._id
        });

        return res.status(200).json({
            project
        })

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }

}

export const joinProjectByInviteCode = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const project = await projectService.joinProjectByInviteCode({
            inviteCode: req.body.inviteCode,
            userId: loggedInUser._id
        })

        return res.status(200).json({
            project
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const regenerateInviteCode = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const inviteCode = await projectService.regenerateInviteCode({
            projectId: req.params.projectId,
            userId: loggedInUser._id
        })

        return res.status(200).json({
            inviteCode
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const createSprint = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const sprint = await projectService.createSprint({
            projectId: req.params.projectId,
            userId: loggedInUser._id,
            ...req.body
        })

        return res.status(201).json({
            sprint
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const createTicket = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const ticket = await projectService.createTicket({
            projectId: req.params.projectId,
            userId: loggedInUser._id,
            ...req.body
        })

        return res.status(201).json({
            ticket
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const updateTicket = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const ticket = await projectService.updateTicket({
            projectId: req.params.projectId,
            ticketId: req.params.ticketId,
            userId: loggedInUser._id,
            updates: req.body
        })

        return res.status(200).json({
            ticket
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const createTicketSubmission = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const submission = await projectService.createTicketSubmission({
            projectId: req.params.projectId,
            ticketId: req.params.ticketId,
            userId: loggedInUser._id,
            ...req.body
        })

        return res.status(201).json({
            submission
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const getProjectAssistantSummary = async (req, res) => {
    try {
        const loggedInUser = await userModel.findOne({
            email: req.user.email
        })

        const assistantSummary = await projectService.getProjectAssistantSummary({
            projectId: req.params.projectId,
            userId: loggedInUser._id,
        })

        return res.status(200).json({
            assistantSummary
        })
    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }
}

export const updateFileTree = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { projectId, fileTree } = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree
        })

        return res.status(200).json({
            project
        })

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }

}
