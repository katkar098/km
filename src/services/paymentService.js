// services/paymentService.js

// For Create React App, use REACT_APP_ prefix
// For Vite, use import.meta.env.VITE_

// Check which environment we're in
const isVite = typeof import.meta !== 'undefined' && import.meta.env;
const isCRA = typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL;

// Get API URL based on environment
const getApiUrl = () => {
  if (isVite) {
    return import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  }
  if (isCRA) {
    return process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  }
  // Default for local development
  return "http://localhost:5000/api";
};

const API_URL = getApiUrl();

export const getPayments = async () => {
  try {
    // Try to fetch from API first
    const response = await fetch(`${API_URL}/payments`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("API fetch failed");
  } catch (error) {
    console.error("API error, falling back to localStorage:", error);
    // Fallback to localStorage
    const payments = JSON.parse(localStorage.getItem("payments") || "[]");
    return payments;
  }
};

export const getMembers = async () => {
  try {
    const response = await fetch(`${API_URL}/members`);
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("API fetch failed");
  } catch (error) {
    console.error("API error, falling back to localStorage:", error);
    const members = JSON.parse(localStorage.getItem("members") || "[]");
    return members;
  }
};

export const addPayment = async (paymentData) => {
  try {
    const response = await fetch(`${API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paymentData),
    });
    
    if (response.ok) {
      const data = await response.json();
      return data;
    }
    throw new Error("API post failed");
  } catch (error) {
    console.error("API error, saving to localStorage:", error);
    const existingPayments = JSON.parse(localStorage.getItem("payments") || "[]");
    const newPayment = { ...paymentData, id: `pay_${Date.now()}` };
    localStorage.setItem("payments", JSON.stringify([...existingPayments, newPayment]));
    return newPayment;
  }
};