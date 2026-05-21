import React, { useState } from "react";
import "./RenewMembership.css";
import { sendRenewalConfirmationSMS } from "../services/smsService";

export default function RenewMembership() {
  const [form, setForm] = useState({
    user_id: "",
    member_name: "",
    current_membership: "",
    current_expiry: "",
    new_start_date: new Date().toISOString().split('T')[0],
    new_expiry_date: "",
    paid_amount: "",
    payment_method: "Cash",
    discount: 0,
    notes: ""
  });

  const [member, setMember] = useState(null);
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState({
    "Basic": { duration: 30, price: 1500, description: "1 Month Membership" },
    "Standard": { duration: 90, price: 4000, description: "3 Months Membership" },
    "Premium": { duration: 180, price: 7500, description: "6 Months Membership" },
    "Annual": { duration: 365, price: 14000, description: "12 Months Membership" }
  });
  const [selectedPlan, setSelectedPlan] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [renewalDetails, setRenewalDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  // API Base URL
  const API_BASE_URL = "http://localhost:5000/api";

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Search member from localStorage (fallback) and database
  const searchMember = async (userId) => {
    if (!userId) return;
    
    setIsSearching(true);
    setSearchError("");
    
    try {
      // First try to search from database API
      const response = await fetch(`${API_BASE_URL}/members`);
      const result = await response.json();
      
      let foundMember = null;
      
      if (result.success && result.data) {
        foundMember = result.data.find(m => 
          m.user_id === userId || m.id?.toString() === userId
        );
      }
      
      // If not found in API, try localStorage as fallback
      if (!foundMember) {
        const existingMembers = JSON.parse(localStorage.getItem("members") || "[]");
        foundMember = existingMembers.find(m => 
          m.user_id === userId || m.id?.toString() === userId
        );
      }
      
      if (foundMember) {
        setMember({
          name: foundMember.full_name,
          membership: foundMember.membership_type,
          expiry: foundMember.expiry_date,
          phone: foundMember.phone,
          email: foundMember.email,
          id: foundMember.user_id,
          member_id: foundMember.member_id || foundMember.id
        });
        setForm(prev => ({
          ...prev,
          member_name: foundMember.full_name,
          current_membership: foundMember.membership_type,
          current_expiry: foundMember.expiry_date
        }));
        setSearchError("");
      } else {
        setMember(null);
        setSearchError("Member not found. Please check the User ID.");
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchError("Error searching member. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    const planDetails = membershipPlans[plan];
    
    const startDate = new Date(form.new_start_date);
    const expiryDate = new Date(startDate);
    expiryDate.setDate(expiryDate.getDate() + planDetails.duration);
    
    let totalAmount = planDetails.price;
    
    // Apply loyalty discount for renewing members (if expired)
    if (member && new Date(form.current_expiry) < new Date()) {
      const discountAmount = totalAmount * 0.1;
      setForm(prev => ({ ...prev, discount: discountAmount }));
      totalAmount -= discountAmount;
    } else {
      setForm(prev => ({ ...prev, discount: 0 }));
    }
    
    setForm(prev => ({
      ...prev,
      new_expiry_date: expiryDate.toISOString().split('T')[0],
      paid_amount: totalAmount.toString()
    }));
  };

  const calculateTotal = () => {
    const amount = parseFloat(form.paid_amount) || 0;
    const discount = parseFloat(form.discount) || 0;
    return amount - discount;
  };

  // Call API to re-enable user on biometric device after renewal
  const reenableUserOnDevice = async (userId, userName, newExpiryDate) => {
    try {
      const response = await fetch(`${API_BASE_URL}/device/toggle-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          action: "enable",
          user_name: userName
        })
      });
      
      const result = await response.json();
      if (result.success) {
        console.log("✅ User re-enabled on biometric device");
        return true;
      } else {
        console.log("⚠️ Could not re-enable user on device");
        return false;
      }
    } catch (error) {
      console.error("Device re-enable error:", error);
      return false;
    }
  };

  // Sync device access after renewal
  const syncDeviceAccess = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/sync-device-access`);
      const result = await response.json();
      if (result.success) {
        console.log("✅ Device access synced successfully");
      }
    } catch (error) {
      console.error("Device sync error:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!member) {
      alert("Please search and verify member first");
      return;
    }
    
    if (!selectedPlan) {
      alert("Please select a membership plan");
      return;
    }
    
    setLoading(true);
    
    try {
      const renewalData = {
        id: `renew_${Date.now()}`,
        member_id: form.user_id,
        member_name: member.name,
        previous_membership: form.current_membership,
        new_membership_type: selectedPlan,
        amount: calculateTotal(),
        paid_amount: calculateTotal(),
        payment_method: form.payment_method,
        renewal_date: new Date().toISOString(),
        new_start_date: form.new_start_date,
        new_expiry_date: form.new_expiry_date,
        discount: form.discount,
        notes: form.notes
      };
      
      // Store payment record in localStorage
      const paymentRecord = {
        id: `renew_pay_${Date.now()}`,
        member_id: form.user_id,
        member_name: member.name,
        amount: calculateTotal(),
        payment_date: new Date().toISOString(),
        payment_method: form.payment_method,
        payment_status: "completed",
        membership_type: selectedPlan,
        type: "renewal"
      };
      
      const existingPayments = JSON.parse(localStorage.getItem("payments") || "[]");
      localStorage.setItem("payments", JSON.stringify([...existingPayments, paymentRecord]));
      
      // Update member's data in localStorage
      const existingMembers = JSON.parse(localStorage.getItem("members") || "[]");
      const updatedMembers = existingMembers.map(m => {
        if (m.user_id === form.user_id || m.id?.toString() === form.user_id) {
          return {
            ...m,
            membership_type: selectedPlan,
            expiry_date: form.new_expiry_date,
            renewals: [...(m.renewals || []), renewalData],
            payment_status: "completed",
            paid_amount: calculateTotal(),
            last_renewal_date: new Date().toISOString(),
            device_access: 1 // Re-enable device access
          };
        }
        return m;
      });
      localStorage.setItem("members", JSON.stringify(updatedMembers));
      
      // ============ CALL BACKEND API TO UPDATE DATABASE AND RE-ENABLE DEVICE ============
      try {
        // Update member in database
        const memberId = member.member_id || member.id;
        const updateResponse = await fetch(`${API_BASE_URL}/members/${memberId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            full_name: member.name,
            phone: member.phone,
            email: member.email || "",
            address: member.address || "",
            membership_type: selectedPlan,
            expiry_date: form.new_expiry_date,
            total_fee: calculateTotal(),
            paid_amount: calculateTotal(),
            payment_method: form.payment_method,
            payment_status: "Active",
            device_access: 1
          })
        });
        
        const updateResult = await updateResponse.json();
        console.log("Database update result:", updateResult);
        
        // Re-enable user on biometric device
        await reenableUserOnDevice(form.user_id, member.name, form.new_expiry_date);
        
        // Sync device access
        await syncDeviceAccess();
        
      } catch (apiError) {
        console.error("API update error:", apiError);
        // Continue even if API fails - localStorage already updated
      }
      // ================================================================================
      
      // Send SMS
      const renewedMember = updatedMembers.find(m => m.user_id === form.user_id);
      try {
        if (member.phone) {
          const smsResult = await sendRenewalConfirmationSMS(
            { ...renewedMember, phone: member.phone, full_name: member.name },
            renewalData
          );
          if (smsResult.success) {
            console.log("✅ Renewal confirmation SMS sent successfully");
          } else {
            console.log("❌ Failed to send renewal SMS:", smsResult.error);
          }
        }
      } catch (smsError) {
        console.error("SMS sending error:", smsError);
      }
      
      setRenewalDetails(renewalData);
      setShowReceipt(true);
      setLoading(false);
      
      alert("✅ Membership renewed successfully! User has been re-enabled on biometric device.");
      
    } catch (error) {
      console.error("Error processing renewal:", error);
      alert("Error processing renewal. Please try again.");
      setLoading(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleNewRenewal = () => {
    setShowReceipt(false);
    setForm({
      user_id: "",
      member_name: "",
      current_membership: "",
      current_expiry: "",
      new_start_date: new Date().toISOString().split('T')[0],
      new_expiry_date: "",
      paid_amount: "",
      payment_method: "Cash",
      discount: 0,
      notes: ""
    });
    setMember(null);
    setSelectedPlan("");
    setSearchError("");
  };

  const getDaysRemaining = (expiryDate) => {
    if (!expiryDate) return 0;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="renewal-container">
      {!showReceipt ? (
        <>
          <div className="renewal-header">
            <h1 className="page-title">Renew Membership</h1>
            <p className="page-subtitle">Extend membership for existing members</p>
          </div>

          <div className="renewal-content">
            <form onSubmit={handleSubmit} className="renewal-form">
              {/* Member Search Section */}
              <div className="form-section">
                <div className="section-header">
                  <div className="section-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                    </svg>
                  </div>
                  <h2 className="section-title">Member Verification</h2>
                </div>
                
                <div className="search-member">
                  <div className="search-input-wrapper">
                    <input
                      type="text"
                      name="user_id"
                      className="search-input"
                      placeholder="Enter Member User ID"
                      value={form.user_id}
                      onChange={handleChange}
                    />
                    <button
                      type="button"
                      className="search-btn"
                      onClick={() => searchMember(form.user_id)}
                      disabled={isSearching || !form.user_id}
                    >
                      {isSearching ? "Searching..." : "Search"}
                    </button>
                  </div>
                  {searchError && <div className="error-message">{searchError}</div>}
                </div>

                {member && (
                  <div className="member-details">
                    <h3>Member Information</h3>
                    <div className="details-grid">
                      <div className="detail-item">
                        <label>Member Name</label>
                        <p>{member.name}</p>
                      </div>
                      <div className="detail-item">
                        <label>Current Membership</label>
                        <p>{member.membership}</p>
                      </div>
                      <div className="detail-item">
                        <label>Current Expiry</label>
                        <p>{new Date(member.expiry).toLocaleDateString()}</p>
                      </div>
                      <div className="detail-item">
                        <label>Days Remaining</label>
                        <p className={getDaysRemaining(member.expiry) < 7 ? "urgent" : ""}>
                          {getDaysRemaining(member.expiry) > 0 ? `${getDaysRemaining(member.expiry)} days` : "Expired"}
                        </p>
                      </div>
                      <div className="detail-item">
                        <label>Phone</label>
                        <p>{member.phone}</p>
                      </div>
                      <div className="detail-item">
                        <label>Email</label>
                        <p>{member.email || "N/A"}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {member && (
                <>
                  {/* Membership Plans */}
                  <div className="form-section">
                    <div className="section-header">
                      <div className="section-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2v4M4 6h16M6 6v12a2 2 0 002 2h8a2 2 0 002-2V6M8 10h8M8 14h4"/>
                        </svg>
                      </div>
                      <h2 className="section-title">Select New Plan</h2>
                    </div>
                    
                    <div className="plans-grid">
                      {Object.entries(membershipPlans).map(([plan, details]) => (
                        <div
                          key={plan}
                          className={`plan-card ${selectedPlan === plan ? 'selected' : ''}`}
                          onClick={() => handlePlanSelect(plan)}
                        >
                          <h3 className="plan-name">{plan}</h3>
                          <p className="plan-duration">{details.description}</p>
                          <p className="plan-price">₹{details.price.toLocaleString()}</p>
                          {selectedPlan === plan && (
                            <div className="plan-check">
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20 6L9 17l-5-5"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Payment Details */}
                  <div className="form-section">
                    <div className="section-header">
                      <div className="section-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                        </svg>
                      </div>
                      <h2 className="section-title">Payment Information</h2>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Start Date</label>
                        <input
                          type="date"
                          name="new_start_date"
                          className="form-input"
                          value={form.new_start_date}
                          onChange={handleChange}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Expiry Date</label>
                        <input
                          type="date"
                          name="new_expiry_date"
                          className="form-input"
                          value={form.new_expiry_date}
                          readOnly
                          disabled
                        />
                      </div>
                    </div>

                    <div className="payment-summary">
                      <div className="summary-row">
                        <span>Plan Amount:</span>
                        <span>₹{parseFloat(form.paid_amount || 0).toLocaleString()}</span>
                      </div>
                      {form.discount > 0 && (
                        <div className="summary-row discount">
                          <span>Loyalty Discount (10%):</span>
                          <span>-₹{parseFloat(form.discount).toLocaleString()}</span>
                        </div>
                      )}
                      <div className="summary-row total">
                        <span>Total Amount:</span>
                        <span>₹{calculateTotal().toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Payment Method</label>
                        <select
                          name="payment_method"
                          className="form-input"
                          value={form.payment_method}
                          onChange={handleChange}
                        >
                          <option value="Cash">Cash</option>
                          <option value="UPI">UPI</option>
                          <option value="Credit Card">Credit Card</option>
                          <option value="Debit Card">Debit Card</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Additional Notes</label>
                        <textarea
                          name="notes"
                          className="form-input"
                          rows="3"
                          placeholder="Any special notes..."
                          value={form.notes}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="form-actions">
                    <button type="button" className="btn-cancel" onClick={() => window.history.back()}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-submit" disabled={loading}>
                      {loading ? (
                        <>
                          <span className="spinner"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                          </svg>
                          Process Renewal & Re-enable Device
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </>
      ) : (
        /* Receipt Section */
        <div className="receipt-container">
          <div className="receipt-card">
            <div className="receipt-header">
              <div className="receipt-logo">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2z"/>
                  <path d="M8 2v4M16 2v4M3 10h18"/>
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>
                </svg>
                <h2>GYM PRO</h2>
              </div>
              <h3>Membership Renewal Receipt</h3>
              <p>Thank you for renewing your membership!</p>
            </div>

            <div className="receipt-body">
              <div className="receipt-section">
                <h4>Member Details</h4>
                <div className="receipt-grid">
                  <div>
                    <label>Member Name</label>
                    <p>{renewalDetails?.member_name}</p>
                  </div>
                  <div>
                    <label>Member ID</label>
                    <p>{renewalDetails?.member_id}</p>
                  </div>
                  <div>
                    <label>Phone</label>
                    <p>{member?.phone}</p>
                  </div>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Renewal Details</h4>
                <div className="receipt-grid">
                  <div>
                    <label>Plan Selected</label>
                    <p>{selectedPlan}</p>
                  </div>
                  <div>
                    <label>Start Date</label>
                    <p>{new Date(renewalDetails?.new_start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label>Expiry Date</label>
                    <p>{new Date(renewalDetails?.new_expiry_date).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <div className="receipt-section">
                <h4>Payment Summary</h4>
                <div className="payment-breakdown">
                  <div className="breakdown-row">
                    <span>Plan Amount:</span>
                    <span>₹{parseFloat(renewalDetails?.paid_amount || 0).toLocaleString()}</span>
                  </div>
                  {renewalDetails?.discount > 0 && (
                    <div className="breakdown-row discount">
                      <span>Discount:</span>
                      <span>-₹{parseFloat(renewalDetails.discount).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="breakdown-row total">
                    <span>Total Paid:</span>
                    <span>₹{renewalDetails?.amount?.toLocaleString()}</span>
                  </div>
                  <div className="breakdown-row">
                    <span>Payment Method:</span>
                    <span>{renewalDetails?.payment_method}</span>
                  </div>
                </div>
              </div>

              {renewalDetails?.notes && (
                <div className="receipt-section">
                  <h4>Notes</h4>
                  <p>{renewalDetails.notes}</p>
                </div>
              )}
            </div>

            <div className="receipt-footer">
              <p>Renewal Date: {new Date().toLocaleString()}</p>
              <p>Transaction ID: {renewalDetails?.id}</p>
              <div className="receipt-actions">
                <button className="btn-print" onClick={handlePrintReceipt}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9V3h12v6M6 21h12v-6H6v6zM21 9H3v6h2V9h14v6h2V9z"/>
                  </svg>
                  Print Receipt
                </button>
                <button className="btn-new" onClick={handleNewRenewal}>
                  Renew Another Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}