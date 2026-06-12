import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import userModel from './models/user.model.js';
import { addMessageToProject, deleteProjectMessage, editProjectMessage } from './services/project.service.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;



const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*'
    }
});


io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
        const projectId = socket.handshake.query.projectId;

        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded?.email) {
            return next(new Error('Authentication error'))
        }

        const user = await userModel.findOne({ email: decoded.email });

        if (!user) {
            return next(new Error('Authentication error'))
        }

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }


        socket.project = await projectModel.findOne({
            _id: projectId,
            users: user._id
        });

        if (!socket.project) {
            return next(new Error('Project not found'));
        }

        socket.user = {
            _id: user._id.toString(),
            email: user.email,
            name: user.name || '',
            avatar: user.avatar || null,
        };

        next();

    } catch (error) {
        next(error)
    }

})


io.on('connection', socket => {
    socket.roomId = socket.project._id.toString()


    console.log(`socket connected ${socket.user.email} -> ${socket.roomId}`);



    socket.join(socket.roomId);

    socket.emit('project-message-ready', {
        projectId: socket.roomId,
    });

    socket.on('project-message', async data => {
        try {
            const message = data?.message?.trim();

            if (!message) {
                socket.emit('project-message-error', {
                    error: 'Message is required'
                });
                return;
            }

            const savedMessage = await addMessageToProject({
                projectId: socket.roomId,
                userId: socket.user._id,
                sender: socket.user,
                message,
            });

            io.to(socket.roomId).emit('project-message', savedMessage);

            const aiIsPresentInMessage = message.includes('@ai');

            if (aiIsPresentInMessage) {
                const prompt = message.replace('@ai', '').trim();
                let result;

                try {
                    result = await generateResult(prompt);
                } catch (error) {
                    result = JSON.stringify({
                        text: `AI failed to respond: ${error.message}`
                    });
                }

                const aiMessage = await projectModel.findByIdAndUpdate(socket.roomId, {
                    $push: {
                        messages: {
                            message: result,
                            sender: {
                                _id: 'ai',
                                email: 'AI',
                                name: 'AI assistant',
                                avatar: null,
                            }
                        }
                    }
                }, {
                    new: true
                });

                io.to(socket.roomId).emit('project-message', aiMessage.messages[ aiMessage.messages.length - 1 ]);
            }
        } catch (error) {
            console.log(error);
            socket.emit('project-message-error', {
                error: error.message
            });
        }



    })

    socket.on('project-message-edit', async data => {
        try {
            const updatedMessage = await editProjectMessage({
                projectId: socket.roomId,
                userId: socket.user._id,
                messageId: data?.messageId,
                message: data?.message,
            });

            io.to(socket.roomId).emit('project-message-updated', updatedMessage);
        } catch (error) {
            socket.emit('project-message-error', {
                error: error.message
            });
        }
    })

    socket.on('project-message-delete', async data => {
        try {
            const deletedMessage = await deleteProjectMessage({
                projectId: socket.roomId,
                userId: socket.user._id,
                messageId: data?.messageId,
            });

            io.to(socket.roomId).emit('project-message-deleted', deletedMessage);
        } catch (error) {
            socket.emit('project-message-error', {
                error: error.message
            });
        }
    })

    socket.on('disconnect', () => {
        console.log(`socket disconnected ${socket.user.email} -> ${socket.roomId}`);
        socket.leave(socket.roomId)
    });
});




server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
