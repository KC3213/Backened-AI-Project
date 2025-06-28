import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

// Create the UserContext
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // NEW

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    const API = import.meta.env.VITE_API_URL;
    axios.get(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then((res) => {
      setUser(res.data.user);
    })
    .catch(() => {
      localStorage.removeItem('token');
    })
    .finally(() => {
      setLoading(false); // Done loading either way
    });
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};


// Custom hook to use the context
export const useUser = () => useContext(UserContext);
