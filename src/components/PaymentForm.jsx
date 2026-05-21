import React, { useState } from "react";
import "./PaymentForm.css";

export default function PaymentForm({ member, onSubmit, onClose }) {
  const [formData, setFormData] = useState({
    memberId: member?.id || "",
    memberName: member?.name || "",
    amount: "",
    paymentMethod: "Cash",
    paymentDate: new Date().toISOString().split('T')[0],
    transactionId: "",
    notes: "",
    membershipType: member?.membershipType || "",
    discount: 0,
    lateFee: 0
  });

  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const paymentMethods = [
    { id: "Cash", name: "Cash", icon: "💰", color: "#10b981" },
    { id: "UPI", name: "UPI", icon: "📱", color: "#3b82f6" },
    { id: "Credit Card", name: "Credit Card", icon: "💳", color: "#8b5cf6" },
    { id: "Debit Card", name: "Debit Card", icon: "💳", color: "#f59e0b" },
    { id: "Bank Transfer", name: "Bank Transfer", icon: "🏦", color: "#06b6d4" }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.memberId) newErrors.memberId = "Member ID is required";
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Valid amount is required";
    }
    if (!formData.paymentMethod) newErrors.paymentMethod = "Payment method is required";
    if (!formData.paymentDate) newErrors.paymentDate = "Payment date is required";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateTotal = () => {
    const amount = parseFloat(formData.amount) || 0;
    const discount = parseFloat(formData.discount) || 0;
    const lateFee = parseFloat(formData.lateFee) || 0;
    return amount + lateFee - discount;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate API call
    setTimeout(() => {
      const paymentData = {
        ...formData,
        total: calculateTotal(),
        timestamp: new Date().toISOString(),
        receiptId: `RCPT-${Date.now()}`
      };
      
      if (onSubmit) {
        onSubmit(paymentData);
      }
      
      setIsProcessing(false);
      alert("Payment processed successfully!");
      
      // Reset form or close modal
      if (onClose) onClose();
    }, 1500);
  };

  return (
    <div className="payment-modal">
      <div className="payment-modal-content">
        <div className="payment-modal-header">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <div className="header-text">
            <h2>Process Payment</h2>
            <p>Record membership fee payment</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          {/* Member Information */}
          <div className="form-section">
            <h3 className="section-title">Member Information</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Member ID <span className="required">*</span>
                </label>
                <input
                  type="text"
                  name="memberId"
                  className={`form-input ${errors.memberId ? 'error' : ''}`}
                  value={formData.memberId}
                  onChange={handleChange}
                  placeholder="Enter Member ID"
                  disabled={!!member}
                />
                {errors.memberId && <span className="error-message">{errors.memberId}</span>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Member Name</label>
                <input
                  type="text"
                  name="memberName"
                  className="form-input"
                  value={formData.memberName}
                  onChange={handleChange}
                  placeholder="Member Name"
                  disabled
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Membership Type</label>
              <select
                name="membershipType"
                className="form-input"
                value={formData.membershipType}
                onChange={handleChange}
              >
                <option value="">Select Membership Type</option>
                <option value="Basic">Basic - ₹1,500/month</option>
                <option value="Standard">Standard - ₹4,000/3 months</option>
                <option value="Premium">Premium - ₹7,500/6 months</option>
                <option value="Annual">Annual - ₹14,000/year</option>
              </select>
            </div>
          </div>

          {/* Payment Details */}
          <div className="form-section">
            <h3 className="section-title">Payment Details</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  Amount (₹) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  className={`form-input ${errors.amount ? 'error' : ''}`}
                  value={formData.amount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
                {errors.amount && <span className="error-message">{errors.amount}</span>}
              </div>
              
              <div className="form-group">
                <label className="form-label">Discount (₹)</label>
                <input
                  type="number"
                  name="discount"
                  className="form-input"
                  value={formData.discount}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Late Fee (₹)</label>
                <input
                  type="number"
                  name="lateFee"
                  className="form-input"
                  value={formData.lateFee}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Payment Date</label>
                <input
                  type="date"
                  name="paymentDate"
                  className={`form-input ${errors.paymentDate ? 'error' : ''}`}
                  value={formData.paymentDate}
                  onChange={handleChange}
                />
                {errors.paymentDate && <span className="error-message">{errors.paymentDate}</span>}
              </div>
            </div>

            {/* Payment Methods */}
            <div className="form-group">
              <label className="form-label">
                Payment Method <span className="required">*</span>
              </label>
              <div className="payment-methods-grid">
                {paymentMethods.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    className={`payment-method-btn ${formData.paymentMethod === method.id ? 'selected' : ''}`}
                    onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                    style={{
                      borderColor: formData.paymentMethod === method.id ? method.color : '#e2e8f0',
                      backgroundColor: formData.paymentMethod === method.id ? `${method.color}10` : 'white'
                    }}
                  >
                    <span className="method-icon">{method.icon}</span>
                    <span className="method-name">{method.name}</span>
                  </button>
                ))}
              </div>
              {errors.paymentMethod && <span className="error-message">{errors.paymentMethod}</span>}
            </div>

            <div className="form-group">
              <label className="form-label">Transaction ID (Optional)</label>
              <input
                type="text"
                name="transactionId"
                className="form-input"
                value={formData.transactionId}
                onChange={handleChange}
                placeholder="Enter transaction reference"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea
                name="notes"
                className="form-input"
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Any additional notes..."
              />
            </div>
          </div>

          {/* Payment Summary */}
          <div className="payment-summary">
            <h4>Payment Summary</h4>
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{parseFloat(formData.amount || 0).toLocaleString()}</span>
            </div>
            {formData.discount > 0 && (
              <div className="summary-row discount">
                <span>Discount:</span>
                <span>-₹{parseFloat(formData.discount).toLocaleString()}</span>
              </div>
            )}
            {formData.lateFee > 0 && (
              <div className="summary-row late-fee">
                <span>Late Fee:</span>
                <span>+₹{parseFloat(formData.lateFee).toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>Total Amount:</span>
              <span>₹{calculateTotal().toLocaleString()}</span>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-submit" disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 13l4 4L19 7"/>
                  </svg>
                  Process Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}