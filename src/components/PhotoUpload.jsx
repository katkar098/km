import React, { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import "./QRReceipt.css";

export default function QRReceipt({ member, onDownload, showDetails = true }) {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = () => {
    const date = new Date();
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatTime = () => {
    const date = new Date();
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const qrValue = `Gym Management System\n
Member: ${member.full_name}\n
User ID: ${member.user_id || member.id}\n
Membership: ${member.membership_type}\n
Amount Paid: ₹${member.paid_amount}\n
Payment Date: ${formatDate()} ${formatTime()}\n
Transaction ID: ${member.transaction_id || 'TXN-' + Date.now()}\n
Status: ${member.payment_status || 'Completed'}`;

  const handleDownloadQR = () => {
    const canvas = document.getElementById('qr-code-canvas');
    if (canvas) {
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `qr-receipt-${member.full_name}-${Date.now()}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      if (onDownload) {
        onDownload();
      }
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('receipt-content');
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContent.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="qr-receipt-container">
      <div className="qr-receipt-card">
        <div className="receipt-header">
          <div className="header-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v16h16V4H4z M8 9h8M8 13h6M8 17h4"/>
              <rect x="16" y="8" width="2" height="8" rx="1"/>
            </svg>
          </div>
          <div className="header-text">
            <h2 className="receipt-title">Payment Receipt</h2>
            <p className="receipt-subtitle">Gym Management System</p>
          </div>
        </div>

        <div className="receipt-body" id="receipt-content">
          {showDetails && (
            <div className="member-details">
              <h3 className="section-title">Member Information</h3>
              <div className="details-grid">
                <div className="detail-item">
                  <span className="detail-label">Full Name</span>
                  <span className="detail-value">{member.full_name}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">User ID</span>
                  <span className="detail-value">{member.user_id || member.id || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Membership Type</span>
                  <span className="detail-value membership-badge">{member.membership_type}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mobile Number</span>
                  <span className="detail-value">{member.mobile || 'N/A'}</span>
                </div>
              </div>
            </div>
          )}

          <div className="payment-details">
            <h3 className="section-title">Payment Information</h3>
            <div className="payment-summary">
              <div className="amount-card">
                <span className="amount-label">Amount Paid</span>
                <span className="amount-value">₹{member.paid_amount}</span>
              </div>
              <div className="payment-meta">
                <div className="meta-row">
                  <span className="meta-label">Payment Date:</span>
                  <span className="meta-value">{formatDate()}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Payment Time:</span>
                  <span className="meta-value">{formatTime()}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Transaction ID:</span>
                  <span className="meta-value transaction-id">
                    {member.transaction_id || `TXN-${Date.now()}`}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">Payment Status:</span>
                  <span className="status-badge success">Completed</span>
                </div>
              </div>
            </div>
          </div>

          <div className="qr-section">
            <div 
              className="qr-wrapper"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            >
              <QRCodeCanvas 
                id="qr-code-canvas"
                value={qrValue} 
                size={180}
                level="H"
                includeMargin={true}
                bgColor="#ffffff"
                fgColor="#000000"
              />
              {isHovered && (
                <div className="qr-overlay">
                  <button className="qr-download-btn" onClick={handleDownloadQR}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                    Download QR
                  </button>
                </div>
              )}
            </div>
            <p className="qr-instruction">Scan to verify payment details</p>
          </div>
        </div>

        <div className="receipt-footer">
          <div className="footer-actions">
            <button className="btn-print" onClick={handlePrint}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V3h12v6M6 21h12v-6H6v6zM21 9H3v6h2V9h14v6h2V9z"/>
              </svg>
              Print Receipt
            </button>
            <button className="btn-download" onClick={handleDownloadQR}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              Save as Image
            </button>
          </div>
          <p className="receipt-note">This is a computer generated receipt. No signature required.</p>
        </div>
      </div>
    </div>
  );
}