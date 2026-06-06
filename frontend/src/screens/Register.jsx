import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AuthForm from '../components/AuthForm'
import axios from '../config/axios'
import { useUser } from '../context/userContext'
import { getErrorMessage } from '../utils/getErrorMessage'

const Register = () => {
    const [ email, setEmail ] = useState('')
    const [ password, setPassword ] = useState('')
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
                email,
                password,
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
            email={email}
            password={password}
            error={error}
            isSubmitting={isSubmitting}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={submitHandler}
        />
    )
}

export default Register
