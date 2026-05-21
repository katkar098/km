import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

// ======================================================
// LIVE ATTENDANCE API
// ======================================================
export const getLiveAttendance = async (date) => {
  try {
    const res = await axios.get(`${API_BASE_URL}/attendance/live`, {
      params: { date }
    });

    return res.data;

  } catch (err) {
    console.error("API ERROR:", err);
    return { success: true, data: [] };
  }
};