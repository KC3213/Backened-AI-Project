import projectModel from '../models/project.model.js';
import mongoose from 'mongoose';

const userSelectFields = 'name email avatar'
const allowedSubmissionMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])
const allowedSubmissionExtensions = new Set([ 'pdf', 'doc', 'docx' ])
const maxSubmissionFileSize = 4 * 1024 * 1024

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

const getProjectOwnerId = (project) => {
    if (!project?.owner) {
        return ''
    }

    return typeof project.owner === 'object' && project.owner._id
        ? project.owner._id.toString()
        : project.owner.toString()
}

const requireProjectOwner = (project, userId) => {
    if (getProjectOwnerId(project) !== userId.toString()) {
        throw new Error('Only project admin can perform this action')
    }
}

const getFileExtension = (fileName = '') => {
    return fileName.split('.').pop()?.toLowerCase() || ''
}

const validateSubmissionLink = (url) => {
    try {
        const parsedUrl = new URL(url)

        if (![ 'http:', 'https:' ].includes(parsedUrl.protocol)) {
            throw new Error('Only http and https links are supported')
        }

        return parsedUrl.toString()
    } catch {
        throw new Error('Submission link must be a valid URL')
    }
}

const validateSubmissionFile = (file = {}) => {
    const extension = getFileExtension(file.name)

    if (!file.name || !file.dataUrl) {
        throw new Error('Submission file is required')
    }

    if (!allowedSubmissionExtensions.has(extension) || (file.type && !allowedSubmissionMimeTypes.has(file.type))) {
        throw new Error('Only PDF, DOC and DOCX files are supported')
    }

    if (!file.size || file.size > maxSubmissionFileSize) {
        throw new Error('Submission file must be 4MB or smaller')
    }

    return {
        fileName: file.name.trim(),
        fileType: file.type || extension,
        fileSize: file.size,
        fileData: file.dataUrl,
    }
}

const serializeProjectForUser = (project, userId) => {
    const serializedProject = typeof project.toObject === 'function'
        ? project.toObject()
        : { ...project }

    if (getProjectOwnerId(serializedProject) !== userId.toString()) {
        delete serializedProject.inviteCode
    }

    return serializedProject
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
        { path: 'owner', select: userSelectFields },
        { path: 'tickets.assignee', select: userSelectFields },
        { path: 'tickets.createdBy', select: userSelectFields },
        { path: 'tickets.submissions.submittedBy', select: userSelectFields },
    ])

    return allUserProjects.map(project => serializeProjectForUser(project, userId))
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


    const project = await getMemberProject({ projectId, userId })
    await ensureProjectOwner(project)
    requireProjectOwner(project, userId)

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
        .populate('users', userSelectFields)
        .populate('owner', userSelectFields)
        .populate('tickets.assignee', userSelectFields)
        .populate('tickets.createdBy', userSelectFields)
        .populate('tickets.submissions.submittedBy', userSelectFields)

    return serializeProjectForUser(updatedProject, userId)



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
    await project.populate('users', userSelectFields)
    await project.populate('owner', userSelectFields)
    await project.populate('tickets.assignee', userSelectFields)
    await project.populate('tickets.createdBy', userSelectFields)
    await project.populate('tickets.submissions.submittedBy', userSelectFields)

    return serializeProjectForUser(project, userId);
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
        .populate('users', userSelectFields)
        .populate('owner', userSelectFields)
        .populate('tickets.assignee', userSelectFields)
        .populate('tickets.createdBy', userSelectFields)
        .populate('tickets.submissions.submittedBy', userSelectFields)

    if (!project) {
        throw new Error('Invalid invite code')
    }

    project = await ensureProjectDefaults(project)

    return serializeProjectForUser(project, userId)
}

export const regenerateInviteCode = async ({ projectId, userId }) => {
    const project = await getMemberProject({ projectId, userId })
    await ensureProjectOwner(project)
    requireProjectOwner(project, userId)

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

export const createTicketSubmission = async ({ projectId, userId, ticketId, type, url, note, file }) => {
    const project = await getMemberProject({ projectId, userId })
    const ticket = project.tickets.id(ticketId)

    if (!ticket) {
        throw new Error('Ticket not found')
    }

    if (!ticket.assignee || ticket.assignee.toString() !== userId.toString()) {
        throw new Error('Only the assigned user can submit work for this ticket')
    }

    const normalizedType = type === 'file' ? 'file' : 'link'
    const submission = {
        type: normalizedType,
        note: note?.trim() || '',
        submittedBy: userId,
    }

    if (normalizedType === 'link') {
        submission.url = validateSubmissionLink(url)
    } else {
        Object.assign(submission, validateSubmissionFile(file))
    }

    ticket.submissions.push(submission)

    if (ticket.status !== 'done') {
        ticket.status = 'review'
    }

    await project.save()
    await project.populate('tickets.submissions.submittedBy', userSelectFields)

    return ticket.submissions[ ticket.submissions.length - 1 ]
}
