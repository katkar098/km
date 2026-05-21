import React, { useState, useEffect } from "react";
import "./Attendance.css";
import { getLiveAttendance } from "../services/attendanceService";

export default function Attendance() {

  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    partial: 0,
    expired: 0
  });

  // ======================================================
  // FETCH LIVE DATA
  // ======================================================
  const fetchData = async () => {
    setLoading(true);

    const res = await getLiveAttendance(selectedDate);

    const data = res?.data || [];

    setAttendanceLogs(data);

    setStats({
      total: data.length,
      active: data.filter(x => x.status === "active").length,
      partial: data.filter(x => x.status === "partial").length,
      expired: data.filter(x => x.status === "expired").length,
    });

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  return (
    <div style={{ padding: "20px" }}>

      <h2>🔥 Live Attendance</h2>

      {/* DATE FILTER */}
      <input
        type="date"
        value={selectedDate}
        onChange={(e) => setSelectedDate(e.target.value)}
      />

      <button onClick={fetchData}>Refresh</button>

      {/* STATS */}
      <div style={{ marginTop: 20 }}>
        <p>Total: {stats.total}</p>
        <p>Active: {stats.active}</p>
        <p>Partial: {stats.partial}</p>
        <p>Expired: {stats.expired}</p>
      </div>

      {/* LOADING */}
      {loading && <p>Loading...</p>}

      {/* TABLE */}
      <table border="1" width="100%" style={{ marginTop: 20 }}>
        <thead>
          <tr>
            <th>Name</th>
            <th>User ID</th>
            <th>Phone</th>
            <th>Time</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
          {attendanceLogs.map((item, i) => (
            <tr key={i}>
              <td>{item.full_name}</td>
              <td>{item.user_id}</td>
              <td>{item.phone}</td>
              <td>
                {item.punch_time
                  ? new Date(item.punch_time).toLocaleString()
                  : "-"}
              </td>
              <td>{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

    </div>
  );
}