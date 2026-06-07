import React from 'react'
import { Navigate } from 'react-router-dom'
import { useUser } from '../context/userContext'
import WorkspaceBackdrop from '../components/WorkspaceBackdrop'

const UserAuth = ({ children }) => {
  const { user, loading } = useUser()

  if (loading) {
    return (
      <main className='workspace-page flex min-h-screen items-center justify-center text-sm font-medium text-[#888780]'>
        <WorkspaceBackdrop />
        <span className='relative z-10 rounded-full border-[0.5px] border-[#d3d1c7] bg-white/80 px-4 py-2 shadow-sm backdrop-blur'>Loading...</span>
      </main>
    )
  }

  if (!user) {
    return <Navigate to='/login' replace />
  }

  return children
}

export default UserAuth
