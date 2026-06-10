import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import axios from '../config/axios'
import { useUser } from '../context/userContext'
import { getErrorMessage } from '../utils/getErrorMessage'
import { fallbackAvatarStyle } from '../utils/avatar'
import { requestGoogleCredential } from '../utils/googleAuth'

const Register = () => {
    const [ registrationStep, setRegistrationStep ] = useState('account')
    const [ name, setName ] = useState('')
    const navigate = useNavigate()
    const location = useLocation()
    const redirectedEmail = typeof location.state?.email === 'string' ? location.state.email : ''
    const [ email, setEmail ] = useState(redirectedEmail)
    const [ password, setPassword ] = useState('')
    const [ avatarStyle, setAvatarStyle ] = useState(fallbackAvatarStyle)
    const [ error, setError ] = useState('')
    const [ isSubmitting, setIsSubmitting ] = useState(false)
    const [ isGoogleSubmitting, setIsGoogleSubmitting ] = useState(false)
    const { startSession } = useUser()

    const submitHandler = async (event) => {
        event.preventDefault()
        setError('')

        if (registrationStep === 'account') {
            setRegistrationStep('profile')
            return
        }

        setIsSubmitting(true)

        try {
            const res = await axios.post('/users/register', {
                name,
                email,
                password,
                avatarStyle,
                avatarSeed: name || email,
            })

            startSession(res.data)
            navigate('/', { replace: true })
        } catch (err) {
            setError(getErrorMessage(err, 'Could not create account'))
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
            title='Register'
            submitLabel='Register'
            footerText='Already have an account?'
            footerLinkText='Login'
            footerLinkTo='/login'
            name={name}
            email={email}
            password={password}
            avatarStyle={avatarStyle}
            error={error}
            isSubmitting={isSubmitting}
            isGoogleSubmitting={isGoogleSubmitting}
            registrationStep={registrationStep}
            onNameChange={setName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onAvatarStyleChange={setAvatarStyle}
            onRegistrationBack={() => setRegistrationStep('account')}
            onGoogleLogin={handleGoogleLogin}
            onSubmit={submitHandler}
        />
    )
}

export default Register
