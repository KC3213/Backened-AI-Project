import React from 'react'
import { Navigate } from 'react-router-dom'
import { useUser } from '../context/userContext'

const UserAuth = ({ children }) => {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <main className='flex min-h-screen items-center justify-center bg-[#f0efe9] text-sm font-medium text-[#888780]'>
        Loading...
      </main>
    )
  }

  if (!user) {
    return <Navigate to='/login' replace />
  }

  return children
}

export default UserAuth
