import React from 'react';
import { Navigate } from 'react-router-dom';
import { useUser } from '../context/user.context';

const UserAuth = ({ children }) => {
  const { user, loading } = useUser(); // use shared context

  if (loading) {
    return <div>Loading...</div>; // wait for /users/me check
  }

  if (!user) {
    return <Navigate to="/login" />; // redirect if not logged in
  }

  return children; // ✅ show protected content
};

export default UserAuth;
