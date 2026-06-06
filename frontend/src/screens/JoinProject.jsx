import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from '../config/axios'

const JoinProject = () => {
    const { inviteCode } = useParams()
    const navigate = useNavigate()
    const [ error, setError ] = useState('')

    useEffect(() => {
        axios.post('/projects/join', {
            inviteCode
        }).then(res => {
            navigate(`/project/${res.data.project._id}`, {
                state: { project: res.data.project },
                replace: true,
            })
        }).catch(err => {
            setError(err.response?.data?.error || 'Could not join project')
        })
    }, [ inviteCode, navigate ])

    return (
        <main className='flex min-h-screen items-center justify-center bg-slate-100 p-4'>
            <section className='w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm'>
                <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white'>
                    <i className="ri-link"></i>
                </div>
                <h1 className='text-xl font-semibold'>Joining project</h1>
                <p className='mt-2 font-mono text-sm tracking-widest text-slate-500'>{inviteCode}</p>
                {error && (
                    <div className='mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700'>{error}</div>
                )}
            </section>
        </main>
    )
}

export default JoinProject
