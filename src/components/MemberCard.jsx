import React from "react";
import "./MemberCard.css";

function MemberCard({ member }) {
  const isExpired = new Date(member.expiry_date) < new Date();
  const isPartial = Number(member.remaining_amount) > 0;

  let status = "Active";
  let statusClass = "status-active";

  if (isExpired) {
    status = "Expired";
    statusClass = "status-expired";
  } else if (isPartial) {
    status = "Partial Payment";
    statusClass = "status-partial";
  }

  // Format date for better display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`member-card ${statusClass}`}>
      <div className="card-header">
        <div className="member-avatar">
          <span className="avatar-text">
            {member.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="member-title">
          <h3 className="member-name">{member.name}</h3>
          <span className={`status-badge ${statusClass}`}>{status}</span>
        </div>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="info-label">User ID:</span>
          <span className="info-value">{member.user_id}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Mobile:</span>
          <span className="info-value">{member.mobile}</span>
        </div>
        <div className="info-row">
          <span className="info-label">Membership:</span>
          <span className="info-value membership-type">
            {member.membership_type}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Expiry Date:</span>
          <span className="info-value expiry-date">
            {formatDate(member.expiry_date)}
          </span>
        </div>
        {isPartial && (
          <div className="info-row partial-amount">
            <span className="info-label">Remaining:</span>
            <span className="info-value amount">
              ₹{member.remaining_amount}
            </span>
          </div>
        )}
      </div>

      <div className="card-footer">
        <button className="btn-view">View Details</button>
        <button className="btn-renew">Renew</button>
      </div>
    </div>
  );
}

export default MemberCard;