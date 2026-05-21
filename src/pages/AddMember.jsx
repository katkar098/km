import React, { useState, useEffect } from "react";
import "./AddMember.css";
import { sendWelcomeSMS, sendPartialPaymentSMS } from "../services/smsService";

export default function AddMember() {
  const [form, setForm] = useState({
    user_id: "",
    full_name: "",
    phone: "",
    email: "",
    address: "",
    membership_category: "gym",
    membership_type: "",
    total_fee: "",
    paid_amount: "",
    remaining_amount: "0",
    payment_method: "Cash",
    payment_status: "pending",
    expiry_date: "",
    join_date: new Date().toISOString().split("T")[0],
    notes: "",
    discount_applied: false,
    discount_reason: ""
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);

  const DISCOUNT_AMOUNT = 100;

  // Membership Plans
  const membershipPlans = {
    gym: {
      name: "GYM",
      plans: {
        Basic: { duration: "1 Month", price: 800 },
        Standard: { duration: "3 Months", price: 2100 },
        Premium: { duration: "6 Months", price: 3600 },
        Annual: { duration: "12 Months", price: 7099 }
      }
    },
    cardio: {
      name: "CARDIO",
      plans: {
        Basic: { duration: "1 Month", price: 1000 },
        Standard: { duration: "3 Months", price: 2700 },
        Premium: { duration: "6 Months", price: 4900 },
        Annual: { duration: "12 Months", price: 9099 }
      }
    }
  };

  // Load biometric user ID from localStorage
  useEffect(() => {
    const biometricId = localStorage.getItem("biometric_user_id");
    if (biometricId) {
      setForm(prev => ({ ...prev, user_id: biometricId }));
    }
  }, []);

  const calculateFinalTotal = (originalFee, hasDiscount) => {
    if (hasDiscount) {
      return Math.max(0, originalFee - DISCOUNT_AMOUNT);
    }
    return originalFee;
  };

  const calculateRemaining = (finalTotal, paidAmount) => {
    return Math.max(0, finalTotal - paidAmount);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }

    if (name === "membership_category") {
      setForm(prev => ({ 
        ...prev, 
        membership_type: "",
        total_fee: "",
        expiry_date: "",
        discount_applied: false,
        discount_reason: ""
      }));
      setShowDiscount(false);
    }

    if (name === "paid_amount") {
      const paid = parseFloat(value) || 0;
      const originalFee = parseFloat(form.total_fee) || 0;
      const finalTotal = calculateFinalTotal(originalFee, form.discount_applied);
      const remaining = calculateRemaining(finalTotal, paid);
      setForm(prev => ({ ...prev, remaining_amount: remaining.toString() }));
    }

    if (name === "membership_type" && form.membership_category) {
      const category = form.membership_category;
      const planDetails = membershipPlans[category]?.plans[value];
      
      if (planDetails) {
        const joinDate = new Date(form.join_date);
        let expiryDate = new Date(joinDate);

        switch (value) {
          case "Basic":
            expiryDate.setMonth(expiryDate.getMonth() + 1);
            break;
          case "Standard":
            expiryDate.setMonth(expiryDate.getMonth() + 3);
            break;
          case "Premium":
            expiryDate.setMonth(expiryDate.getMonth() + 6);
            break;
          case "Annual":
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            break;
          default:
            break;
        }

        const originalPrice = planDetails.price;
        const finalPrice = calculateFinalTotal(originalPrice, form.discount_applied);
        const paidAmount = parseFloat(form.paid_amount) || 0;
        const remaining = calculateRemaining(finalPrice, paidAmount);

        setForm(prev => ({
          ...prev,
          total_fee: originalPrice.toString(),
          membership_type: value,
          expiry_date: expiryDate.toISOString().split("T")[0],
          remaining_amount: remaining.toString()
        }));
      }
    }
  };

  const handleDiscountToggle = () => {
    const newDiscountState = !showDiscount;
    setShowDiscount(newDiscountState);
    
    const originalFee = parseFloat(form.total_fee) || 0;
    const paidAmount = parseFloat(form.paid_amount) || 0;
    
    if (newDiscountState) {
      const finalTotal = calculateFinalTotal(originalFee, true);
      const remaining = calculateRemaining(finalTotal, paidAmount);
      setForm(prev => ({ 
        ...prev, 
        discount_applied: true,
        remaining_amount: remaining.toString()
      }));
    } else {
      const finalTotal = calculateFinalTotal(originalFee, false);
      const remaining = calculateRemaining(finalTotal, paidAmount);
      setForm(prev => ({ 
        ...prev, 
        discount_applied: false,
        discount_reason: "",
        remaining_amount: remaining.toString()
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!form.user_id?.trim()) newErrors.user_id = "Biometric User ID is required";
    if (!form.full_name?.trim()) newErrors.full_name = "Full name is required";
    if (!form.phone?.trim()) newErrors.phone = "Phone number is required";
    if (form.phone && !form.phone.match(/^[0-9]{10}$/)) {
      newErrors.phone = "Invalid phone number (10 digits)";
    }
    if (!form.membership_category) newErrors.membership_category = "Please select membership category";
    if (!form.membership_type) newErrors.membership_type = "Please select membership type";
    
    const originalFee = parseFloat(form.total_fee) || 0;
    if (originalFee <= 0) newErrors.total_fee = "Invalid total fee";
    
    const finalTotal = calculateFinalTotal(originalFee, form.discount_applied);
    const paidAmount = parseFloat(form.paid_amount) || 0;
    
    if (paidAmount < 0) newErrors.paid_amount = "Invalid paid amount";
    if (paidAmount > finalTotal) {
      newErrors.paid_amount = "Paid amount cannot exceed total fee after discount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);

    try {
      const originalFee = parseFloat(form.total_fee) || 0;
      const discountApplied = form.discount_applied;
      const finalTotal = calculateFinalTotal(originalFee, discountApplied);
      const paidAmount = parseFloat(form.paid_amount) || 0;
      const paymentStatus = paidAmount === 0 ? "pending" :
                           paidAmount < finalTotal ? "partial" : "completed";

      const selectedCategory = membershipPlans[form.membership_category];
      let membershipDisplay = `${selectedCategory.name} - ${form.membership_type}`;
      
      if (discountApplied && form.discount_reason) {
        membershipDisplay = `${membershipDisplay} (Special Discount: ₹${DISCOUNT_AMOUNT} - ${form.discount_reason})`;
      } else if (discountApplied) {
        membershipDisplay = `${membershipDisplay} (Special Discount: ₹${DISCOUNT_AMOUNT})`;
      }

      const memberData = {
        id: Date.now(),
        user_id: form.user_id,
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        membership_category: form.membership_category,
        membership_type: membershipDisplay,
        original_price: originalFee,
        total_fee: finalTotal,
        discount_applied: discountApplied ? DISCOUNT_AMOUNT : 0,
        discount_reason: form.discount_reason,
        paid_amount: paidAmount,
        remaining_amount: (finalTotal - paidAmount).toString(),
        payment_method: form.payment_method,
        payment_status: paymentStatus,
        join_date: form.join_date,
        expiry_date: form.expiry_date,
        created_at: new Date().toISOString(),
        notes: form.notes
      };

      const paymentRecord = {
        id: `pay_${Date.now()}`,
        member_id: form.user_id,
        member_name: form.full_name,
        amount: paidAmount,
        original_amount: originalFee,
        discount: discountApplied ? DISCOUNT_AMOUNT : 0,
        payment_date: new Date().toISOString(),
        payment_method: form.payment_method,
        payment_status: paymentStatus,
        membership_type: membershipDisplay,
        type: "new_membership"
      };

      const existingMembers = JSON.parse(localStorage.getItem("members") || "[]");
      const existingPayments = JSON.parse(localStorage.getItem("payments") || "[]");

      localStorage.setItem("members", JSON.stringify([...existingMembers, memberData]));
      localStorage.setItem("payments", JSON.stringify([...existingPayments, paymentRecord]));

      try {
        if (memberData.phone) {
          await sendWelcomeSMS(memberData);
          if (paymentStatus === "partial" && paidAmount > 0) {
            await sendPartialPaymentSMS(memberData);
          }
        }
      } catch (smsError) {
        console.error("SMS error:", smsError);
      }

      setSuccess(true);
      setTimeout(() => {
        setForm({
          user_id: form.user_id,
          full_name: "",
          phone: "",
          email: "",
          address: "",
          membership_category: "gym",
          membership_type: "",
          total_fee: "",
          paid_amount: "",
          remaining_amount: "0",
          payment_method: "Cash",
          payment_status: "pending",
          expiry_date: "",
          join_date: new Date().toISOString().split("T")[0],
          notes: "",
          discount_applied: false,
          discount_reason: ""
        });
        setShowDiscount(false);
        setSuccess(false);
      }, 3000);

    } catch (error) {
      console.error(error);
      alert("Error adding member");
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlans = () => {
    if (!form.membership_category) return [];
    return Object.entries(membershipPlans[form.membership_category].plans);
  };

  const getOriginalPrice = () => {
    return parseFloat(form.total_fee) || 0;
  };

  const getFinalPrice = () => {
    const original = getOriginalPrice();
    return calculateFinalTotal(original, form.discount_applied);
  };

  const getSavings = () => {
    if (form.discount_applied) {
      return getOriginalPrice() - getFinalPrice();
    }
    return 0;
  };

  return (
    <div className="add-member-container">
      <div className="add-member-header">
        <h1 className="page-title">Add New Member</h1>
        <p className="page-subtitle">Register a new member with biometric ID</p>
      </div>

      {success && (
        <div className="success-alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Member added successfully! SMS sent to member.
        </div>
      )}

      <div className="add-member-content">
        <form onSubmit={handleSubmit} className="member-form">
          <div className="form-grid">
            {/* Personal Information Section */}
            <div className="form-section">
              <div className="section-header">
                <div className="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
                  </svg>
                </div>
                <h2 className="section-title">Personal Information</h2>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Biometric User ID <span className="required">*</span></label>
                  <input type="text" name="user_id" className={`form-input ${errors.user_id ? 'error' : ''}`} value={form.user_id} disabled placeholder="Biometric ID" />
                  {errors.user_id && <span className="error-message">{errors.user_id}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name <span className="required">*</span></label>
                  <input type="text" name="full_name" className={`form-input ${errors.full_name ? 'error' : ''}`} value={form.full_name} onChange={handleChange} placeholder="Enter full name" />
                  {errors.full_name && <span className="error-message">{errors.full_name}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Phone Number <span className="required">*</span></label>
                  <input type="tel" name="phone" className={`form-input ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" />
                  {errors.phone && <span className="error-message">{errors.phone}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input type="email" name="email" className="form-input" value={form.email} onChange={handleChange} placeholder="member@example.com" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea name="address" className="form-input" value={form.address} onChange={handleChange} rows="3" placeholder="Complete address" />
              </div>
            </div>

            {/* Membership Information Section */}
            <div className="form-section">
              <div className="section-header">
                <div className="section-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v4M4 6h16M6 6v12a2 2 0 002 2h8a2 2 0 002-2V6M8 10h8M8 14h4" />
                  </svg>
                </div>
                <h2 className="section-title">Membership Information</h2>
              </div>

              <div className="form-group">
                <label className="form-label">Membership Category <span className="required">*</span></label>
                <div className="category-buttons">
                  <button type="button" className={`category-btn ${form.membership_category === 'gym' ? 'active' : ''}`} onClick={() => setForm(prev => ({ ...prev, membership_category: 'gym', membership_type: "", total_fee: "", expiry_date: "", discount_applied: false, discount_reason: "" }))}>💪 GYM</button>
                  <button type="button" className={`category-btn ${form.membership_category === 'cardio' ? 'active' : ''}`} onClick={() => setForm(prev => ({ ...prev, membership_category: 'cardio', membership_type: "", total_fee: "", expiry_date: "", discount_applied: false, discount_reason: "" }))}>❤️ CARDIO</button>
                </div>
                {errors.membership_category && <span className="error-message">{errors.membership_category}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Membership Type <span className="required">*</span></label>
                <select name="membership_type" className={`form-input ${errors.membership_type ? 'error' : ''}`} value={form.membership_type} onChange={handleChange} disabled={!form.membership_category}>
                  <option value="">Select membership type</option>
                  {getCurrentPlans().map(([plan, details]) => (
                    <option key={plan} value={plan}>{plan} - {details.duration} (₹{details.price})</option>
                  ))}
                </select>
                {errors.membership_type && <span className="error-message">{errors.membership_type}</span>}
              </div>

              {/* Discount Section */}
              <div className="form-group">
                <label className="form-label">Apply ₹100 Special Discount?</label>
                <div className="discount-toggle">
                  <button type="button" className={`discount-btn ${showDiscount ? 'active' : ''}`} onClick={handleDiscountToggle}>
                    {showDiscount ? '✓ ₹100 Discount Applied' : '➕ Apply ₹100 Discount'}
                  </button>
                </div>
              </div>

              {showDiscount && (
                <div className="discount-section">
                  <div className="form-group">
                    <label className="form-label">Discount Reason (Optional)</label>
                    <input type="text" name="discount_reason" className="form-input" value={form.discount_reason} onChange={handleChange} placeholder="e.g., Referral, Festival offer, etc." />
                  </div>
                  <div className="discount-preview">
                    <div className="price-breakdown">
                      <span>Original Price:</span>
                      <span>₹{getOriginalPrice().toLocaleString()}</span>
                    </div>
                    <div className="price-breakdown discount-line">
                      <span>Discount ({getSavings() > 0 ? `-₹${getSavings()}` : 'None'}):</span>
                      <span className="discount-amount">-₹{getSavings().toLocaleString()}</span>
                    </div>
                    <div className="price-breakdown total-line">
                      <span>Final Price:</span>
                      <span className="final-price">₹{getFinalPrice().toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Join Date</label>
                  <input type="date" name="join_date" className="form-input" value={form.join_date} onChange={handleChange} />
                </div>

                <div className="form-group">
                  <label className="form-label">Expiry Date</label>
                  <input type="date" name="expiry_date" className="form-input" value={form.expiry_date} readOnly disabled />
                  <small className="form-hint">Auto-calculated based on membership</small>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Total Fee (₹) <span className="required">*</span></label>
                  <input type="number" name="total_fee" className={`form-input ${errors.total_fee ? 'error' : ''}`} value={form.total_fee} onChange={handleChange} placeholder="0.00" step="0.01" readOnly disabled />
                  {errors.total_fee && <span className="error-message">{errors.total_fee}</span>}
                </div>

                <div className="form-group">
                  <label className="form-label">Paid Amount (₹) <span className="required">*</span></label>
                  <input type="number" name="paid_amount" className={`form-input ${errors.paid_amount ? 'error' : ''}`} value={form.paid_amount} onChange={handleChange} placeholder="0.00" step="0.01" />
                  {errors.paid_amount && <span className="error-message">{errors.paid_amount}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Remaining Amount (₹)</label>
                  <input type="text" className="form-input remaining-amount" value={form.remaining_amount} readOnly disabled />
                </div>

                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select name="payment_method" className="form-input" value={form.payment_method} onChange={handleChange}>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Debit Card">Debit Card</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Additional Notes</label>
                <textarea name="notes" className="form-input" value={form.notes} onChange={handleChange} rows="3" placeholder="Any special notes or requirements..." />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={() => window.history.back()}>Cancel</button>
            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span> Processing...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 14.66V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.34M18 8l4-4-4-4M18 2h4v4" />
                  </svg>
                  Save Member
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}