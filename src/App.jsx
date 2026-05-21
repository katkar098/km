import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
// import AddMember from "./pages/AddMember";
import Members from "./pages/Members";
// import RenewMembership from "./pages/RenewMembership";
// import Attendance from "./pages/Attendance";
// import Payments from "./pages/Payment";
import Reports from "./pages/Report";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import { startReminderScheduler } from "../src/utils/ExpiryReminderScheduler";

function App() {
  useEffect(() => {
    // Start the SMS reminder scheduler when app loads
    startReminderScheduler();
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" />} />
        
        {/* Protected Routes with Navbar */}
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={
            <>
              <Navbar />
              <Dashboard />
            </>
          } />
          {/* <Route path="/add-member" element={
            <>
              <Navbar />
              <AddMember />
            </>
          } /> */}
          <Route path="/members" element={
            <>
              <Navbar />
              <Members />
            </>
          } />
          {/* <Route path="/renew-membership" element={
            <>
              <Navbar />
              <RenewMembership />
            </>
          } /> */}
          {/* <Route path="/attendance" element={
            <>
              <Navbar />
              <Attendance />
            </>
          } /> */}
          {/* <Route path="/payments" element={
            <>
              <Navbar />
              <Payments />
            </>
          } /> */}
          <Route path="/reports" element={
            <>
              <Navbar />
              <Reports />
            </>
          } />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;