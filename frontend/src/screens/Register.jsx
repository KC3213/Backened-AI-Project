import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import axios from '../config/axios'
import { useUser } from '../context/userContext'
import { getErrorMessage } from '../utils/getErrorMessage'
import { fallbackAvatarStyle } from '../utils/avatar'

const Register = () => {
    const [ name, setName ] = useState('')
    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
    const [ avatarStyle, setAvatarStyle ] = useState(fallbackAvatarStyle)
    const [ error, setError ] = useState('')
    const [ isSubmitting, setIsSubmitting ] = useState(false)
    const { startSession } = useUser()
    const navigate = useNavigate()

    const submitHandler = async (event) => {
        event.preventDefault()
        setError('')
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
            onNameChange={setName}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onAvatarStyleChange={setAvatarStyle}
            onSubmit={submitHandler}
        />
    )
}

export default Register
