import React from 'react'
import { Route, BrowserRouter, Routes } from 'react-router-dom'
import Login from '../screens/Login'
import Register from '../screens/Register'
import Home from '../screens/Home'
import Project from '../screens/Project'
import JoinProject from '../screens/JoinProject'
import UserAuth from '../auth/UserAuth'

const AppRoutes = () => {
    return (
        <BrowserRouter>

            <Routes>
                <Route path="/" element={<UserAuth><Home /></UserAuth>} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/project/:projectId" element={<UserAuth><Project /></UserAuth>} />
                <Route path="/project" element={<UserAuth><Project /></UserAuth>} />
                <Route path="/join/:inviteCode" element={<UserAuth><JoinProject /></UserAuth>} />
            </Routes>

        </BrowserRouter>
    )
}

export default AppRoutes
