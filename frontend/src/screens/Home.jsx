import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '../config/axios'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/userContext'
import { getErrorMessage } from '../utils/getErrorMessage'
import WorkspaceBackdrop from '../components/WorkspaceBackdrop'

const pendingTaskColumns = [
    { key: 'todo', label: 'To do' },
    { key: 'in-progress', label: 'In progress' },
    { key: 'review', label: 'Review' },
]

const priorityClasses = {
    low: 'bg-[#eaf3de] text-[#3b6d11]',
    medium: 'bg-[#faeeda] text-[#854f0b]',
    high: 'bg-[#fcebeb] text-[#a32d2d]',
    urgent: 'bg-[#fcebeb] text-[#a32d2d]',
}

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

const getProjectRole = (project, currentUserId) => {
    return getMemberId(project.owner) === currentUserId ? 'Admin' : 'Member'
}

const Home = () => {
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ projectName, setProjectName ] = useState('')
    const [ inviteCode, setInviteCode ] = useState('')
    const [ joinError, setJoinError ] = useState('')
    const [ projectError, setProjectError ] = useState('')
    const [ createError, setCreateError ] = useState('')
    const [ isCreating, setIsCreating ] = useState(false)
    const [ projects, setProjects ] = useState([])
    const { user, logout } = useUser()
    const navigate = useNavigate()
    const currentUserId = user?._id?.toString()

    const pendingTasksByStatus = useMemo(() => {
        const groupedTasks = pendingTaskColumns.reduce((acc, column) => {
            acc[ column.key ] = []
            return acc
        }, {})

        projects.forEach(project => {
            project.tickets?.forEach(ticket => {
                if (ticket.status === 'done' || getMemberId(ticket.assignee) !== currentUserId) {
                    return
                }

                groupedTasks[ ticket.status ]?.push({
                    ...ticket,
                    projectId: project._id,
                    projectName: project.name,
                })
            })
        })

        return groupedTasks
    }, [ currentUserId, projects ])

    const pendingTaskCount = useMemo(() => {
        return pendingTaskColumns.reduce((count, column) => count + pendingTasksByStatus[ column.key ].length, 0)
    }, [ pendingTasksByStatus ])

    const statCards = useMemo(() => ([
        {
            label: 'Assigned to me',
            value: pendingTaskCount,
            highlighted: true,
        },
        {
            label: 'In progress',
            value: pendingTasksByStatus[ 'in-progress' ].length,
        },
        {
            label: 'In review',
            value: pendingTasksByStatus.review.length,
        },
    ]), [ pendingTaskCount, pendingTasksByStatus ])

    const dashboardSummary = useMemo(() => {
        const adminProjectCount = projects.filter(project => getProjectRole(project, currentUserId) === 'Admin').length
        const totalTicketCount = projects.reduce((count, project) => count + (project.tickets?.length || 0), 0)

        return {
            adminProjectCount,
            memberProjectCount: Math.max(projects.length - adminProjectCount, 0),
            totalTicketCount,
        }
    }, [ currentUserId, projects ])

    const loadProjects = useCallback(async () => {
        setProjectError('')

        try {
            const res = await axios.get('/projects/all')
            setProjects(res.data.projects || [])
        } catch (err) {
            setProjectError(getErrorMessage(err, 'Could not load projects'))
        }
    }, [])

    async function createProject(e) {
        e.preventDefault()
        setCreateError('')
        setIsCreating(true)

        try {
            const res = await axios.post('/projects/create', {
                name: projectName,
            })

            setProjects(prevProjects => [ res.data, ...prevProjects ])
            setProjectName('')
            setIsModalOpen(false)
            navigate(`/project/${res.data._id}`, {
                state: { project: res.data }
            })
        } catch (err) {
            setCreateError(getErrorMessage(err, 'Could not create project'))
        } finally {
            setIsCreating(false)
        }
    }

    const joinProject = async (event) => {
        event.preventDefault()
        setJoinError('')

        try {
            const res = await axios.post('/projects/join', {
                inviteCode
            })

            setInviteCode('')
            navigate(`/project/${res.data.project._id}`, {
                state: { project: res.data.project }
            })
        } catch (err) {
            setJoinError(getErrorMessage(err, 'Could not join project'))
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    useEffect(() => {
        loadProjects()
    }, [ loadProjects ])

    return (
        <main className='workspace-page min-h-screen text-[#2c2c2a]'>
            <WorkspaceBackdrop />
            <header className='relative z-10 border-b-[0.5px] border-[#d3d1c7] bg-white/95 px-4 backdrop-blur sm:px-6'>
                <div className='mx-auto flex min-h-[52px] max-w-7xl flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between'>
                    <div>
                        <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Workspace</p>
                        <h1 className='font-display text-xl leading-6 text-[#2c2c2a]'>Projects</h1>
                    </div>
                    <div className='flex flex-wrap items-center gap-2'>
                        <span className='max-w-[220px] truncate text-xs font-medium text-[#888780]'>{user?.email}</span>
                        <button
                            onClick={handleLogout}
                            className='inline-flex h-9 items-center gap-2 rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-white px-3 text-sm font-medium text-[#2c2c2a] hover:bg-[#f8f8f5]'>
                            <i className="ri-logout-box-r-line"></i>
                            Logout
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className='inline-flex h-9 items-center gap-2 rounded-[10px] bg-[#2c2c2a] px-3 text-sm font-medium text-[#f0efe9] hover:bg-[#444441]'>
                            <i className="ri-add-line"></i>
                            New project
                        </button>
                    </div>
                </div>
            </header>

            <section className='relative z-10 mx-auto grid max-w-7xl gap-4 px-4 py-5 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
                <div className='order-2 min-w-0 space-y-4'>
                    <section className='workspace-animated-panel rounded-[18px] border-[0.5px] border-[#d3d1c7] bg-white/90 p-5 shadow-[0_18px_60px_rgba(44,44,42,0.09)] backdrop-blur'>
                        <div className='relative z-10 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-center'>
                            <div>
                                <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Today</p>
                                <h2 className='font-display mt-1 text-3xl leading-tight text-[#2c2c2a]'>
                                    {projects.length ? `${projects.length} active project${projects.length === 1 ? '' : 's'}` : 'Workspace ready'}
                                </h2>
                                <div className='mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#5f5e5a]'>
                                    <span className='rounded-full bg-[#f8f8f5] px-3 py-1'>{pendingTaskCount} pending</span>
                                    <span className='rounded-full bg-[#eaf3de] px-3 py-1 text-[#3b6d11]'>{dashboardSummary.adminProjectCount} admin</span>
                                    <span className='rounded-full bg-[#faeeda] px-3 py-1 text-[#854f0b]'>{dashboardSummary.totalTicketCount} tickets</span>
                                </div>
                            </div>
                            <div className='rounded-[14px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] p-4'>
                                <div className='dashboard-signal flex h-16 items-end justify-center gap-3'>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className='grid gap-3 sm:grid-cols-3'>
                        {statCards.map(card => (
                            <article
                                key={card.label}
                                className={`rounded-xl border-[0.5px] p-[18px_18px] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.highlighted ? 'border-[#2c2c2a] bg-[#2c2c2a]' : 'border-[#d3d1c7] bg-white/95 backdrop-blur'}`}>
                                <div className={`font-display text-[28px] leading-none ${card.highlighted ? 'text-[#f0efe9]' : 'text-[#2c2c2a]'}`}>{card.value}</div>
                                <div className={`mt-2 text-[11px] font-medium ${card.highlighted ? 'text-[#f0efe9]/80' : 'text-[#888780]'}`}>{card.label}</div>
                            </article>
                        ))}
                    </div>

                    <section className='rounded-[18px] border-[0.5px] border-[#d3d1c7] bg-white/95 p-5 shadow-sm backdrop-blur'>
                        <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                            <h2 className='text-[13px] font-medium text-[#2c2c2a]'>My pending tasks</h2>
                            <span className='text-[11px] font-medium text-[#888780]'>{pendingTaskCount} assigned across projects</span>
                        </div>

                        <div className='overflow-x-auto'>
                            <div className='grid min-w-[780px] grid-cols-3 gap-3'>
                                {pendingTaskColumns.map(column => (
                                    <div key={column.key} className='min-h-[360px] rounded-[12px] bg-[#f8f8f5] p-3'>
                                        <div className='mb-3 flex items-center justify-between'>
                                            <h3 className='text-[11px] font-semibold uppercase tracking-[0.08em] text-[#5f5e5a]'>{column.label}</h3>
                                            <span className='rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-[#888780]'>{pendingTasksByStatus[ column.key ].length}</span>
                                        </div>
                                        <div className='space-y-2.5'>
                                            {pendingTasksByStatus[ column.key ].length ? pendingTasksByStatus[ column.key ].map(task => (
                                                <button
                                                    key={`${task.projectId}-${task._id}`}
                                                    onClick={() => navigate(`/project/${task.projectId}`)}
                                                    className='block w-full rounded-[12px] border-[0.5px] border-[#e8e7e0] bg-white px-3 py-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm'>
                                                    <h4 className='text-[13px] font-medium leading-5 text-[#2c2c2a]'>{task.title}</h4>
                                                    <div className='mt-1 text-[11px] font-medium text-[#888780]'>{task.projectName}</div>
                                                    <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClasses[ task.priority ] || priorityClasses.medium}`}>
                                                        {task.priority || 'medium'}
                                                    </span>
                                                </button>
                                            )) : (
                                                <div className='flex min-h-52 items-center justify-center rounded-[10px] border-[0.5px] border-dashed border-[#e8e7e0] bg-white/60 text-[12px] font-medium text-[#b4b2a9]'>No tasks</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <aside className='order-1 space-y-3 lg:w-[280px]'>
                    <section className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-4'>
                        <div className='mb-4 flex items-center gap-3'>
                            <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2c2c2a] text-sm font-semibold text-[#f0efe9]'>
                                {getInitials(user?.email)}
                            </div>
                            <div className='min-w-0'>
                                <h2 className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Account</h2>
                                <p className='truncate text-sm font-medium text-[#2c2c2a]'>{user?.email}</p>
                            </div>
                        </div>
                        <div className='space-y-2 rounded-[10px] bg-[#f8f8f5] p-3 text-[12px] font-medium text-[#5f5e5a]'>
                            <div className='flex items-center justify-between gap-3'>
                                <span>User ID</span>
                                <span className='max-w-[130px] truncate font-mono text-[11px] text-[#888780]'>{user?._id || 'Unavailable'}</span>
                            </div>
                            <div className='flex items-center justify-between gap-3'>
                                <span>Admin projects</span>
                                <span className='text-[#2c2c2a]'>{dashboardSummary.adminProjectCount}</span>
                            </div>
                            <div className='flex items-center justify-between gap-3'>
                                <span>Member projects</span>
                                <span className='text-[#2c2c2a]'>{dashboardSummary.memberProjectCount}</span>
                            </div>
                            <div className='flex items-center justify-between gap-3'>
                                <span>Total tickets</span>
                                <span className='text-[#2c2c2a]'>{dashboardSummary.totalTicketCount}</span>
                            </div>
                        </div>
                    </section>

                    <section className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-4'>
                        <h2 className='mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Settings</h2>
                        <div className='space-y-2'>
                            <div className='flex items-center justify-between gap-3 rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] px-3 py-2'>
                                <span className='text-[12px] font-medium text-[#5f5e5a]'>Theme</span>
                                <span className='text-[12px] font-medium text-[#2c2c2a]'>Workspace</span>
                            </div>
                            <div className='flex items-center justify-between gap-3 rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] px-3 py-2'>
                                <span className='text-[12px] font-medium text-[#5f5e5a]'>Invite links</span>
                                <span className='text-[12px] font-medium text-[#2c2c2a]'>Admin only</span>
                            </div>
                            <div className='flex items-center justify-between gap-3 rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] px-3 py-2'>
                                <span className='text-[12px] font-medium text-[#5f5e5a]'>Task view</span>
                                <span className='text-[12px] font-medium text-[#2c2c2a]'>Pending</span>
                            </div>
                        </div>
                    </section>

                    <section className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-3'>
                        <div className='mb-3 flex items-center justify-between'>
                            <h2 className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Active projects</h2>
                            <span className='text-[11px] font-medium text-[#888780]'>{projects.length}</span>
                        </div>
                        {projectError && (
                            <p className='mb-3 rounded-[10px] bg-[#fcebeb] px-3 py-2 text-sm text-[#a32d2d]'>{projectError}</p>
                        )}
                        <div className='space-y-2'>
                            {projects.length ? projects.map(project => (
                                <button
                                    key={project._id}
                                    onClick={() => navigate(`/project/${project._id}`, { state: { project } })}
                                    className='w-full rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] p-3 text-left hover:bg-white'>
                                    <div className='flex items-start justify-between gap-2'>
                                        <h3 className='max-w-[170px] truncate text-sm font-medium capitalize text-[#2c2c2a]'>{project.name}</h3>
                                        <i className='ri-arrow-right-up-line text-[#888780]'></i>
                                    </div>
                                    <p className='mt-1 text-[11px] font-medium text-[#888780]'>{getProjectRole(project, currentUserId)} access</p>
                                    <div className='mt-3 flex items-center gap-3 text-[11px] font-medium text-[#888780]'>
                                        <span className='inline-flex items-center gap-1'>
                                            <i className='ri-user-line'></i>
                                            {project.users?.length || 0}
                                        </span>
                                        <span className='inline-flex items-center gap-1'>
                                            <i className='ri-task-line'></i>
                                            {project.tickets?.length || 0}
                                        </span>
                                    </div>
                                </button>
                            )) : (
                                <p className='rounded-[10px] border-[0.5px] border-dashed border-[#d3d1c7] px-3 py-4 text-center text-xs text-[#888780]'>No projects yet.</p>
                            )}
                        </div>
                    </section>

                    <form onSubmit={joinProject} className='rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-3'>
                        <h2 className='mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Join project</h2>
                        <div className='flex gap-2'>
                            <input
                                value={inviteCode}
                                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                                className='min-w-0 flex-1 rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3 py-[9px] font-mono text-xs tracking-[0.08em] text-[#2c2c2a] outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                placeholder='INVITE'
                            />
                            <button className='rounded-[10px] bg-[#2c2c2a] px-3 text-xs font-medium text-[#f0efe9] hover:bg-[#444441]'>Join</button>
                        </div>
                        {joinError && <p className='mt-3 text-sm text-[#a32d2d]'>{joinError}</p>}
                    </form>
                </aside>
            </section>

            {isModalOpen && (
                <div className='fixed inset-0 z-40 flex items-center justify-center bg-[#2c2c2a]/40 p-4'>
                    <div className='w-full max-w-md rounded-[14px] border-[0.5px] border-[#d3d1c7] bg-white p-6 shadow-xl'>
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className='font-display text-2xl text-[#2c2c2a]'>Create project</h2>
                            <button type='button' className='h-9 w-9 rounded-[10px] text-[#888780] hover:bg-[#f8f8f5]' onClick={() => setIsModalOpen(false)}>
                                <i className='ri-close-line'></i>
                            </button>
                        </div>
                        <form onSubmit={createProject} className='space-y-4'>
                            <div>
                                <label className='mb-1.5 block text-[12px] font-medium uppercase tracking-[0.04em] text-[#5f5e5a]'>Project name</label>
                                <input
                                    onChange={(e) => setProjectName(e.target.value)}
                                    value={projectName}
                                    type='text'
                                    className='block w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3.5 py-[11px] text-sm outline-none focus:border-[#888780] focus:bg-white'
                                    required
                                />
                            </div>
                            {createError && <p className='rounded-[10px] bg-[#fcebeb] px-3 py-2 text-sm text-[#a32d2d]'>{createError}</p>}
                            <div className='flex justify-end gap-2'>
                                <button type='button' className='rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-white px-4 py-2 text-sm font-medium text-[#2c2c2a] hover:bg-[#f8f8f5]' onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type='submit' disabled={isCreating} className='rounded-[10px] bg-[#2c2c2a] px-4 py-2 text-sm font-medium text-[#f0efe9] hover:bg-[#444441] disabled:cursor-not-allowed disabled:bg-[#b4b2a9]'>
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home
