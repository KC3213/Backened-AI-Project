import projectModel from '../models/project.model.js';
import mongoose from 'mongoose';

const generateInviteCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';

    for (let index = 0; index < 8; index += 1) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    return code;
}

const createUniqueInviteCode = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
        const inviteCode = generateInviteCode();
        const existingProject = await projectModel.exists({ inviteCode });

        if (!existingProject) {
            return inviteCode;
        }
    }

    throw new Error('Could not generate invite code');
}

const validateObjectId = (id, label) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error(`Invalid ${label}`)
    }
}

const getMemberProject = async ({ projectId, userId }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    validateObjectId(projectId, 'projectId')

    if (!userId) {
        throw new Error("userId is required")
    }

    validateObjectId(userId, 'userId')

    const project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })

    if (!project) {
        throw new Error("User does not belong to this project")
    }

    return project
}

const ensureInviteCode = async (project) => {
    if (!project.inviteCode) {
        project.inviteCode = await createUniqueInviteCode()
        await project.save()
    }

    return project
}

const ensureProjectOwner = async (project) => {
    if (!project.owner && project.users?.length) {
        project.owner = project.users[ 0 ]
        await project.save()
    }

    return project
}

const ensureProjectDefaults = async (project) => {
    await ensureProjectOwner(project)
    await ensureInviteCode(project)

    return project
}

const requireProjectOwner = (project, userId) => {
    if (!project.owner || project.owner.toString() !== userId.toString()) {
        throw new Error('Only project admin can perform this action')
    }
}

export const createProject = async ({
    name, userId
}) => {
    if (!name) {
        throw new Error('Name is required')
    }
    if (!userId) {
        throw new Error('UserId is required')
    }

    let project;
    try {
        project = await projectModel.create({
            name,
            users: [ userId ],
            owner: userId,
            inviteCode: await createUniqueInviteCode(),
        });
    } catch (error) {
        if (error.code === 11000) {
            throw new Error('Project name already exists');
        }
        throw error;
    }

    return project;

}


export const getAllProjectByUserId = async ({ userId }) => {
    if (!userId) {
        throw new Error('UserId is required')
    }

    const allUserProjects = await projectModel.find({
        users: userId
    })

    await Promise.all(allUserProjects.map(project => ensureProjectDefaults(project)))
    await projectModel.populate(allUserProjects, [
        { path: 'owner', select: 'email' },
        { path: 'tickets.assignee', select: 'email' },
        { path: 'tickets.createdBy', select: 'email' },
    ])

    return allUserProjects
}

export const addUsersToProject = async ({ projectId, users, userId }) => {

    if (!projectId) {
        throw new Error("projectId is required")
    }

    validateObjectId(projectId, 'projectId')

    if (!users) {
        throw new Error("users are required")
    }

    if (!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error("Invalid userId(s) in users array")
    }

    if (!userId) {
        throw new Error("userId is required")
    }

    validateObjectId(userId, 'userId')


    await getMemberProject({ projectId, userId })

    const updatedProject = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        $addToSet: {
            users: {
                $each: users
            }
        }
    }, {
        new: true
    })

    return updatedProject



}

export const getProjectById = async ({ projectId, userId }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    validateObjectId(projectId, 'projectId')

    let project = await projectModel.findOne({
        _id: projectId,
        users: userId
    })

    if (!project) {
        throw new Error("Project not found")
    }

    project = await ensureProjectDefaults(project)
    await project.populate('users', 'email')
    await project.populate('owner', 'email')
    await project.populate('tickets.assignee', 'email')
    await project.populate('tickets.createdBy', 'email')

    return project;
}

export const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    validateObjectId(projectId, 'projectId')

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}

export const addMessageToProject = async ({ projectId, userId, sender, message }) => {
    const project = await getMemberProject({ projectId, userId })

    if (!message || !message.trim()) {
        throw new Error('Message is required')
    }

    const savedMessage = {
        message: message.trim(),
        sender,
    }

    project.messages.push(savedMessage)
    await project.save()

    return project.messages[ project.messages.length - 1 ]
}

export const joinProjectByInviteCode = async ({ inviteCode, userId }) => {
    if (!inviteCode) {
        throw new Error('Invite code is required')
    }

    validateObjectId(userId, 'userId')

    let project = await projectModel.findOneAndUpdate({
        inviteCode: inviteCode.trim().toUpperCase(),
    }, {
        $addToSet: {
            users: userId,
        }
    }, {
        new: true,
    })
        .populate('users', 'email')
        .populate('owner', 'email')
        .populate('tickets.assignee', 'email')
        .populate('tickets.createdBy', 'email')

    if (!project) {
        throw new Error('Invalid invite code')
    }

    project = await ensureProjectDefaults(project)

    return project
}

export const regenerateInviteCode = async ({ projectId, userId }) => {
    const project = await getMemberProject({ projectId, userId })
    project.inviteCode = await createUniqueInviteCode()
    await project.save()

    return project.inviteCode
}

export const createSprint = async ({ projectId, userId, name, goal, startDate, endDate }) => {
    const project = await getMemberProject({ projectId, userId })
    await ensureProjectOwner(project)
    requireProjectOwner(project, userId)

    if (!name || !name.trim()) {
        throw new Error('Sprint name is required')
    }

    project.sprints.push({
        name: name.trim(),
        goal,
        startDate,
        endDate,
    })

    await project.save()

    return project.sprints[ project.sprints.length - 1 ]
}

export const createTicket = async ({ projectId, userId, title, description, assignee, priority, sprintId }) => {
    const project = await getMemberProject({ projectId, userId })

    if (!title || !title.trim()) {
        throw new Error('Ticket title is required')
    }

    if (assignee) {
        validateObjectId(assignee, 'assignee')

        if (!project.users.some(memberId => memberId.toString() === assignee)) {
            throw new Error('Assignee must be a project member')
        }
    }

    if (sprintId && !project.sprints.id(sprintId)) {
        throw new Error('Sprint not found')
    }

    project.tickets.push({
        title: title.trim(),
        description,
        assignee: assignee || null,
        priority,
        sprintId: sprintId || null,
        createdBy: userId,
    })

    await project.save()

    return project.tickets[ project.tickets.length - 1 ]
}

export const updateTicket = async ({ projectId, userId, ticketId, updates }) => {
    const project = await getMemberProject({ projectId, userId })
    const ticket = project.tickets.id(ticketId)

    if (!ticket) {
        throw new Error('Ticket not found')
    }

    const allowedFields = [ 'title', 'description', 'status', 'priority', 'assignee', 'sprintId' ]

    allowedFields.forEach(field => {
        if (updates[ field ] !== undefined) {
            ticket[ field ] = updates[ field ] || null
        }
    })

    if (ticket.assignee && !project.users.some(memberId => memberId.toString() === ticket.assignee.toString())) {
        throw new Error('Assignee must be a project member')
    }

    if (ticket.sprintId && !project.sprints.id(ticket.sprintId)) {
        throw new Error('Sprint not found')
    }

    await project.save()

    return ticket
}
