import React, { useState, useEffect } from "react";
import "./Payments.css";

// Import your actual services
import { getPayments, getMembers } from "../services/paymentService";

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("all");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  // Fetch actual payments and members from database
  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod, dateRange]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Fetch actual payments from your backend
      const paymentsData = await getPayments();
      const membersData = await getMembers();
      
      // Process payments to include member details
      const processedPayments = paymentsData.map(payment => ({
        ...payment,
        memberName: payment.member_name || payment.full_name,
        memberId: payment.member_id || payment.user_id,
        membershipType: payment.membership_type,
        amount: payment.paid_amount || payment.amount,
        date: payment.payment_date || payment.created_at,
        method: payment.payment_method,
        status: payment.payment_status
      }));
      
      setPayments(processedPayments);
      setMembers(membersData);
    } catch (error) {
      console.error("Error fetching data:", error);
      // If API fails, use localStorage data
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  // Load from localStorage as fallback
  const loadFromLocalStorage = () => {
    const storedMembers = JSON.parse(localStorage.getItem("members") || "[]");
    const storedPayments = JSON.parse(localStorage.getItem("payments") || "[]");
    
    // Generate payments from members data
    const generatedPayments = [];
    
    storedMembers.forEach(member => {
      // Add payment record for member creation
      if (member.paid_amount && parseFloat(member.paid_amount) > 0) {
        generatedPayments.push({
          id: `pay_${member.id}_${Date.now()}`,
          memberId: member.user_id || member.id,
          memberName: member.full_name,
          amount: parseFloat(member.paid_amount),
          date: member.join_date || member.created_at || new Date().toISOString(),
          method: member.payment_method || "Cash",
          status: parseFloat(member.paid_amount) >= parseFloat(member.total_fee) ? "completed" : "partial",
          membershipType: member.membership_type,
          type: "new_membership"
        });
      }
      
      // Add payment record for renewals
      if (member.renewals && member.renewals.length > 0) {
        member.renewals.forEach(renewal => {
          generatedPayments.push({
            id: `renew_${renewal.id}_${Date.now()}`,
            memberId: member.user_id || member.id,
            memberName: member.full_name,
            amount: parseFloat(renewal.paid_amount),
            date: renewal.renewal_date,
            method: renewal.payment_method || "Cash",
            status: "completed",
            membershipType: renewal.new_membership_type || member.membership_type,
            type: "renewal"
          });
        });
      }
    });
    
    // Merge with stored payments
    const allPayments = [...storedPayments, ...generatedPayments];
    setPayments(allPayments);
  };

  // Filter payments based on selected period and date range
  const getFilteredPayments = () => {
    let filtered = [...payments];
    
    // Apply date filter
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    filtered = filtered.filter(payment => {
      const paymentDate = new Date(payment.date);
      return paymentDate >= startDate && paymentDate <= endDate;
    });
    
    // Apply payment method filter
    if (selectedPaymentMethod !== "all") {
      filtered = filtered.filter(payment => payment.method === selectedPaymentMethod);
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return filtered;
  };

  // Calculate totals from actual data
  const calculateTotals = () => {
    const filteredPayments = getFilteredPayments();
    const completedPayments = filteredPayments.filter(p => p.status === "completed" || p.status === "paid");
    const totalCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const pendingPayments = filteredPayments.filter(p => p.status === "pending" || p.status === "partial");
    const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
    
    const methodBreakdown = {
      Cash: completedPayments.filter(p => p.method === "Cash").reduce((sum, p) => sum + p.amount, 0),
      UPI: completedPayments.filter(p => p.method === "UPI").reduce((sum, p) => sum + p.amount, 0),
      Card: completedPayments.filter(p => p.method === "Credit Card" || p.method === "Debit Card").reduce((sum, p) => sum + p.amount, 0),
      Bank: completedPayments.filter(p => p.method === "Bank Transfer").reduce((sum, p) => sum + p.amount, 0),
    };
    
    return { 
      totalCollected, 
      totalPending, 
      methodBreakdown,
      totalTransactions: filteredPayments.length,
      completedCount: completedPayments.length
    };
  };

  const getPaymentMethodIcon = (method) => {
    const icons = {
      Cash: "💰",
      UPI: "📱",
      "Credit Card": "💳",
      "Debit Card": "💳",
      "Bank Transfer": "🏦"
    };
    return icons[method] || "💵";
  };

  const getStatusBadge = (status, amount, totalFee) => {
    if (status === "completed" || status === "paid") {
      return <span className="status-badge completed">✓ Completed</span>;
    } else if (status === "partial" || (amount && totalFee && amount < totalFee)) {
      return <span className="status-badge partial">⚠️ Partial</span>;
    } else {
      return <span className="status-badge pending">⏳ Pending</span>;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleExportReport = () => {
    const filteredPayments = getFilteredPayments();
    const reportData = filteredPayments.map(p => ({
      "Transaction ID": p.id,
      "Member Name": p.memberName,
      "Member ID": p.memberId,
      "Membership Type": p.membershipType,
      "Amount": p.amount,
      "Date": formatDate(p.date),
      "Payment Method": p.method,
      "Status": p.status
    }));
    
    // Create CSV
    const headers = Object.keys(reportData[0] || {});
    const csv = [
      headers.join(','),
      ...reportData.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(','))
    ].join('\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendReminder = (memberId, memberName, amount) => {
    // Implement reminder functionality
    alert(`Reminder sent to ${memberName} for pending payment of ₹${amount}`);
    // You can integrate SMS/Email here
  };

  const filteredPayments = getFilteredPayments();
  const { totalCollected, totalPending, methodBreakdown, totalTransactions, completedCount } = calculateTotals();

  return (
    <div className="payments-container">
      {/* Header */}
      <div className="payments-header">
        <div className="header-title">
          <h1 className="page-title">Payment Management</h1>
          <p className="page-subtitle">Track and manage all financial transactions</p>
        </div>
        <button className="export-btn" onClick={handleExportReport}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          Export Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card revenue">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Collected</span>
            <span className="stat-value">₹{totalCollected.toLocaleString()}</span>
            <span className="stat-trend positive">From {completedCount} transactions</span>
          </div>
        </div>

        <div className="stat-card pending">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Pending Dues</span>
            <span className="stat-value">₹{totalPending.toLocaleString()}</span>
            <span className="stat-trend negative">Need attention</span>
          </div>
        </div>

        <div className="stat-card members">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 20v-5h-3v5h-3v-5H8v5H5v-5H3v5a2 2 0 002 2h14a2 2 0 002-2v-5h-2v5h-2zM10 2h4v4h-4z"/>
              <path d="M12 6v8l3-3m-6 0l3 3"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Transactions</span>
            <span className="stat-value">{totalTransactions}</span>
            <span className="stat-trend">Selected period</span>
          </div>
        </div>

        <div className="stat-card success-rate">
          <div className="stat-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Success Rate</span>
            <span className="stat-value">
              {totalTransactions > 0 ? ((completedCount / totalTransactions) * 100).toFixed(1) : 0}%
            </span>
            <span className="stat-trend positive">Collection efficiency</span>
          </div>
        </div>
      </div>

      {/* Payment Method Breakdown */}
      <div className="method-breakdown">
        <h3 className="section-title">Payment Method Breakdown</h3>
        <div className="method-grid">
          <div className="method-card cash">
            <div className="method-icon">💰</div>
            <div className="method-info">
              <span className="method-name">Cash</span>
              <span className="method-amount">₹{methodBreakdown.Cash.toLocaleString()}</span>
            </div>
            <div className="method-percent">
              {totalCollected > 0 ? ((methodBreakdown.Cash / totalCollected) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="method-card upi">
            <div className="method-icon">📱</div>
            <div className="method-info">
              <span className="method-name">UPI</span>
              <span className="method-amount">₹{methodBreakdown.UPI.toLocaleString()}</span>
            </div>
            <div className="method-percent">
              {totalCollected > 0 ? ((methodBreakdown.UPI / totalCollected) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="method-card card">
            <div className="method-icon">💳</div>
            <div className="method-info">
              <span className="method-name">Card Payments</span>
              <span className="method-amount">₹{methodBreakdown.Card.toLocaleString()}</span>
            </div>
            <div className="method-percent">
              {totalCollected > 0 ? ((methodBreakdown.Card / totalCollected) * 100).toFixed(1) : 0}%
            </div>
          </div>
          <div className="method-card bank">
            <div className="method-icon">🏦</div>
            <div className="method-info">
              <span className="method-name">Bank Transfer</span>
              <span className="method-amount">₹{methodBreakdown.Bank.toLocaleString()}</span>
            </div>
            <div className="method-percent">
              {totalCollected > 0 ? ((methodBreakdown.Bank / totalCollected) * 100).toFixed(1) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="period-selector">
          <button 
            className={`period-btn ${selectedPeriod === 'monthly' ? 'active' : ''}`}
            onClick={() => {
              setSelectedPeriod('monthly');
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
              setDateRange({
                start: firstDay.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0]
              });
            }}
          >
            Monthly
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'yearly' ? 'active' : ''}`}
            onClick={() => {
              setSelectedPeriod('yearly');
              const today = new Date();
              const firstDay = new Date(today.getFullYear(), 0, 1);
              setDateRange({
                start: firstDay.toISOString().split('T')[0],
                end: today.toISOString().split('T')[0]
              });
            }}
          >
            Yearly
          </button>
          <button 
            className={`period-btn ${selectedPeriod === 'custom' ? 'active' : ''}`}
            onClick={() => setSelectedPeriod('custom')}
          >
            Custom Range
          </button>
        </div>

        {selectedPeriod === 'custom' && (
          <div className="date-range">
            <input 
              type="date" 
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="date-input"
            />
            <span>to</span>
            <input 
              type="date" 
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="date-input"
            />
          </div>
        )}

        <div className="method-filter">
          <select 
            className="filter-select"
            value={selectedPaymentMethod}
            onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          >
            <option value="all">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Debit Card">Debit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Payment History Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading payment data...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="payments-table">
            <thead>
              <tr>
                <th>Transaction ID</th>
                <th>Member Name</th>
                <th>Member ID</th>
                <th>Membership Type</th>
                <th>Amount</th>
                <th>Date</th>
                <th>Payment Method</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.length > 0 ? (
                filteredPayments.map((payment, index) => (
                  <tr key={payment.id || index}>
                    <td className="transaction-id">
                      {payment.id || `TXN${String(index + 1).padStart(6, '0')}`}
                    </td>
                    <td>
                      <div className="member-cell">
                        <div className="member-avatar">
                          {payment.memberName?.charAt(0) || "M"}
                        </div>
                        {payment.memberName}
                      </div>
                    </td>
                    <td>{payment.memberId}</td>
                    <td>
                      <span className="membership-badge">{payment.membershipType || "N/A"}</span>
                    </td>
                    <td className="amount">₹{payment.amount?.toLocaleString() || 0}</td>
                    <td>{formatDate(payment.date)}</td>
                    <td>
                      <span className="method-badge">
                        {getPaymentMethodIcon(payment.method)} {payment.method}
                      </span>
                    </td>
                    <td>{getStatusBadge(payment.status, payment.amount, payment.total_fee)}</td>
                    <td>
                      {(payment.status === "pending" || payment.status === "partial") && (
                        <button 
                          className="remind-btn-small"
                          onClick={() => handleSendReminder(payment.memberId, payment.memberName, payment.amount)}
                        >
                          Remind
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="no-data">
                    <div className="no-data-content">
                      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                      </svg>
                      <p>No payment records found</p>
                      <p className="no-data-hint">Add members or process renewals to see payments here</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pending Dues Summary */}
      {filteredPayments.filter(p => p.status === "pending" || p.status === "partial").length > 0 && (
        <div className="recent-summary">
          <div className="summary-card">
            <h4>Quick Statistics</h4>
            <div className="summary-stats">
              <div className="summary-item">
                <span>Average Payment</span>
                <strong>₹{(totalCollected / (completedCount || 1)).toLocaleString()}</strong>
              </div>
              <div className="summary-item">
                <span>Most Used Method</span>
                <strong>
                  {Object.entries(methodBreakdown).reduce((a, b) => a[1] > b[1] ? a : b)[0] || 'N/A'}
                </strong>
              </div>
              <div className="summary-item">
                <span>Collection Rate</span>
                <strong>{totalCollected + totalPending > 0 ? ((totalCollected / (totalCollected + totalPending)) * 100).toFixed(1) : 0}%</strong>
              </div>
            </div>
          </div>
          
          <div className="summary-card">
            <h4>Pending Actions</h4>
            <div className="pending-list">
              {filteredPayments
                .filter(p => p.status === "pending" || p.status === "partial")
                .slice(0, 3)
                .map((payment, idx) => (
                  <div key={idx} className="pending-item">
                    <div>
                      <div className="pending-name">{payment.memberName}</div>
                      <div className="pending-details">Due: ₹{payment.amount}</div>
                    </div>
                    <div>
                      <span className="pending-amount">₹{payment.amount}</span>
                      <button 
                        className="remind-btn"
                        onClick={() => handleSendReminder(payment.memberId, payment.memberName, payment.amount)}
                      >
                        Remind
                      </button>
                    </div>
                  </div>
                ))}
              {filteredPayments.filter(p => p.status === "pending" || p.status === "partial").length === 0 && (
                <p className="no-pending">No pending payments</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}