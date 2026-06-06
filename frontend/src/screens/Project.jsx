import React, { useState, useEffect, useContext, useRef, useMemo, useCallback } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import axios from '../config/axios'
import { disconnectSocket, initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webcontainer'

const ticketColumns = [
    { key: 'todo', label: 'To do' },
    { key: 'in-progress', label: 'In progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' },
]

const priorityClasses = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
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
    const [ isSidePanelOpen, setIsSidePanelOpen ] = useState(false)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ selectedUserId, setSelectedUserId ] = useState(new Set())
    const [ project, setProject ] = useState(initialProject || null)
    const [ message, setMessage ] = useState('')
    const [ socketStatus, setSocketStatus ] = useState('connecting')
    const [ socketError, setSocketError ] = useState('')
    const [ copyState, setCopyState ] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = useRef(null)
    const webContainerRef = useRef(null)

    const [ users, setUsers ] = useState([])
    const [ messages, setMessages ] = useState([])
    const [ fileTree, setFileTree ] = useState({})

    const [ currentFile, setCurrentFile ] = useState(null)
    const [ openFiles, setOpenFiles ] = useState([])

    const [ webContainer, setWebContainer ] = useState(null)
    const [ iframeUrl, setIframeUrl ] = useState(null)
    const [ runProcess, setRunProcess ] = useState(null)

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

    const reloadProject = useCallback(async () => {
        if (!projectId) {
            return
        }

        const res = await axios.get(`/projects/get-project/${projectId}`)
        setProject(res.data.project)
        setFileTree(res.data.project.fileTree || {})
        setMessages(res.data.project.messages || [])
    }, [ projectId ])

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }

            return newSelectedUserId;
        });
    }

    async function addCollaborators() {
        if (!project || selectedUserId.size === 0) {
            return
        }

        try {
            await axios.put("/projects/add-user", {
                projectId: project._id,
                users: Array.from(selectedUserId)
            })
            await reloadProject()
            setSelectedUserId(new Set())
            setIsModalOpen(false)
        } catch (err) {
            console.log(err)
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
            <div className='overflow-auto rounded-md bg-slate-950 p-3 text-white'>
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
        if (!inviteLink) {
            return
        }

        await navigator.clipboard.writeText(inviteLink)
        setCopyState('Copied')
        window.setTimeout(() => setCopyState(''), 1600)
    }

    const regenerateInviteCode = async () => {
        if (!projectId) {
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

        if (!sprintForm.name.trim()) {
            return
        }

        await axios.post(`/projects/${projectId}/sprints`, sprintForm)
        setSprintForm({
            name: '',
            goal: '',
        })
        await reloadProject()
    }

    const createTicket = async (event) => {
        event.preventDefault()

        if (!ticketForm.title.trim()) {
            return
        }

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
    }

    const updateTicketStatus = async (ticket, status) => {
        await axios.put(`/projects/${projectId}/tickets/${ticket._id}`, {
            status
        })
        await reloadProject()
    }

    useEffect(() => {
        if (!initialProjectId) {
            navigate('/')
        }
    }, [ navigate, initialProjectId ])

    useEffect(() => {
        let isMounted = true

        getWebContainer().then(container => {
            if (isMounted) {
                webContainerRef.current = container
                setWebContainer(container)
            }
        }).catch(err => {
            console.log(err)
        })

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        if (!projectId) {
            return
        }

        reloadProject().catch(err => {
            console.log(err)
            navigate('/')
        })

        axios.get('/users/all').then((res) => {
            setUsers(res.data.users || [])
        }).catch((err) => {
            console.error('Auth error:', err.response?.data || err.message)
        })
    }, [ navigate, projectId, reloadProject ])

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
        const unsubscribeMessage = receiveMessage('project-message', async data => {
            if (data.sender?._id === 'ai') {
                const aiMessage = parseAiMessage(data.message)

                if (aiMessage.fileTree) {
                    await webContainerRef.current?.mount(aiMessage.fileTree)
                    setFileTree(aiMessage.fileTree || {})
                }
            }

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

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }

    const runFileTree = async () => {
        if (!webContainer || !Object.keys(fileTree).length) {
            return
        }

        await webContainer.mount(fileTree)
        const installProcess = await webContainer.spawn("npm", [ "install" ])

        installProcess.output.pipeTo(new WritableStream({
            write(chunk) {
                console.log(chunk)
            }
        }))

        if (runProcess) {
            runProcess.kill()
        }

        const tempRunProcess = await webContainer.spawn("npm", [ "start" ]);

        tempRunProcess.output.pipeTo(new WritableStream({
            write(chunk) {
                console.log(chunk)
            }
        }))

        setRunProcess(tempRunProcess)

        webContainer.on('server-ready', (port, url) => {
            console.log(port, url)
            setIframeUrl(url)
        })
    }

    if (!project) {
        return (
            <main className='flex min-h-screen items-center justify-center bg-slate-950 text-white'>
                Loading project...
            </main>
        )
    }

    return (
        <main className='min-h-screen bg-slate-100 text-slate-950'>
            <header className='border-b border-slate-200 bg-white px-4 py-4 sm:px-6'>
                <div className='mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                    <div>
                        <button onClick={() => navigate('/')} className='mb-2 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900'>
                            <i className="ri-arrow-left-line"></i>
                            Projects
                        </button>
                        <div className='flex flex-wrap items-center gap-3'>
                            <h1 className='text-2xl font-semibold capitalize tracking-tight sm:text-3xl'>{project.name}</h1>
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${socketStatus === 'connected' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                {socketStatus}
                            </span>
                        </div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                        <button onClick={() => setIsModalOpen(true)} className='inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'>
                            <i className="ri-user-add-line"></i>
                            Add people
                        </button>
                        <button onClick={() => setIsSidePanelOpen(true)} className='inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                            <i className="ri-group-line"></i>
                            Members
                        </button>
                    </div>
                </div>
            </header>

            <section className='mx-auto grid max-w-7xl gap-4 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px]'>
                <div className='min-w-0 rounded-lg border border-slate-200 bg-white shadow-sm'>
                    <div className='flex overflow-x-auto border-b border-slate-200 px-3'>
                        {[
                            { key: 'chat', label: 'Chat', icon: 'ri-chat-3-line' },
                            { key: 'work', label: 'Work', icon: 'ri-kanban-view-2' },
                            { key: 'files', label: 'Files', icon: 'ri-code-box-line' },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold ${activeTab === tab.key ? 'border-slate-950 text-slate-950' : 'border-transparent text-slate-500 hover:text-slate-900'}`}
                            >
                                <i className={tab.icon}></i>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'chat' && (
                        <section className='flex h-[calc(100vh-230px)] min-h-[520px] flex-col'>
                            <div ref={messageBox} className='message-box flex flex-1 flex-col gap-3 overflow-auto p-4'>
                                {messages.length === 0 && (
                                    <div className='rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500'>
                                        No messages yet.
                                    </div>
                                )}
                                {messages.map((msg) => {
                                    const isMine = msg.sender?._id === user?._id?.toString()
                                    const isAi = msg.sender?._id === 'ai'

                                    return (
                                        <div key={msg._id || `${msg.sender?._id}-${msg.createdAt}-${msg.message}`} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[86%] rounded-lg p-3 shadow-sm sm:max-w-[70%] ${isMine ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-900'} ${isAi ? 'w-full max-w-3xl bg-slate-900 text-white' : ''}`}>
                                                <div className='mb-1 flex items-center gap-2 text-xs opacity-70'>
                                                    <span>{msg.sender?.email}</span>
                                                    {msg.createdAt && <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
                                                </div>
                                                <div className='text-sm leading-6'>
                                                    {isAi ? WriteAiMessage(msg.message) : <p className='whitespace-pre-wrap break-words'>{msg.message}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {socketError && (
                                <div className='mx-4 mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'>{socketError}</div>
                            )}

                            <div className='border-t border-slate-200 p-3'>
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
                                        className='min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900'
                                        type="text"
                                        placeholder='Message the project'
                                    />
                                    <button
                                        onClick={send}
                                        disabled={socketStatus !== 'connected' || !message.trim()}
                                        className='inline-flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white disabled:cursor-not-allowed disabled:bg-slate-300'
                                    >
                                        <i className="ri-send-plane-fill"></i>
                                    </button>
                                </div>
                            </div>
                        </section>
                    )}

                    {activeTab === 'work' && (
                        <section className='grid gap-4 p-4 xl:grid-cols-[320px_minmax(0,1fr)]'>
                            <div className='space-y-4'>
                                <form onSubmit={createSprint} className='rounded-lg border border-slate-200 p-4'>
                                    <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500'>Sprint</h2>
                                    <div className='space-y-3'>
                                        <input
                                            value={sprintForm.name}
                                            onChange={(event) => setSprintForm(prev => ({ ...prev, name: event.target.value }))}
                                            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
                                            placeholder='Sprint name'
                                        />
                                        <textarea
                                            value={sprintForm.goal}
                                            onChange={(event) => setSprintForm(prev => ({ ...prev, goal: event.target.value }))}
                                            className='min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
                                            placeholder='Goal'
                                        />
                                        <button className='w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white'>Create sprint</button>
                                    </div>
                                </form>

                                <form onSubmit={createTicket} className='rounded-lg border border-slate-200 p-4'>
                                    <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500'>Ticket</h2>
                                    <div className='space-y-3'>
                                        <input
                                            value={ticketForm.title}
                                            onChange={(event) => setTicketForm(prev => ({ ...prev, title: event.target.value }))}
                                            className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
                                            placeholder='Ticket title'
                                        />
                                        <textarea
                                            value={ticketForm.description}
                                            onChange={(event) => setTicketForm(prev => ({ ...prev, description: event.target.value }))}
                                            className='min-h-20 w-full rounded-md border border-slate-300 px-3 py-2 text-sm'
                                            placeholder='Description'
                                        />
                                        <select value={ticketForm.assignee} onChange={(event) => setTicketForm(prev => ({ ...prev, assignee: event.target.value }))} className='w-full rounded-md border border-slate-300 px-3 py-2 text-sm'>
                                            <option value=''>Unassigned</option>
                                            {project.users?.map(member => (
                                                <option key={member._id} value={member._id}>{member.email}</option>
                                            ))}
                                        </select>
                                        <div className='grid grid-cols-2 gap-2'>
                                            <select value={ticketForm.priority} onChange={(event) => setTicketForm(prev => ({ ...prev, priority: event.target.value }))} className='rounded-md border border-slate-300 px-3 py-2 text-sm'>
                                                <option value='low'>Low</option>
                                                <option value='medium'>Medium</option>
                                                <option value='high'>High</option>
                                                <option value='urgent'>Urgent</option>
                                            </select>
                                            <select value={ticketForm.sprintId} onChange={(event) => setTicketForm(prev => ({ ...prev, sprintId: event.target.value }))} className='rounded-md border border-slate-300 px-3 py-2 text-sm'>
                                                <option value=''>Backlog</option>
                                                {project.sprints?.map(sprint => (
                                                    <option key={sprint._id} value={sprint._id}>{sprint.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button className='w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white'>Create ticket</button>
                                    </div>
                                </form>
                            </div>

                            <div className='min-w-0 overflow-x-auto'>
                                <div className='grid min-w-[900px] grid-cols-4 gap-3'>
                                    {ticketColumns.map(column => (
                                        <div key={column.key} className='rounded-lg bg-slate-100 p-3'>
                                            <div className='mb-3 flex items-center justify-between'>
                                                <h3 className='text-sm font-semibold'>{column.label}</h3>
                                                <span className='rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500'>{ticketsByStatus[ column.key ]?.length || 0}</span>
                                            </div>
                                            <div className='space-y-3'>
                                                {ticketsByStatus[ column.key ]?.map(ticket => (
                                                    <article key={ticket._id} className='rounded-lg border border-slate-200 bg-white p-3 shadow-sm'>
                                                        <div className='mb-2 flex items-start justify-between gap-2'>
                                                            <h4 className='text-sm font-semibold leading-5'>{ticket.title}</h4>
                                                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClasses[ ticket.priority ]}`}>{ticket.priority}</span>
                                                        </div>
                                                        {ticket.description && <p className='mb-3 text-xs leading-5 text-slate-500'>{ticket.description}</p>}
                                                        <div className='mb-3 text-xs text-slate-500'>
                                                            <div>{ticket.assignee?.email || 'Unassigned'}</div>
                                                        </div>
                                                        <select
                                                            value={ticket.status}
                                                            onChange={(event) => updateTicketStatus(ticket, event.target.value)}
                                                            className='w-full rounded-md border border-slate-300 px-2 py-1 text-xs'
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
                        </section>
                    )}

                    {activeTab === 'files' && (
                        <section className='grid h-[calc(100vh-230px)] min-h-[520px] grid-cols-1 overflow-hidden lg:grid-cols-[220px_minmax(0,1fr)]'>
                            <aside className='border-b border-slate-200 bg-slate-50 lg:border-b-0 lg:border-r'>
                                <div className='flex items-center justify-between border-b border-slate-200 p-3'>
                                    <h2 className='text-sm font-semibold'>Files</h2>
                                    <button onClick={runFileTree} className='rounded-md bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white'>Run</button>
                                </div>
                                <div className='max-h-60 overflow-auto lg:max-h-none'>
                                    {Object.keys(fileTree).map((file) => (
                                        <button
                                            key={file}
                                            onClick={() => {
                                                setCurrentFile(file)
                                                setOpenFiles([ ...new Set([ ...openFiles, file ]) ])
                                            }}
                                            className={`block w-full truncate px-3 py-2 text-left text-sm hover:bg-slate-200 ${currentFile === file ? 'bg-slate-200 font-semibold' : ''}`}>
                                            {file}
                                        </button>))
                                    }
                                </div>
                            </aside>

                            <div className='flex min-w-0 flex-col'>
                                <div className='flex min-h-11 overflow-x-auto border-b border-slate-200 bg-white'>
                                    {openFiles.map((file) => (
                                        <button
                                            key={file}
                                            onClick={() => setCurrentFile(file)}
                                            className={`whitespace-nowrap px-4 py-2 text-sm ${currentFile === file ? 'bg-slate-100 font-semibold' : ''}`}>
                                            {file}
                                        </button>
                                    ))}
                                </div>
                                <div className='grid min-h-0 flex-1 grid-cols-1 overflow-hidden xl:grid-cols-[minmax(0,1fr)_420px]'>
                                    <div className='min-h-0 overflow-auto bg-slate-950 text-white'>
                                        {fileTree[ currentFile ] ? (
                                            <pre className="h-full">
                                                <code
                                                    className="block min-h-full outline-none"
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => {
                                                        const updatedContent = e.target.innerText;
                                                        const ft = {
                                                            ...fileTree,
                                                            [ currentFile ]: {
                                                                file: {
                                                                    contents: updatedContent
                                                                }
                                                            }
                                                        }
                                                        setFileTree(ft)
                                                        saveFileTree(ft)
                                                    }}
                                                    dangerouslySetInnerHTML={{ __html: hljs.highlight('javascript', fileTree[ currentFile ].file.contents).value }}
                                                    style={{
                                                        whiteSpace: 'pre-wrap',
                                                        padding: '1rem',
                                                        paddingBottom: '12rem',
                                                    }}
                                                />
                                            </pre>
                                        ) : (
                                            <div className='flex h-full items-center justify-center text-sm text-slate-400'>No file selected.</div>
                                        )}
                                    </div>
                                    {iframeUrl && webContainer && (
                                        <div className='flex min-h-80 flex-col border-t border-slate-200 xl:border-l xl:border-t-0'>
                                            <input
                                                type="text"
                                                onChange={(e) => setIframeUrl(e.target.value)}
                                                value={iframeUrl}
                                                className="w-full border-b border-slate-200 bg-slate-50 p-2 text-sm"
                                            />
                                            <iframe title="Project preview" src={iframeUrl} className="h-full min-h-80 w-full"></iframe>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <aside className='space-y-4'>
                    <section className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500'>Invite</h2>
                        <div className='mb-3 rounded-md bg-slate-100 p-3 text-center font-mono text-xl font-semibold tracking-widest'>{project.inviteCode || '--------'}</div>
                        <div className='flex gap-2'>
                            <button onClick={copyInviteLink} className='flex-1 rounded-md bg-slate-950 px-3 py-2 text-sm font-semibold text-white'>{copyState || 'Copy link'}</button>
                            <button onClick={regenerateInviteCode} className='h-10 w-10 rounded-md border border-slate-300 text-slate-600'><i className="ri-refresh-line"></i></button>
                        </div>
                    </section>

                    <section className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500'>Sprints</h2>
                        <div className='space-y-2'>
                            {project.sprints?.length ? project.sprints.map(sprint => (
                                <div key={sprint._id} className='rounded-md border border-slate-200 p-3'>
                                    <div className='text-sm font-semibold'>{sprint.name}</div>
                                    {sprint.goal && <div className='mt-1 text-xs text-slate-500'>{sprint.goal}</div>}
                                </div>
                            )) : <p className='text-sm text-slate-500'>No sprints yet.</p>}
                        </div>
                    </section>
                </aside>
            </section>

            <div className={`fixed inset-y-0 right-0 z-30 w-full max-w-sm transform bg-white shadow-xl transition-transform ${isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <header className='flex items-center justify-between border-b border-slate-200 p-4'>
                    <h2 className='text-lg font-semibold'>Members</h2>
                    <button onClick={() => setIsSidePanelOpen(false)} className='h-9 w-9 rounded-md hover:bg-slate-100'>
                        <i className="ri-close-line"></i>
                    </button>
                </header>
                <div className='space-y-2 p-4'>
                    {project.users?.map(member => (
                        <div key={member._id || member} className='flex items-center gap-3 rounded-md border border-slate-200 p-3'>
                            <div className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white'>
                                <i className="ri-user-line"></i>
                            </div>
                            <div className='min-w-0'>
                                <div className='truncate text-sm font-semibold'>{member.email || member}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl">
                        <header className='mb-4 flex items-center justify-between'>
                            <h2 className='text-lg font-semibold'>Add people</h2>
                            <button onClick={() => setIsModalOpen(false)} className='h-9 w-9 rounded-md hover:bg-slate-100'>
                                <i className="ri-close-line"></i>
                            </button>
                        </header>
                        <div className="mb-16 flex max-h-96 flex-col gap-2 overflow-auto">
                            {users.map(listUser => (
                                <button key={listUser._id} className={`flex cursor-pointer items-center gap-3 rounded-md p-3 text-left hover:bg-slate-100 ${selectedUserId.has(listUser._id) ? 'bg-slate-100' : ""}`} onClick={() => handleUserClick(listUser._id)}>
                                    <div className='flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white'>
                                        <i className="ri-user-line"></i>
                                    </div>
                                    <span className='min-w-0 truncate text-sm font-semibold'>{listUser.email}</span>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className='w-full rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white'>
                            Add selected
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project
