import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import axios from '../config/axios'
import { useUser } from '../context/userContext'
import { getErrorMessage } from '../utils/getErrorMessage'
import { requestGoogleCredential } from '../utils/googleAuth'

const Login = () => {
    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
    const [ error, setError ] = useState('')
    const [ isSubmitting, setIsSubmitting ] = useState(false)
    const [ isGoogleSubmitting, setIsGoogleSubmitting ] = useState(false)
    const { startSession } = useUser()
    const navigate = useNavigate()

    const submitHandler = async (event) => {
        event.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            const res = await axios.post('/users/login', {
                email,
                password,
            })

            startSession(res.data)
            navigate('/', { replace: true })
        } catch (err) {
            setError(getErrorMessage(err, 'Could not log in'))
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleGoogleLogin = async () => {
        setError('')
        setIsGoogleSubmitting(true)

        try {
            const credential = await requestGoogleCredential(import.meta.env.VITE_GOOGLE_CLIENT_ID)
            const res = await axios.post('/users/google', { credential })

            startSession(res.data)
            navigate('/', { replace: true })
        } catch (err) {
            setError(getErrorMessage(err, 'Could not continue with Google'))
        } finally {
            setIsGoogleSubmitting(false)
        }
    }

    return (
        <AuthForm
            title='Login'
            submitLabel='Login'
            footerText="Don't have an account?"
            footerLinkText='Create one'
            footerLinkTo='/register'
            email={email}
            password={password}
            error={error}
            isSubmitting={isSubmitting}
            isGoogleSubmitting={isGoogleSubmitting}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onGoogleLogin={handleGoogleLogin}
            onSubmit={submitHandler}
        />
    )
}

export default Login
