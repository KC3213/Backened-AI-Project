import React, { useCallback, useEffect, useMemo, useState } from 'react'
import axios from '../config/axios'
import { UserContext } from './userContext'

const tokenKey = 'token'

export const UserProvider = ({ children }) => {
  const [ user, setUser ] = useState(null)
  const [ loading, setLoading ] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem(tokenKey)
    setUser(null)
  }, [])

  const startSession = useCallback(({ user: sessionUser, token }) => {
    localStorage.setItem(tokenKey, token)
    setUser(sessionUser)
  }, [])

  const updateSessionUser = useCallback((sessionUser) => {
    setUser(sessionUser)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(tokenKey)) {
        await axios.get('/users/logout')
      }
    } finally {
      clearSession()
    }
  }, [ clearSession ])

  useEffect(() => {
    const token = localStorage.getItem(tokenKey)

    if (!token) {
      setLoading(false)
      return
    }

    axios.get('/users/me')
      .then((res) => {
        setUser(res.data.user)
      })
      .catch(() => {
        clearSession()
      })
      .finally(() => {
        setLoading(false)
      })
  }, [ clearSession ])

  const value = useMemo(() => ({
    user,
    loading,
    startSession,
    updateSessionUser,
    logout,
  }), [ loading, logout, startSession, updateSessionUser, user ])

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  )
}
