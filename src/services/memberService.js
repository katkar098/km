// src/services/memberService.js
import axios from "axios";

// Use the correct backend URL - adjust if your backend runs on different port
const API_BASE_URL = "http://localhost:5000/api";

// Get all members from database
export const getMembers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/members`);
    console.log("API Response:", response.data);
    return response;
  } catch (error) {
    console.error("Error fetching members:", error);
    // Return empty array on error to prevent app crash
    return { data: { data: [] } };
  }
};

// Get single member by ID
export const getMemberById = async (id) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/members/${id}`);
    return response;
  } catch (error) {
    console.error("Error fetching member:", error);
    throw error;
  }
};

// Add new member to database
export const addMember = async (memberData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/members`, memberData);
    return response.data;
  } catch (error) {
    console.error("Error adding member:", error);
    throw error;
  }
};

// Update member in database
export const updateMember = async (id, memberData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/members/${id}`, memberData);
    return response.data;
  } catch (error) {
    console.error("Error updating member:", error);
    return { success: false, error: error.message };
  }
};

// Delete member from database
export const deleteMember = async (id) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/members/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting member:", error);
    return { success: false, error: error.message };
  }
};