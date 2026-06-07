import React from 'react'
import { Link } from 'react-router-dom'

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
    const heading = submitLabel === 'Login' ? 'Welcome back.' : title

    return (
        <main className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f0efe9] px-4 py-8 text-[#2c2c2a]'>
            <div className='pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[#2c2c2a]/[0.12]'></div>
            <div className='pointer-events-none absolute -bottom-16 -left-20 h-48 w-48 rounded-full bg-[#2c2c2a]/[0.12]'></div>

            <section className='relative w-full max-w-[380px] rounded-[20px] border-[0.5px] border-[#d3d1c7] bg-white px-8 py-9 shadow-sm sm:px-11 sm:py-10'>
                <div className='mb-7'>
                    <p className='text-[11px] font-semibold uppercase tracking-[0.12em] text-[#888780]'>Workspace</p>
                    <h1 className='font-display mt-2 text-[32px] leading-tight text-[#2c2c2a]'>{heading}</h1>
                </div>

                <div className='mb-7 grid grid-cols-3 gap-2'>
                    {featurePills.map(item => (
                        <div key={item.label} className='rounded-[10px] border-[0.5px] border-[#e8e7e0] bg-[#f8f8f5] px-2 py-3 text-center'>
                            <i className={`${item.icon} text-lg text-[#2c2c2a]`}></i>
                            <div className='mt-1 text-[11px] font-medium leading-4 text-[#5f5e5a]'>{item.label}</div>
                        </div>
                    ))}
                </div>

                <form onSubmit={onSubmit} className='space-y-4'>
                    <div>
                        <label className='mb-1.5 block text-[12px] font-medium uppercase tracking-[0.04em] text-[#5f5e5a]' htmlFor='email'>Email</label>
                        <input
                            id='email'
                            value={email}
                            onChange={(event) => onEmailChange(event.target.value)}
                            type='email'
                            autoComplete='email'
                            className='block w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3.5 py-[11px] text-sm text-[#2c2c2a] outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
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
                            className='block w-full rounded-[10px] border-[0.5px] border-[#d3d1c7] bg-[#f8f8f5] px-3.5 py-[11px] text-sm text-[#2c2c2a] outline-none placeholder:text-[#b4b2a9] focus:border-[#888780] focus:bg-white'
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
                        className='w-full rounded-[10px] bg-[#2c2c2a] px-4 py-[13px] text-sm font-medium tracking-[0.02em] text-[#f0efe9] hover:bg-[#444441] disabled:cursor-not-allowed disabled:bg-[#b4b2a9]'
                    >
                        {isSubmitting ? 'Please wait...' : submitLabel}
                    </button>
                </form>

                <p className='mt-5 text-center text-[13px] text-[#888780]'>
                    {footerText}{' '}
                    <Link to={footerLinkTo} className='border-b border-[#d3d1c7] font-medium text-[#2c2c2a]'>
                        {footerLinkText}
                    </Link>
                </p>
            </section>
        </main>
    )
}

export default AuthForm
