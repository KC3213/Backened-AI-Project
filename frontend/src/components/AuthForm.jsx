import React from 'react'
import { Link } from 'react-router-dom'

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
    return (
        <main className='flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 text-slate-950'>
            <section className='w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8'>
                <div className='mb-6'>
                    <p className='text-sm font-semibold uppercase tracking-wide text-slate-500'>Workspace</p>
                    <h1 className='mt-2 text-3xl font-semibold tracking-tight'>{title}</h1>
                </div>

                <form onSubmit={onSubmit} className='space-y-4'>
                    <div>
                        <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='email'>Email</label>
                        <input
                            id='email'
                            value={email}
                            onChange={(event) => onEmailChange(event.target.value)}
                            type='email'
                            autoComplete='email'
                            className='block w-full rounded-md border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-950'
                            placeholder='name@example.com'
                            required
                        />
                    </div>

                    <div>
                        <label className='mb-1 block text-sm font-medium text-slate-700' htmlFor='password'>Password</label>
                        <input
                            id='password'
                            value={password}
                            onChange={(event) => onPasswordChange(event.target.value)}
                            type='password'
                            autoComplete={submitLabel === 'Login' ? 'current-password' : 'new-password'}
                            className='block w-full rounded-md border border-slate-300 px-3 py-3 text-sm outline-none focus:border-slate-950'
                            placeholder='Enter your password'
                            required
                        />
                    </div>

                    {error && (
                        <p className='rounded-md bg-red-50 px-3 py-2 text-sm text-red-700'>{error}</p>
                    )}

                    <button
                        type='submit'
                        disabled={isSubmitting}
                        className='w-full rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300'
                    >
                        {isSubmitting ? 'Please wait...' : submitLabel}
                    </button>
                </form>

                <p className='mt-5 text-sm text-slate-500'>
                    {footerText}{' '}
                    <Link to={footerLinkTo} className='font-semibold text-slate-950 hover:underline'>
                        {footerLinkText}
                    </Link>
                </p>
            </section>
        </main>
    )
}

export default AuthForm
