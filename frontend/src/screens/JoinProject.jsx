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
        <main className='flex min-h-screen items-center justify-center bg-[#f0efe9] p-4 text-[#2c2c2a]'>
            <section className='w-full max-w-md rounded-[20px] border-[0.5px] border-[#d3d1c7] bg-white p-8 text-center shadow-sm'>
                <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#2c2c2a] text-[#f0efe9]'>
                    <i className="ri-link"></i>
                </div>
                <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Workspace invite</p>
                <h1 className='font-display mt-1 text-[32px] leading-tight'>Joining project</h1>
                <p className='mt-3 font-mono text-sm tracking-widest text-[#888780]'>{inviteCode}</p>
                {error && (
                    <div className='mt-4 rounded-[10px] bg-[#fcebeb] p-3 text-sm text-[#a32d2d]'>{error}</div>
                )}
            </section>
        </main>
    )
}

export default JoinProject
