import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '../config/axios'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../context/userContext'
import { getErrorMessage } from '../utils/getErrorMessage'

const pendingTaskColumns = [
    { key: 'todo', label: 'To do' },
    { key: 'in-progress', label: 'In progress' },
    { key: 'review', label: 'Review' },
]

const priorityClasses = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-blue-100 text-blue-700',
    high: 'bg-amber-100 text-amber-700',
    urgent: 'bg-red-100 text-red-700',
}

const getMemberId = (member) => {
    if (!member) {
        return ''
    }

    return typeof member === 'object' ? member._id?.toString() : member.toString()
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
        <main className='min-h-screen bg-slate-100 text-slate-950'>
            <header className='border-b border-slate-200 bg-white px-4 py-5 sm:px-6'>
                <div className='mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                    <div>
                        <p className='text-sm font-semibold uppercase tracking-wide text-slate-500'>Workspace</p>
                        <h1 className='mt-1 text-3xl font-semibold tracking-tight'>Projects</h1>
                    </div>
                    <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                        <span className='max-w-xs truncate rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600'>
                            {user?.email}
                        </span>
                        <button
                            onClick={handleLogout}
                            className='inline-flex w-fit items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50'>
                            <i className="ri-logout-box-r-line"></i>
                            Logout
                        </button>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className='inline-flex w-fit items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'>
                            <i className="ri-add-line"></i>
                            New project
                        </button>
                    </div>
                </div>
            </header>

            <section className='mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
                <section className='min-w-0 rounded-lg border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2 sm:p-5'>
                    <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                        <div>
                            <h2 className='text-lg font-semibold'>My pending tasks</h2>
                            <p className='mt-1 text-sm text-slate-500'>{pendingTaskCount} assigned across projects</p>
                        </div>
                        <span className='rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500'>{pendingTaskCount}</span>
                    </div>

                    {pendingTaskCount ? (
                        <div className='overflow-x-auto'>
                            <div className='grid min-w-[840px] grid-cols-3 gap-3'>
                                {pendingTaskColumns.map(column => (
                                    <div key={column.key} className='min-h-52 rounded-lg bg-slate-100 p-3'>
                                        <div className='mb-3 flex items-center justify-between'>
                                            <h3 className='text-sm font-semibold'>{column.label}</h3>
                                            <span className='rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500'>{pendingTasksByStatus[ column.key ].length}</span>
                                        </div>
                                        <div className='space-y-3'>
                                            {pendingTasksByStatus[ column.key ].map(task => (
                                                <button
                                                    key={`${task.projectId}-${task._id}`}
                                                    onClick={() => navigate(`/project/${task.projectId}`)}
                                                    className='block w-full rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md'>
                                                    <div className='mb-2 flex items-start justify-between gap-2'>
                                                        <h4 className='text-sm font-semibold leading-5'>{task.title}</h4>
                                                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${priorityClasses[ task.priority ] || priorityClasses.medium}`}>{task.priority || 'medium'}</span>
                                                    </div>
                                                    <div className='text-xs font-medium text-slate-500'>{task.projectName}</div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <p className='rounded-md border border-dashed border-slate-300 p-4 text-sm text-slate-500'>No pending assigned tasks.</p>
                    )}
                </section>

                <div className='min-w-0'>
                    <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-lg font-semibold'>Active projects</h2>
                        <span className='text-sm text-slate-500'>{projects.length} total</span>
                    </div>
                    {projectError && (
                        <p className='mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'>{projectError}</p>
                    )}
                    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                        {projects.map((project) => (
                            <button key={project._id}
                                onClick={() => {
                                    navigate(`/project/${project._id}`, {
                                        state: { project }
                                    })
                                }}
                                className="rounded-lg border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                                <div className='mb-8 flex items-start justify-between gap-3'>
                                    <div>
                                        <h3 className='text-lg font-semibold capitalize'>{project.name}</h3>
                                        <p className='mt-1 text-sm text-slate-500'>{project.inviteCode || 'Invite code pending'}</p>
                                    </div>
                                    <i className="ri-arrow-right-up-line text-xl text-slate-400"></i>
                                </div>

                                <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
                                    <span className='inline-flex items-center gap-1'>
                                        <i className="ri-user-line"></i>
                                        {project.users.length} members
                                    </span>
                                    <span className='inline-flex items-center gap-1'>
                                        <i className="ri-task-line"></i>
                                        {project.tickets?.length || 0} tickets
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <aside>
                    <form onSubmit={joinProject} className='rounded-lg border border-slate-200 bg-white p-4 shadow-sm'>
                        <h2 className='mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500'>Join project</h2>
                        <div className='flex gap-2'>
                            <input
                                value={inviteCode}
                                onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
                                className='min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono text-sm tracking-widest outline-none focus:border-slate-900'
                                placeholder='INVITE'
                            />
                            <button className='rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white'>Join</button>
                        </div>
                        {joinError && <p className='mt-3 text-sm text-red-600'>{joinError}</p>}
                    </form>
                </aside>
            </section>

            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
                        <div className='mb-4 flex items-center justify-between'>
                            <h2 className="text-lg font-semibold">Create project</h2>
                            <button type="button" className="h-9 w-9 rounded-md hover:bg-slate-100" onClick={() => setIsModalOpen(false)}>
                                <i className="ri-close-line"></i>
                            </button>
                        </div>
                        <form onSubmit={createProject} className='space-y-4'>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Project name</label>
                                <input
                                    onChange={(e) => setProjectName(e.target.value)}
                                    value={projectName}
                                    type="text"
                                    className="block w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-slate-950"
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                <button type="button" className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700" onClick={() => setIsModalOpen(false)}>Cancel</button>
                                <button type="submit" disabled={isCreating} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">
                                    {isCreating ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                            {createError && <p className='text-sm text-red-600'>{createError}</p>}
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home
