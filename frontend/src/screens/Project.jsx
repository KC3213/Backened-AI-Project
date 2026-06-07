import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useUser } from '../context/userContext'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import axios from '../config/axios'
import { disconnectSocket, initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js'
import { getErrorMessage } from '../utils/getErrorMessage'

const ticketColumns = [
    { key: 'todo', label: 'To do' },
    { key: 'in-progress', label: 'In progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
]

const priorityClasses = {
    low: 'bg-[#eaf3de] text-[#3b6d11]',
    medium: 'bg-[#faeeda] text-[#854f0b]',
    high: 'bg-[#fcebeb] text-[#a32d2d]',
    urgent: 'bg-[#fcebeb] text-[#a32d2d]',
}

const statusLabels = ticketColumns.reduce((acc, column) => {
    acc[ column.key ] = column.label
    return acc
}, {})

const getMemberId = (member) => {
    if (!member) {
        return ''
    }

    return typeof member === 'object' ? member._id?.toString() : member.toString()
}

const getInitials = (email = '') => {
    const username = email.split('@')[ 0 ] || ''

    return username.slice(0, 2).toUpperCase() || 'U'
}

const getDayLabel = (date) => {
    if (!date) {
        return 'Today'
    }

    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
        return 'Today'
    }

    if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday'
    }

    return date.toLocaleDateString([], {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

const getMessageDate = (message) => {
    return message?.createdAt ? new Date(message.createdAt) : null
}

const isSameDay = (firstDate, secondDate) => {
    return Boolean(firstDate && secondDate && firstDate.toDateString() === secondDate.toDateString())
}

const formatMessageTime = (date) => {
    if (!date) {
        return ''
    }

    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
}

function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-')) {
            hljs.highlightElement(ref.current)
            ref.current.removeAttribute('data-highlighted')
        }
    }, [ props.className, props.children ])

    return <code {...props} ref={ref} />
}

function parseAiMessage(message) {
    try {
        return JSON.parse(message)
    } catch {
        return { text: message }
    }
}

const Project = () => {
    const location = useLocation()
    const navigate = useNavigate()
    const { projectId: routeProjectId } = useParams()
    const initialProject = location.state?.project
    const initialProjectId = routeProjectId || initialProject?._id

    const [ activeTab, setActiveTab ] = useState('chat')
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ selectedUserId, setSelectedUserId ] = useState(new Set())
    const [ project, setProject ] = useState(initialProject || null)
    const [ message, setMessage ] = useState('')
    const [ socketStatus, setSocketStatus ] = useState('connecting')
    const [ socketError, setSocketError ] = useState('')
    const [ actionError, setActionError ] = useState('')
    const [ copyState, setCopyState ] = useState('')
    const { user, logout } = useUser()
    const messageBox = useRef(null)

    const [ users, setUsers ] = useState([])
    const [ messages, setMessages ] = useState([])

    const [ sprintForm, setSprintForm ] = useState({
        name: '',
        goal: '',
    })
    const [ ticketForm, setTicketForm ] = useState({
        title: '',
        description: '',
        assignee: '',
        priority: 'medium',
        sprintId: '',
    })

    const projectId = project?._id || initialProjectId
    const inviteLink = project?.inviteCode ? `${window.location.origin}/join/${project.inviteCode}` : ''
    const currentUserId = user?._id?.toString()
    const projectOwnerId = getMemberId(project?.owner)
    const isProjectAdmin = Boolean(currentUserId && projectOwnerId && currentUserId === projectOwnerId)

    const ticketsByStatus = useMemo(() => {
        const groupedTickets = ticketColumns.reduce((acc, column) => {
            acc[ column.key ] = []
            return acc
        }, {})

        project?.tickets?.forEach(ticket => {
            groupedTickets[ ticket.status ]?.push(ticket)
        })

        return groupedTickets
    }, [ project?.tickets ])

    const myTasks = useMemo(() => {
        return project?.tickets?.filter(ticket => {
            const assigneeId = getMemberId(ticket.assignee)

            return assigneeId && assigneeId === currentUserId
        }) || []
    }, [ currentUserId, project?.tickets ])

    const reloadProject = useCallback(async () => {
        if (!projectId) {
            return
        }

        const res = await axios.get(`/projects/get-project/${projectId}`)
        setProject(res.data.project)
        setMessages(res.data.project.messages || [])
    }, [ projectId ])

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId)
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id)
            } else {
                newSelectedUserId.add(id)
            }

            return newSelectedUserId
        })
    }

    async function addCollaborators() {
        if (!isProjectAdmin || !project || selectedUserId.size === 0) {
            return
        }

        try {
            await axios.put('/projects/add-user', {
                projectId: project._id,
                users: Array.from(selectedUserId)
            })
            await reloadProject()
            setSelectedUserId(new Set())
            setIsModalOpen(false)
        } catch (err) {
            setActionError(getErrorMessage(err, 'Could not add collaborators'))
        }
    }

    const send = () => {
        const trimmedMessage = message.trim()

        if (!trimmedMessage || !user || socketStatus !== 'connected') {
            return
        }

        try {
            sendMessage('project-message', {
                message: trimmedMessage,
            })
            setMessage("")
        } catch (error) {
            setSocketError(error.message)
        }
    }

    function WriteAiMessage(message) {
        const messageObject = parseAiMessage(message)

        return (
            <div className='overflow-auto rounded-[10px] bg-[#2c2c2a] p-3 text-[#f0efe9]'>
                <Markdown
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                >
                    {messageObject.text}
                </Markdown>
            </div>)
    }

    const copyInviteLink = async () => {
        if (!isProjectAdmin || !inviteLink) {
            return
        }

        await navigator.clipboard.writeText(inviteLink)
        setCopyState('Copied')
        window.setTimeout(() => setCopyState(''), 1600)
    }

    const regenerateInviteCode = async () => {
        if (!isProjectAdmin || !projectId) {
            return
        }

        const res = await axios.post(`/projects/${projectId}/regenerate-invite`)
        setProject(prevProject => ({
            ...prevProject,
            inviteCode: res.data.inviteCode
        }))
    }

    const createSprint = async (event) => {
        event.preventDefault()

        if (!isProjectAdmin || !sprintForm.name.trim()) {
            return
        }

        try {
            setActionError('')
            await axios.post(`/projects/${projectId}/sprints`, sprintForm)
            setSprintForm({
                name: '',
                goal: '',
            })
            await reloadProject()
        } catch (err) {
            setActionError(getErrorMessage(err, 'Could not create sprint'))
        }
    }

    const createTicket = async (event) => {
        event.preventDefault()

        if (!ticketForm.title.trim()) {
            return
        }

        try {
            setActionError('')
            await axios.post(`/projects/${projectId}/tickets`, {
                ...ticketForm,
                assignee: ticketForm.assignee || null,
                sprintId: ticketForm.sprintId || null,
            })
            setTicketForm({
                title: '',
                description: '',
                assignee: '',
                priority: 'medium',
                sprintId: '',
            })
            await reloadProject()
        } catch (err) {
            setActionError(getErrorMessage(err, 'Could not create ticket'))
        }
    }

    const updateTicketStatus = async (ticket, status) => {
        try {
            setActionError('')
            await axios.put(`/projects/${projectId}/tickets/${ticket._id}`, {
                status
            })
            await reloadProject()
        } catch (err) {
            setActionError(getErrorMessage(err, 'Could not update ticket'))
        }
    }

    const handleLogout = async () => {
        disconnectSocket()
        await logout()
        navigate('/login', { replace: true })
    }

    useEffect(() => {
        if (!initialProjectId) {
            navigate('/')
        }
    }, [ navigate, initialProjectId ])

    useEffect(() => {
        if (!projectId) {
            return
        }

        reloadProject().catch(() => {
            navigate('/')
        })

    }, [ navigate, projectId, reloadProject ])

    useEffect(() => {
        if (!isProjectAdmin) {
            setUsers([])
            return
        }

        axios.get('/users/all').then((res) => {
            setUsers(res.data.users || [])
        }).catch((err) => {
            setActionError(getErrorMessage(err, 'Could not load users'))
        })
    }, [ isProjectAdmin ])

    useEffect(() => {
        if (!projectId) {
            return
        }

        setSocketStatus('connecting')
        setSocketError('')

        const socketConnection = initializeSocket(projectId)

        const unsubscribeReady = receiveMessage('project-message-ready', () => {
            setSocketStatus('connected')
        })
        const unsubscribeMessage = receiveMessage('project-message', data => {
            setMessages(prevMessages => {
                if (prevMessages.some(existingMessage => existingMessage._id === data._id)) {
                    return prevMessages
                }

                return [ ...prevMessages, data ]
            })
        })
        const unsubscribeError = receiveMessage('project-message-error', data => {
            setSocketError(data.error)
        })

        socketConnection.on('connect', () => setSocketStatus('connected'))
        socketConnection.on('disconnect', () => setSocketStatus('disconnected'))
        socketConnection.on('connect_error', err => {
            setSocketStatus('error')
            setSocketError(err.message)
        })

        return () => {
            unsubscribeReady()
            unsubscribeMessage()
            unsubscribeError()
            disconnectSocket()
        }
    }, [ projectId ])

    useEffect(() => {
        messageBox.current?.scrollTo({
            top: messageBox.current.scrollHeight,
        })
    }, [ messages ])

    if (!project) {
        return (
            <main className='flex min-h-screen items-center justify-center bg-[#f0efe9] text-sm font-medium text-[#888780]'>
                Loading project...
            </main>
        )
    }

    return (
        <main className='min-h-screen bg-[#f0efe9] text-[#2c2c2a]'>
            <header className='border-b-[0.5px] border-[#d3d1c7] bg-white px-4 sm:px-6'>
                <div className='mx-auto flex min-h-[52px] max-w-[1440px] flex-col gap-3 py-2 lg:flex-row lg:items-center lg:justify-between'>
                    <div className='flex min-w-0 items-center gap-3'>
                        <button
                            type='button'
                            onClick={() => navigate('/')}
                            className='inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-white text-[#2c2c2a] hover:bg-[#f8f8f5]'
                            aria-label='Back to projects'
                        >
                            <i className="ri-arrow-left-line"></i>
                        </button>
                        <div className='min-w-0'>
                            <div className='flex items-center gap-2 text-[11px] font-medium text-[#888780]'>
                                <span>Projects</span>
                                <i className="ri-arrow-right-s-line"></i>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${socketStatus === 'connected' ? 'bg-[#eaf3de] text-[#3b6d11]' : 'bg-[#faeeda] text-[#854f0b]'}`}>
                                    {socketStatus === 'connected' ? 'Connected' : socketStatus}
                                </span>
                            </div>
                            <h1 className='font-display truncate text-xl capitalize leading-6 text-[#2c2c2a]'>{project.name}</h1>
                        </div>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                        {isProjectAdmin && (
                            <button
                                type='button'
                                onClick={() => setIsModalOpen(true)}
                                className='inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#2c2c2a] px-3 text-sm font-medium text-[#f0efe9] hover:bg-[#444441]'
                            >
                                <i className="ri-user-add-line"></i>
                                Add people
                            </button>
                        )}
                        <button
                            type='button'
                            onClick={() => document.getElementById('members-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className='inline-flex h-9 items-center gap-2 rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-white px-3 text-sm font-medium text-[#2c2c2a] hover:bg-[#f8f8f5]'
                        >
                            <i className="ri-group-line"></i>
                            Members
                        </button>
                        <button
                            type='button'
                            onClick={handleLogout}
                            className='inline-flex h-9 items-center gap-2 rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-white px-3 text-sm font-medium text-[#2c2c2a] hover:bg-[#f8f8f5]'
                        >
                            <i className="ri-logout-box-r-line"></i>
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <section className='mx-auto grid max-w-[1440px] gap-4 px-4 py-5 sm:px-6 xl:grid-cols-[minmax(0,1fr)_280px]'>
                <div className='min-w-0 overflow-hidden rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white'>
                    {actionError && (
                        <div className='m-4 rounded-[10px] bg-[#fcebeb] px-3 py-2 text-sm text-[#a32d2d]'>{actionError}</div>
                    )}
                    <div className='flex overflow-x-auto border-b-[0.5px] border-[#d3d1c7] px-4'>
                        {[
                            { key: 'chat', label: 'Chat', icon: 'ri-chat-3-line' },
                            { key: 'work', label: 'Work', icon: 'ri-kanban-view-2' },
                        ].map(tab => (
                            <button
                                type='button'
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${activeTab === tab.key ? 'border-[#2c2c2a] text-[#2c2c2a]' : 'border-transparent text-[#888780] hover:text-[#2c2c2a]'}`}
                            >
                                <i className={tab.icon}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'chat' && (
                        <section className='flex h-[calc(100vh-158px)] min-h-[560px] flex-col'>
                            <div ref={messageBox} className='message-box flex flex-1 flex-col overflow-auto bg-[#f8f8f5] p-4 sm:p-5'>
                                {messages.length === 0 && (
                                    <div className='rounded-[10px] border-[0.5px] border-dashed border-[#d3d1c7] bg-white p-6 text-center text-sm font-medium text-[#888780]'>
                                        No messages yet.
                                    </div>
                                )}
                                {messages.map((msg, index) => {
                                    const previousMessage = messages[ index - 1 ]
                                    const messageDate = getMessageDate(msg) || new Date()
                                    const previousMessageDate = getMessageDate(previousMessage) || messageDate
                                    const senderId = getMemberId(msg.sender)
                                    const previousSenderId = getMemberId(previousMessage?.sender)
                                    const isMine = senderId === currentUserId
                                    const isAi = senderId === 'ai'
                                    const showDaySeparator = !previousMessage || !isSameDay(messageDate, previousMessageDate)
                                    const startsGroup = showDaySeparator || senderId !== previousSenderId
                                    const senderLabel = isMine ? 'You' : msg.sender?.email || (isAi ? 'AI assistant' : 'Unknown')

                                    return (
                                        <React.Fragment key={msg._id || `${senderId}-${msg.createdAt}-${msg.message}`}>
                                            {showDaySeparator && (
                                                <div className='my-4 flex items-center gap-3'>
                                                    <div className='h-px flex-1 bg-[#e8e7e0]'></div>
                                                    <span className='rounded-full bg-white px-3 py-1 text-[11px] font-medium text-[#888780]'>{getDayLabel(messageDate)}</span>
                                                    <div className='h-px flex-1 bg-[#e8e7e0]'></div>
                                                </div>
                                            )}
                                            {startsGroup && (
                                                <div className={`mb-1 mt-2 flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                    <div className='max-w-[86%] truncate text-[11px] font-medium text-[#888780] sm:max-w-[70%]'>
                                                        {senderLabel}{formatMessageTime(messageDate) && ` · ${formatMessageTime(messageDate)}`}
                                                    </div>
                                                </div>
                                            )}
                                            <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[86%] px-3 py-2 text-sm leading-6 shadow-sm sm:max-w-[70%] ${isMine ? 'rounded-[12px] rounded-br-[4px] bg-[#2c2c2a] text-[#f0efe9]' : 'rounded-[12px] rounded-bl-[4px] border-[0.5px] border-[#e8e7e0] bg-white text-[#2c2c2a]'} ${isAi ? 'w-full max-w-3xl rounded-[12px] border-0 bg-[#2c2c2a] text-[#f0efe9]' : ''}`}>
                                                    {isAi ? WriteAiMessage(msg.message) : <p className='whitespace-pre-wrap break-words'>{msg.message}</p>}
                                                </div>
                                            </div>
                                        </React.Fragment>
                                    )
                                })}
                            </div>

                            {socketError && (
                                <div className='mx-4 mb-3 rounded-[10px] bg-[#fcebeb] px-3 py-2 text-sm text-[#a32d2d]'>{socketError}</div>
                            )}

                            <div className='border-t-[0.5px] border-[#d3d1c7] bg-white p-3'>
                                <div className='flex gap-2'>
                                    <input
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter' && !event.shiftKey) {
                                                event.preventDefault()
                                                send()
                                            }
                                        }}
                                        className='min-w-0 flex-1 rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3.5 py-[9px] text-sm text-[#2c2c2a] outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                        type="text"
                                        placeholder='Message the project'
                                    />
                                    <button
                                        type='button'
                                        onClick={send}
                                        disabled={socketStatus !== 'connected' || !message.trim()}
                                        className='inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-[#2c2c2a] text-[#f0efe9] disabled:cursor-not-allowed disabled:bg-[#b4b2a9]'
                                        aria-label='Send message'
                                    >
                                        <i className="ri-send-plane-fill"></i>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'work' && (
                        <section className='space-y-6 p-4 sm:p-6 lg:p-7'>
                            <div className={`grid gap-4 ${isProjectAdmin ? 'xl:grid-cols-2' : ''}`}>
                                {isProjectAdmin && (
                                    <form onSubmit={createSprint} className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-5'>
                                        <h2 className='mb-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888780]'>Sprint</h2>
                                        <div className='space-y-4'>
                                            <input
                                                value={sprintForm.name}
                                                onChange={(event) => setSprintForm(prev => ({ ...prev, name: event.target.value }))}
                                                className='w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                                placeholder='Sprint name'
                                            />
                                            <textarea
                                                value={sprintForm.goal}
                                                onChange={(event) => setSprintForm(prev => ({ ...prev, goal: event.target.value }))}
                                                className='min-h-28 w-full resize-none rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                                placeholder='Goal'
                                            />
                                            <button className='w-full rounded-[10px] bg-[#2c2c2a] px-4 py-3 text-sm font-medium text-[#f0efe9] hover:bg-[#444441]'>Create sprint</button>
                                        </div>
                                    </form>
                                )}

                                <form onSubmit={createTicket} className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-5'>
                                    <h2 className='mb-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#888780]'>Ticket</h2>
                                    <div className='space-y-4'>
                                        <input
                                            value={ticketForm.title}
                                            onChange={(event) => setTicketForm(prev => ({ ...prev, title: event.target.value }))}
                                            className='w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                            placeholder='Ticket title'
                                        />
                                        <textarea
                                            value={ticketForm.description}
                                            onChange={(event) => setTicketForm(prev => ({ ...prev, description: event.target.value }))}
                                            className='min-h-28 w-full resize-none rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                            placeholder='Description'
                                        />
                                        <select value={ticketForm.assignee} onChange={(event) => setTicketForm(prev => ({ ...prev, assignee: event.target.value }))} className='w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none focus:border-[#888780] focus:bg-white'>
                                            <option value=''>Unassigned</option>
                                            {project.users?.map(member => (
                                                <option key={getMemberId(member)} value={getMemberId(member)}>{member.email || member}</option>
                                            ))}
                                        </select>
                                        <div className='grid gap-3 sm:grid-cols-2'>
                                            <select value={ticketForm.priority} onChange={(event) => setTicketForm(prev => ({ ...prev, priority: event.target.value }))} className='rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none focus:border-[#888780] focus:bg-white'>
                                                <option value='low'>Low</option>
                                                <option value='medium'>Medium</option>
                                                <option value='high'>High</option>
                                                <option value='urgent'>Urgent</option>
                                            </select>
                                            <select value={ticketForm.sprintId} onChange={(event) => setTicketForm(prev => ({ ...prev, sprintId: event.target.value }))} className='rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-3 text-sm outline-none focus:border-[#888780] focus:bg-white'>
                                                <option value=''>Backlog</option>
                                                {project.sprints?.map(sprint => (
                                                    <option key={sprint._id} value={sprint._id}>{sprint.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button className='w-full rounded-[10px] bg-[#2c2c2a] px-4 py-3 text-sm font-medium text-[#f0efe9] hover:bg-[#444441]'>Create ticket</button>
                                    </div>
                                </form>
                            </div>

                            <div className='grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]'>
                                <div className='min-w-0 overflow-x-auto rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] p-3 sm:p-4'>
                                    <div className='grid min-w-[1120px] grid-cols-4 gap-4'>
                                        {ticketColumns.map(column => (
                                            <div key={column.key} className='min-h-[620px] rounded-[10px] bg-white p-4'>
                                                <div className='mb-4 flex items-center justify-between'>
                                                    <h3 className='text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e5a]'>{column.label}</h3>
                                                    <span className='rounded-full bg-[#f8f8f5] px-2.5 py-1 text-xs font-semibold text-[#888780]'>{ticketsByStatus[ column.key ]?.length || 0}</span>
                                                </div>
                                                <div className='space-y-3'>
                                                    {ticketsByStatus[ column.key ]?.map(ticket => (
                                                        <article key={ticket._id} className='rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-white p-4 shadow-sm'>
                                                            <div className='mb-3 flex items-start justify-between gap-3'>
                                                                <h4 className='text-sm font-medium leading-6 text-[#2c2c2a]'>{ticket.title}</h4>
                                                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClasses[ ticket.priority ] || priorityClasses.medium}`}>{ticket.priority || 'medium'}</span>
                                                            </div>
                                                            {ticket.description && <p className='mb-4 text-sm leading-6 text-[#888780]'>{ticket.description}</p>}
                                                            <div className='mb-4 text-xs font-medium text-[#888780]'>
                                                                <div>{ticket.assignee?.email || 'Unassigned'}</div>
                                                            </div>
                                                            <select
                                                                value={ticket.status}
                                                                onChange={(event) => updateTicketStatus(ticket, event.target.value)}
                                                                className='w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3 py-2 text-xs outline-none focus:border-[#888780] focus:bg-white'
                                                            >
                                                                {ticketColumns.map(option => (
                                                                    <option key={option.key} value={option.key}>{option.label}</option>
                                                                ))}
                                                            </select>
                                                        </article>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <aside className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-5 shadow-sm'>
                                    <div className='mb-4 flex items-center justify-between'>
                                        <h2 className='text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e5a]'>My tasks</h2>
                                        <span className='rounded-full bg-[#f8f8f5] px-2.5 py-1 text-xs font-semibold text-[#888780]'>{myTasks.length}</span>
                                    </div>
                                    <div className='space-y-3'>
                                        {myTasks.length ? myTasks.map(ticket => (
                                            <article key={ticket._id} className='rounded-[10px] border-[0.5px] border-[#e8e7e0] p-4'>
                                                <div className='mb-2 flex items-start justify-between gap-3'>
                                                    <h3 className='text-sm font-medium leading-6 text-[#2c2c2a]'>{ticket.title}</h3>
                                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${priorityClasses[ ticket.priority ] || priorityClasses.medium}`}>{ticket.priority || 'medium'}</span>
                                                </div>
                                                <div className='mb-3 text-xs font-medium text-[#888780]'>{statusLabels[ ticket.status ] || ticket.status}</div>
                                                <select
                                                    value={ticket.status}
                                                    onChange={(event) => updateTicketStatus(ticket, event.target.value)}
                                                    className='w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3 py-2 text-xs outline-none focus:border-[#888780] focus:bg-white'
                                                >
                                                    {ticketColumns.map(option => (
                                                        <option key={option.key} value={option.key}>{option.label}</option>
                                                    ))}
                                                </select>
                                            </article>
                                        )) : (
                                            <p className='rounded-[10px] border-[0.5px] border-dashed border-[#d3d1c7] p-4 text-sm font-medium text-[#888780]'>No assigned tasks.</p>
                                        )}
                                    </div>
                                </aside>
                            </div>
                        </section>
                    )}
                </div>

                <aside className='space-y-4 xl:w-[280px]'>
                    {isProjectAdmin ? (
                        <section className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-4 shadow-sm'>
                            <h2 className='mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Invite code</h2>
                            <div className='mb-3 rounded-[10px] bg-[#f8f8f5] p-3 text-center font-mono text-xl font-semibold tracking-widest text-[#2c2c2a]'>{project.inviteCode || '--------'}</div>
                            <input
                                value={inviteLink || 'Invite link will appear after code generation'}
                                readOnly
                                className='mb-3 w-full truncate rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-white px-3 py-2 text-xs text-[#888780] outline-none'
                            />
                            <div className='flex gap-2'>
                                <button type='button' onClick={copyInviteLink} className='flex-1 rounded-[10px] bg-[#2c2c2a] px-3 py-2 text-sm font-medium text-[#f0efe9] hover:bg-[#444441]'>{copyState || 'Copy link'}</button>
                                <button type='button' onClick={regenerateInviteCode} className='h-10 w-10 rounded-[10px] border-[0.5px] border-[#d3d1c7] text-[#2c2c2a] hover:bg-[#f8f8f5]' aria-label='Regenerate invite code'><i className="ri-refresh-line"></i></button>
                            </div>
                        </section>
                    ) : (
                        <section className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-4 shadow-sm'>
                            <h2 className='mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Invite access</h2>
                            <p className='text-sm leading-6 text-[#5f5e5a]'>Only the project admin can view or share the invite link.</p>
                        </section>
                    )}

                    <section id='members-panel' className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-4 shadow-sm'>
                        <div className='mb-3 flex items-center justify-between'>
                            <h2 className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Members</h2>
                            <span className='rounded-full bg-[#f8f8f5] px-2 py-0.5 text-[11px] font-semibold text-[#888780]'>{project.users?.length || 0}</span>
                        </div>
                        <div className='space-y-2'>
                            {project.users?.map(member => {
                                const memberId = getMemberId(member)
                                const memberEmail = member.email || member
                                const role = memberId === projectOwnerId ? 'Owner' : 'Member'

                                return (
                                    <div key={memberId} className='flex items-center gap-3 rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] p-3'>
                                        <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2c2c2a] text-xs font-semibold text-[#f0efe9]'>
                                            {getInitials(memberEmail)}
                                        </div>
                                        <div className='min-w-0'>
                                            <div className='truncate text-sm font-medium text-[#2c2c2a]'>{memberEmail}</div>
                                            <div className='text-[11px] font-medium text-[#888780]'>{role}</div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </section>
                </aside>
            </section>

            {isProjectAdmin && isModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#2c2c2a]/40 p-4">
                    <div className="w-full max-w-md rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-5 shadow-xl">
                        <header className='mb-4 flex items-center justify-between'>
                            <h2 className='font-display text-2xl text-[#2c2c2a]'>Add people</h2>
                            <button type='button' onClick={() => setIsModalOpen(false)} className='h-9 w-9 rounded-[10px] text-[#888780] hover:bg-[#f8f8f5]'>
                                <i className="ri-close-line"></i>
                            </button>
                        </header>
                        <div className="mb-16 flex max-h-96 flex-col gap-2 overflow-auto">
                            {users.map(listUser => (
                                <button
                                    type='button'
                                    key={listUser._id}
                                    className={`flex cursor-pointer items-center gap-3 rounded-[10px] border-[0.5px] p-3 text-left hover:bg-[#f8f8f5] ${selectedUserId.has(listUser._id) ? 'border-[#2c2c2a] bg-[#f8f8f5]' : 'border-[#e8e7e0]'}`}
                                    onClick={() => handleUserClick(listUser._id)}
                                >
                                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-[#2c2c2a] text-xs font-semibold text-[#f0efe9]'>
                                        {getInitials(listUser.email)}
                                    </div>
                                    <span className='min-w-0 truncate text-sm font-medium text-[#2c2c2a]'>{listUser.email}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            type='button'
                            onClick={addCollaborators}
                            className='w-full rounded-[10px] bg-[#2c2c2a] px-4 py-3 text-sm font-medium text-[#f0efe9] hover:bg-[#444441]'>
                            Add selected
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project
