import React from "react";

export default function StatusBadge({ status }) {
  const text = status || "Active";

  return (
    <div className="p-4 rounded-xl border mt-4">
      <h2 className="font-bold">Member Status</h2>
      <p>{text}</p>
    </div>
  );
}import React from "react";
import "./StatusBadge.css";

export default function StatusBadge({ 
  status, 
  expiryDate, 
  remainingAmount,
  showDetails = true,
  size = "medium"
}) {
  // Determine status type
  const getStatusType = () => {
    if (status) return status.toLowerCase();
    
    // Auto-determine from expiry and payment if provided
    if (expiryDate && new Date(expiryDate) < new Date()) {
      return "expired";
    }
    if (remainingAmount && Number(remainingAmount) > 0) {
      return "partial";
    }
    return "active";
  };

  const statusType = getStatusType();
  
  // Status configurations
  const statusConfig = {
    active: {
      label: "Active",
      icon: "M5 13l4 4L19 7",
      color: "#10b981",
      bgColor: "#d1fae5",
      borderColor: "#10b981",
      description: "Membership is active and valid"
    },
    expired: {
      label: "Expired",
      icon: "M6 18L18 6M6 6l12 12",
      color: "#ef4444",
      bgColor: "#fee2e2",
      borderColor: "#ef4444",
      description: "Membership has expired. Please renew."
    },
    partial: {
      label: "Partial Payment",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "#f59e0b",
      bgColor: "#fed7aa",
      borderColor: "#f59e0b",
      description: "Payment pending. Please complete payment."
    },
    suspended: {
      label: "Suspended",
      icon: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636",
      color: "#8b5cf6",
      bgColor: "#ede9fe",
      borderColor: "#8b5cf6",
      description: "Membership temporarily suspended"
    },
    pending: {
      label: "Pending",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "#3b82f6",
      bgColor: "#dbeafe",
      borderColor: "#3b82f6",
      description: "Membership application under review"
    }
  };

  const config = statusConfig[statusType] || statusConfig.active;
  const displayText = status || config.label;
  
  // Size configurations
  const sizeConfig = {
    small: {
      padding: "8px 16px",
      fontSize: "12px",
      iconSize: 16,
      badgePadding: "4px 8px"
    },
    medium: {
      padding: "12px 20px",
      fontSize: "14px",
      iconSize: 20,
      badgePadding: "6px 12px"
    },
    large: {
      padding: "16px 24px",
      fontSize: "16px",
      iconSize: 24,
      badgePadding: "8px 16px"
    }
  };

  const currentSize = sizeConfig[size] || sizeConfig.medium;

  // Calculate days remaining if expiry date provided
  const getDaysRemaining = () => {
    if (!expiryDate) return null;
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  return (
    <div className={`status-badge-container ${statusType}`}>
      <div 
        className="status-badge-main"
        style={{
          padding: currentSize.padding,
          backgroundColor: config.bgColor + '20',
          borderLeft: `4px solid ${config.color}`
        }}
      >
        <div className="status-badge-header">
          <div 
            className="status-icon"
            style={{
              backgroundColor: config.color,
              width: currentSize.iconSize + 8,
              height: currentSize.iconSize + 8
            }}
          >
            <svg 
              width={currentSize.iconSize} 
              height={currentSize.iconSize} 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={config.icon} />
            </svg>
          </div>
          
          <div className="status-info">
            <div className="status-title-section">
              <h3 className="status-title" style={{ fontSize: currentSize.fontSize }}>
                Member Status
              </h3>
              <span 
                className="status-badge"
                style={{
                  backgroundColor: config.color,
                  color: 'white',
                  padding: currentSize.badgePadding,
                  fontSize: parseInt(currentSize.fontSize) - 2 + 'px'
                }}
              >
                {displayText}
              </span>
            </div>
            
            <p className="status-description" style={{ fontSize: parseInt(currentSize.fontSize) - 2 + 'px' }}>
              {config.description}
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="status-details">
            {daysRemaining !== null && (
              <div className="detail-card">
                <div className="detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Days Remaining</span>
                  <span className={`detail-value ${daysRemaining < 7 ? 'urgent' : ''}`}>
                    {daysRemaining > 0 ? `${daysRemaining} days` : 'Expired'}
                  </span>
                </div>
              </div>
            )}

            {remainingAmount && Number(remainingAmount) > 0 && (
              <div className="detail-card">
                <div className="detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2v20M17 7H7M17 17H7" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Pending Amount</span>
                  <span className="detail-value amount">
                    ₹{remainingAmount}
                  </span>
                </div>
              </div>
            )}

            {expiryDate && (
              <div className="detail-card">
                <div className="detail-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                  </svg>
                </div>
                <div className="detail-content">
                  <span className="detail-label">Expiry Date</span>
                  <span className="detail-value">
                    {new Date(expiryDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {statusType === 'expired' && (
          <button className="renewal-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Renew Now
          </button>
        )}

        {statusType === 'partial' && (
          <button className="payment-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Complete Payment
          </button>
        )}
      </div>

      {statusType === 'active' && daysRemaining && daysRemaining <= 7 && daysRemaining > 0 && (
        <div className="warning-message">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>Membership expires soon! Renew now to avoid interruption.</span>
        </div>
      )}
    </div>
  );
}