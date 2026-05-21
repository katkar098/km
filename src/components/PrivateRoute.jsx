// components/PrivateRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = () => {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
  
  return isAuthenticated ? <Outlet /> : <Navigate to="/login" />;
};

export default PrivateRoute;