import React from 'react'
import { Link } from 'react-router-dom'
import WorkspaceBackdrop from './WorkspaceBackdrop'

const featurePills = [
    { icon: 'ri-clipboard-line', label: 'Track tasks' },
    { icon: 'ri-message-3-line', label: 'Team chat' },
    { icon: 'ri-team-line', label: 'Collaborate' },
]

const AuthForm = ({
    title,
    submitLabel,
    footerText,
    footerLinkText,
    footerLinkTo,
    email,
    password,
    error,
    isSubmitting,
    onEmailChange,
    onPasswordChange,
    onSubmit,
}) => {
    const heading = submitLabel === 'Login' ? 'Welcome back.' : title || 'Create account.'

    return (
        <main className='workspace-page flex min-h-screen items-center justify-center px-4 py-7 text-[#2c2c2a] sm:px-6 lg:py-10'>
            <WorkspaceBackdrop />

            <section className='relative z-10 grid w-full max-w-[1080px] overflow-hidden rounded-[24px] border-[0.5px] border-[#d3d1c7] bg-white/90 shadow-[0_24px_80px_rgba(44,44,42,0.14)] backdrop-blur lg:min-h-[660px] lg:grid-cols-[430px_minmax(0,1fr)]'>
                <div className='flex min-h-[620px] flex-col justify-center px-7 py-9 sm:px-10 lg:px-12'>
                    <div className='mb-8'>
                        <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Workspace</p>
                        <h1 className='font-display mt-3 text-[42px] leading-[1.05] text-[#2c2c2a]'>{heading}</h1>
                    </div>

                    <div className='mb-8 grid grid-cols-3 gap-2'>
                        {featurePills.map(item => (
                            <div key={item.label} className='rounded-[12px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] px-2 py-3 text-center transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm'>
                                <i className={`${item.icon} text-xl text-[#2c2c2a]`}></i>
                                <div className='mt-1 text-[11px] font-medium leading-4 text-[#5f5e5a]'>{item.label}</div>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={onSubmit} className='space-y-5'>
                        <div>
                            <label className='mb-1.5 block text-[12px] font-medium uppercase tracking-[0.04em] text-[#5f5e5a]' htmlFor='email'>Email</label>
                            <input
                                id='email'
                                value={email}
                                onChange={(event) => onEmailChange(event.target.value)}
                                type='email'
                                autoComplete='email'
                                className='block w-full rounded-[12px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-[14px] text-[15px] text-[#2c2c2a] outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                placeholder='name@example.com'
                                required
                            />
                        </div>

                        <div>
                            <label className='mb-1.5 block text-[12px] font-medium uppercase tracking-[0.04em] text-[#5f5e5a]' htmlFor='password'>Password</label>
                            <input
                                id='password'
                                value={password}
                                onChange={(event) => onPasswordChange(event.target.value)}
                                type='password'
                                autoComplete={submitLabel === 'Login' ? 'current-password' : 'new-password'}
                                className='block w-full rounded-[12px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-4 py-[14px] text-[15px] text-[#2c2c2a] outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
                                placeholder='Enter your password'
                                required
                            />
                        </div>

                        {error && (
                            <p className='rounded-[10px] bg-[#fcebeb] px-3 py-2 text-sm text-[#a32d2d]'>{error}</p>
                        )}

                        <button
                            type='submit'
                            disabled={isSubmitting}
                            className='w-full rounded-[12px] bg-[#2c2c2a] px-4 py-[15px] text-sm font-medium tracking-[0.02em] text-[#f0efe9] transition hover:-translate-y-0.5 hover:bg-[#444441] hover:shadow-lg disabled:cursor-not-allowed disabled:bg-[#b4b2a9]'
                        >
                            {isSubmitting ? 'Please wait...' : submitLabel}
                        </button>
                    </form>

                    <p className='mt-6 text-center text-[13px] text-[#888780]'>
                        {footerText}{' '}
                        <Link to={footerLinkTo} className='border-b border-[#d3d1c7] font-medium text-[#2c2c2a]'>
                            {footerLinkText}
                        </Link>
                    </p>
                </div>

                <div className='hidden bg-[#f8f8f5] p-6 lg:block'>
                    <div className='auth-preview-card relative h-full rounded-[20px] border-[0.5px] border-[#d3d1c7] bg-white p-6'>
                        <div className='relative z-10 flex h-full flex-col'>
                            <div className='mb-5 flex items-center justify-between'>
                                <div>
                                    <p className='text-[10px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Today</p>
                                    <h2 className='font-display text-3xl leading-tight text-[#2c2c2a]'>Sprint room</h2>
                                </div>
                                <div className='rounded-full bg-[#eaf3de] px-3 py-1 text-[11px] font-semibold text-[#3b6d11]'>Live</div>
                            </div>

                            <div className='grid flex-1 grid-cols-[1fr_0.8fr] gap-4'>
                                <div className='space-y-3'>
                                    {[
                                        { title: 'API handoff', meta: 'Review', color: 'bg-[#faeeda] text-[#854f0b]' },
                                        { title: 'Invite flow', meta: 'Done', color: 'bg-[#eaf3de] text-[#3b6d11]' },
                                        { title: 'Dashboard UI', meta: 'Build', color: 'bg-[#fcebeb] text-[#a32d2d]' },
                                    ].map(item => (
                                        <article key={item.title} className='auth-ticket-card rounded-[14px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] p-4 shadow-sm'>
                                            <div className='mb-4 flex items-center justify-between gap-3'>
                                                <h3 className='text-sm font-medium text-[#2c2c2a]'>{item.title}</h3>
                                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.color}`}>{item.meta}</span>
                                            </div>
                                            <div className='space-y-2'>
                                                <span className='block h-2 w-full rounded-full bg-[#e8e7e0]'></span>
                                                <span className='block h-2 w-2/3 rounded-full bg-[#d3d1c7]'></span>
                                            </div>
                                        </article>
                                    ))}
                                </div>

                                <div className='flex flex-col gap-4'>
                                    <div className='rounded-[16px] border-[0.5px] border-[#e8e7e0] bg-[#2c2c2a] p-4 text-[#f0efe9]'>
                                        <p className='text-[11px] font-medium text-[#f0efe9]/70'>Assigned</p>
                                        <div className='font-display mt-2 text-5xl leading-none'>12</div>
                                    </div>
                                    <div className='flex-1 rounded-[16px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] p-4'>
                                        <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Chat</p>
                                        <div className='mt-4 space-y-3'>
                                            <div className='ml-auto h-8 w-28 rounded-[12px] rounded-br-[4px] bg-[#2c2c2a]'></div>
                                            <div className='h-8 w-36 rounded-[12px] rounded-bl-[4px] border-[0.5px] border-[#e8e7e0] bg-white'></div>
                                            <div className='ml-auto h-8 w-24 rounded-[12px] rounded-br-[4px] bg-[#476a7e]'></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </main>
    )
}

export default AuthForm
