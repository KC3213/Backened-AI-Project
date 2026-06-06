import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
        trim: true,
    },
    sender: {
        _id: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
    },
}, {
    timestamps: true,
});

const sprintSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    goal: {
        type: String,
        default: '',
        trim: true,
    },
    status: {
        type: String,
        enum: [ 'planned', 'active', 'closed' ],
        default: 'planned',
    },
    startDate: Date,
    endDate: Date,
}, {
    timestamps: true,
});

const ticketSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    status: {
        type: String,
        enum: [ 'todo', 'in-progress', 'review', 'done' ],
        default: 'todo',
    },
    priority: {
        type: String,
        enum: [ 'low', 'medium', 'high', 'urgent' ],
        default: 'medium',
    },
    assignee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null,
    },
    sprintId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },
}, {
    timestamps: true,
});

const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        lowercase: true,
        required: true,
        trim: true,
        unique: [ true, 'Project name must be unique' ],
    },

    users: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'user'
        }
    ],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null,
    },
    inviteCode: {
        type: String,
        unique: true,
        sparse: true,
        uppercase: true,
        trim: true,
    },
    messages: {
        type: [ messageSchema ],
        default: []
    },
    sprints: {
        type: [ sprintSchema ],
        default: []
    },
    tickets: {
        type: [ ticketSchema ],
        default: []
    },
    fileTree: {
        type: Object,
        default: {}
    },

})


const Project = mongoose.model('project', projectSchema)


export default Project;
