import React, { useState, useEffect } from 'react'
import axios from "../config/axios"
import { useNavigate } from 'react-router-dom'

const Home = () => {
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ projectName, setProjectName ] = useState('')
    const [ inviteCode, setInviteCode ] = useState('')
    const [ joinError, setJoinError ] = useState('')
    const [ projects, setProjects ] = useState([])

    const navigate = useNavigate()

    const loadProjects = () => {
        axios.get('/projects/all').then((res) => {
            setProjects(res.data.projects || [])
        }).catch(err => {
            console.log(err)
        })
    }

    function createProject(e) {
        e.preventDefault()

        axios.post('/projects/create', {
            name: projectName,
        })
            .then((res) => {
                setProjects(prevProjects => [ res.data, ...prevProjects ])
                setProjectName('')
                setIsModalOpen(false)
                navigate(`/project/${res.data._id}`, {
                    state: { project: res.data }
                })
            })
            .catch((error) => {
                console.log(error)
            })
    }

    const joinProject = (event) => {
        event.preventDefault()
        setJoinError('')

        axios.post('/projects/join', {
            inviteCode
        }).then(res => {
            setInviteCode('')
            navigate(`/project/${res.data.project._id}`, {
                state: { project: res.data.project }
            })
        }).catch(err => {
            setJoinError(err.response?.data?.error || 'Could not join project')
        })
    }

    useEffect(() => {
        loadProjects()
    }, [])

    return (
        <main className='min-h-screen bg-slate-100 text-slate-950'>
            <header className='border-b border-slate-200 bg-white px-4 py-5 sm:px-6'>
                <div className='mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
                    <div>
                        <p className='text-sm font-semibold uppercase tracking-wide text-slate-500'>Workspace</p>
                        <h1 className='mt-1 text-3xl font-semibold tracking-tight'>Projects</h1>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className='inline-flex w-fit items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800'>
                        <i className="ri-add-line"></i>
                        New project
                    </button>
                </div>
            </header>

            <section className='mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px]'>
                <div className='min-w-0'>
                    <div className='mb-4 flex items-center justify-between'>
                        <h2 className='text-lg font-semibold'>Active projects</h2>
                        <span className='text-sm text-slate-500'>{projects.length} total</span>
                    </div>
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
                                <button type="submit" className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Home
