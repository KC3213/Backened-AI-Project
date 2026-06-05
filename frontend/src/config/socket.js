import socket from 'socket.io-client';


let socketInstance = null;


export const initializeSocket = (projectId) => {
    if (socketInstance) {
        socketInstance.disconnect();
    }

    socketInstance = socket(import.meta.env.VITE_API_URL, {
        auth: {
            token: localStorage.getItem('token')
        },
        query: {
            projectId
        }
    });

    return socketInstance;

}

export const receiveMessage = (eventName, cb) => {
    if (!socketInstance) {
        return () => {};
    }

    socketInstance.on(eventName, cb);

    return () => socketInstance.off(eventName, cb);
}

export const sendMessage = (eventName, data) => {
    if (!socketInstance) {
        return;
    }

    socketInstance.emit(eventName, data);
}
