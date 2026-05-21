import React, { useState, useEffect } from "react";
import * as XLSX from 'xlsx';
import { getMembers } from "../services/memberService";
import "./Reports.css";

export default function Reports() {
  const [reportType, setReportType] = useState("members");
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [members, setMembers] = useState([]);

  // Membership Categories
  const membershipCategories = {
    gym: { name: "GYM", price: 800, displayName: "💪 GYM Member" },
    cardio: { name: "CARDIO", price: 1000, displayName: "❤️ CARDIO Member" },
    pt: { name: "PERSONAL TRAINER", price: 3100, displayName: "🎯 PERSONAL TRAINER" }
  };

  // Helper function to extract numeric value from User ID (e.g., GYM001 -> 1, GYM123 -> 123)
  const getUserIdNumber = (userId) => {
    if (!userId) return 0;
    const match = userId.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return 0;
  };

  // Helper functions
  const getCategoryFromType = (membershipType) => {
    if (!membershipType) return "gym";
    if (membershipType.includes("CARDIO")) return "cardio";
    if (membershipType.includes("PERSONAL") || membershipType.includes("TRAINER")) return "pt";
    return "gym";
  };

  const calculateMemberStatus = (member) => {
    const today = new Date();
    const expiryDate = member.expiry_date ? new Date(member.expiry_date) : null;
    const remainingAmount = parseFloat(member.remaining_amount || 0);
    
    if (expiryDate && expiryDate < today) {
      return { status: "expired", label: "Expired", class: "status-expired", icon: "❌" };
    }
    if (remainingAmount > 0) {
      return { status: "partial", label: "Partially Paid", class: "status-partial", icon: "💰" };
    }
    return { status: "active", label: "Active", class: "status-active", icon: "✅" };
  };

  const getMembershipDisplay = (member) => {
    if (member.membership_category === "cardio") return "❤️ CARDIO Member";
    if (member.membership_category === "pt") return "🎯 PERSONAL TRAINER";
    if (member.membership_category === "gym") return "💪 GYM Member";
    if (member.membership_type) return member.membership_type;
    return "💪 GYM Member";
  };

  // Fetch members from API
  const fetchMembers = async () => {
    setLoading(true);
    try {
      const res = await getMembers();
      let membersArray = [];
      
      if (res?.data?.data && Array.isArray(res.data.data)) {
        membersArray = res.data.data;
      } else if (res?.data && Array.isArray(res.data)) {
        membersArray = res.data;
      } else if (res?.data?.recordset && Array.isArray(res.data.recordset)) {
        membersArray = res.data.recordset;
      }
      
      // Sort members by User ID in ascending numerical order (1, 2, 3, 10, 100)
      membersArray = [...membersArray].sort((a, b) => {
        const numA = getUserIdNumber(a.user_id);
        const numB = getUserIdNumber(b.user_id);
        return numA - numB;
      });
      
      // Process members
      const processedMembers = membersArray.map(m => {
        let membershipCategory = m.membership_category;
        if (!membershipCategory && m.membership_type) {
          membershipCategory = getCategoryFromType(m.membership_type);
        }
        if (!membershipCategory) {
          membershipCategory = "gym";
        }
        
        return {
          ...m,
          membership_category: membershipCategory,
          membership_display: getMembershipDisplay({ ...m, membership_category: membershipCategory }),
          calculated_status: calculateMemberStatus({ ...m, membership_category: membershipCategory }),
          join_date: m.created_at || m.join_date || m.registration_date || new Date().toISOString()
        };
      });
      
      setMembers(processedMembers);
      generateReportData(processedMembers);
    } catch (error) {
      console.error("Error fetching members:", error);
      generateReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const generateReportData = (membersList) => {
    // Filter members by date range if needed
    const filteredMembers = membersList.filter(m => {
      if (!dateRange.start || !dateRange.end) return true;
      const joinDate = new Date(m.join_date);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      return joinDate >= startDate && joinDate <= endDate;
    });
    
    // Member statistics
    const activeMembers = filteredMembers.filter(m => m.calculated_status?.status === "active").length;
    const expiredMembers = filteredMembers.filter(m => m.calculated_status?.status === "expired").length;
    const partialMembers = filteredMembers.filter(m => m.calculated_status?.status === "partial").length;
    
    // Membership distribution
    const membershipDistribution = {
      gym: filteredMembers.filter(m => m.membership_category === "gym").length,
      cardio: filteredMembers.filter(m => m.membership_category === "cardio").length,
      pt: filteredMembers.filter(m => m.membership_category === "pt").length
    };
    
    // Revenue calculation
    const totalRevenue = filteredMembers.reduce((sum, m) => sum + (parseFloat(m.paid_amount) || 0), 0);
    const expectedRevenue = filteredMembers.reduce((sum, m) => sum + (parseFloat(m.total_fee) || 0), 0);
    const pendingRevenue = expectedRevenue - totalRevenue;
    
    // Payment method breakdown
    const paymentMethodBreakdown = {
      Cash: filteredMembers.filter(m => m.payment_method === "Cash").length,
      UPI: filteredMembers.filter(m => m.payment_method === "UPI").length
    };
    
    // Expiring soon members (next 30 days)
    const expiringSoon = filteredMembers.filter(m => {
      if (!m.expiry_date) return false;
      const daysLeft = Math.ceil((new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft > 0 && daysLeft <= 30;
    }).sort((a, b) => new Date(a.expiry_date) - new Date(b.expiry_date));
    
    // Monthly join trend
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const month = new Date();
      month.setMonth(month.getMonth() - i);
      const monthName = month.toLocaleString('default', { month: 'short' });
      const monthMembers = filteredMembers.filter(m => {
        const joinDate = new Date(m.join_date);
        return joinDate.getMonth() === month.getMonth() && 
               joinDate.getFullYear() === month.getFullYear();
      }).length;
      
      monthlyData.push({ month: monthName, count: monthMembers });
    }
    
    setReportData({
      members: {
        total: filteredMembers.length,
        active: activeMembers,
        partial: partialMembers,
        expired: expiredMembers,
        byMembership: membershipDistribution,
        allMembers: filteredMembers
      },
      revenue: {
        total: totalRevenue,
        expected: expectedRevenue,
        pending: pendingRevenue,
        collectionRate: expectedRevenue > 0 ? (totalRevenue / expectedRevenue * 100).toFixed(1) : 0
      },
      paymentMethods: paymentMethodBreakdown,
      expiringSoon: expiringSoon,
      monthlyTrend: monthlyData,
      attendance: {
        averageDaily: Math.floor(filteredMembers.length * 0.65),
        peakDay: "Monday",
        totalCheckins: filteredMembers.length * 12
      }
    });
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (members.length > 0) {
      generateReportData(members);
    }
  }, [dateRange, members]);

  // Export to Excel only
  const exportToExcel = () => {
    setExporting(true);
    try {
      const currentDate = new Date().toLocaleDateString();
      let data = [];
      
      if (reportType === 'members') {
        // Detailed Members List Export
        data = [
          ['MEMBERS DETAILED REPORT'],
          [`Generated on: ${currentDate}`],
          [`Period: ${dateRange.start} to ${dateRange.end}`],
          [],
          ['MEMBER SUMMARY'],
          ['Metric', 'Value'],
          ['Total Members', reportData?.members?.total || 0],
          ['Active Members', reportData?.members?.active || 0],
          ['Partially Paid', reportData?.members?.partial || 0],
          ['Expired Members', reportData?.members?.expired || 0],
          [],
          ['MEMBERSHIP DISTRIBUTION'],
          ['Plan', 'Count', 'Percentage'],
          ['GYM', reportData?.members?.byMembership?.gym || 0, `${((reportData?.members?.byMembership?.gym / (reportData?.members?.total || 1)) * 100).toFixed(1)}%`],
          ['CARDIO', reportData?.members?.byMembership?.cardio || 0, `${((reportData?.members?.byMembership?.cardio / (reportData?.members?.total || 1)) * 100).toFixed(1)}%`],
          ['PERSONAL TRAINER', reportData?.members?.byMembership?.pt || 0, `${((reportData?.members?.byMembership?.pt / (reportData?.members?.total || 1)) * 100).toFixed(1)}%`],
          [],
          ['ALL MEMBERS LIST (Sorted by User ID)'],
          ['User ID', 'Full Name', 'Mobile Number', 'Membership Type', 'Join Date', 'Expiry Date', 'Status', 'Paid Amount', 'Total Fee', 'Payment Method'],
          ...(reportData?.members?.allMembers?.map(m => [
            m.user_id || 'N/A',
            m.full_name || 'N/A',
            m.phone || 'N/A',
            m.membership_display || getMembershipDisplay(m),
            new Date(m.join_date).toLocaleDateString(),
            m.expiry_date ? new Date(m.expiry_date).toLocaleDateString() : 'N/A',
            m.calculated_status?.label || 'Unknown',
            `₹${(parseFloat(m.paid_amount) || 0).toLocaleString()}`,
            `₹${(parseFloat(m.total_fee) || 0).toLocaleString()}`,
            m.payment_method || 'Cash'
          ]) || [])
        ];
      } 
      else if (reportType === 'revenue') {
        data = [
          ['REVENUE REPORT'],
          [`Generated on: ${currentDate}`],
          [`Period: ${dateRange.start} to ${dateRange.end}`],
          [],
          ['REVENUE SUMMARY'],
          ['Metric', 'Value'],
          ['Total Revenue Collected', `₹${reportData?.revenue?.total?.toLocaleString() || 0}`],
          ['Expected Revenue', `₹${reportData?.revenue?.expected?.toLocaleString() || 0}`],
          ['Pending Revenue', `₹${reportData?.revenue?.pending?.toLocaleString() || 0}`],
          ['Collection Rate', `${reportData?.revenue?.collectionRate || 0}%`],
          [],
          ['PAYMENT METHOD BREAKDOWN'],
          ['Method', 'Number of Members', 'Percentage'],
          ['Cash', reportData?.paymentMethods?.Cash || 0, `${reportData?.members?.total > 0 ? ((reportData.paymentMethods.Cash / reportData.members.total) * 100).toFixed(1) : 0}%`],
          ['UPI', reportData?.paymentMethods?.UPI || 0, `${reportData?.members?.total > 0 ? ((reportData.paymentMethods.UPI / reportData.members.total) * 100).toFixed(1) : 0}%`]
        ];
      }
      else if (reportType === 'expiring') {
        data = [
          ['EXPIRING MEMBERS REPORT'],
          [`Generated on: ${currentDate}`],
          ['Members expiring in next 30 days'],
          [],
          ['User ID', 'Full Name', 'Mobile', 'Membership', 'Expiry Date', 'Days Left', 'Status'],
          ...(reportData?.expiringSoon?.map(m => [
            m.user_id || 'N/A',
            m.full_name || 'N/A',
            m.phone || 'N/A',
            m.membership_display || getMembershipDisplay(m),
            new Date(m.expiry_date).toLocaleDateString(),
            `${Math.ceil((new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))} days`,
            m.calculated_status?.label || 'Active'
          ]) || [])
        ];
        
        if (reportData?.expiringSoon?.length === 0) {
          data.push(['No members expiring in the next 30 days']);
        }
      }
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `${reportType.toUpperCase()}_Report`);
      XLSX.writeFile(wb, `${reportType}_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      
      alert("✅ Excel report exported successfully!");
    } catch (error) {
      console.error("Excel export error:", error);
      alert("Error exporting Excel. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleExport = () => {
    exportToExcel();
  };

  // Render Members Report
  const renderMembersReport = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Members</span>
            <span className="stat-period">All time</span>
          </div>
          <div className="stat-value">{reportData?.members?.total || 0}</div>
          <div className="stat-trend positive">Total registered members</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Active Members</span>
            <span className="stat-period">Currently active</span>
          </div>
          <div className="stat-value">{reportData?.members?.active || 0}</div>
          <div className="stat-trend positive">
            {reportData?.members?.total > 0 
              ? ((reportData.members.active / reportData.members.total) * 100).toFixed(1) 
              : 0}% of total
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Partially Paid</span>
            <span className="stat-period">Pending payment</span>
          </div>
          <div className="stat-value">{reportData?.members?.partial || 0}</div>
          <div className="stat-trend warning">Need follow-up</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Expired</span>
            <span className="stat-period">Membership expired</span>
          </div>
          <div className="stat-value">{reportData?.members?.expired || 0}</div>
          <div className="stat-trend negative">Needs renewal</div>
        </div>
      </div>

      <div className="distribution-card">
        <h3>Membership Distribution</h3>
        <div className="distribution-stats">
          <div className="distribution-item">
            <div className="distribution-label">
              <span className="dot gym"></span>
              <span>💪 GYM (₹800)</span>
              <span className="distribution-value">{reportData?.members?.byMembership?.gym || 0}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill gym" 
                style={{ 
                  width: `${reportData?.members?.total > 0 
                    ? ((reportData.members.byMembership.gym / reportData.members.total) * 100) 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="distribution-item">
            <div className="distribution-label">
              <span className="dot cardio"></span>
              <span>❤️ CARDIO (₹1000)</span>
              <span className="distribution-value">{reportData?.members?.byMembership?.cardio || 0}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill cardio" 
                style={{ 
                  width: `${reportData?.members?.total > 0 
                    ? ((reportData.members.byMembership.cardio / reportData.members.total) * 100) 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>
          
          <div className="distribution-item">
            <div className="distribution-label">
              <span className="dot pt"></span>
              <span>🎯 PERSONAL TRAINER (₹3100)</span>
              <span className="distribution-value">{reportData?.members?.byMembership?.pt || 0}</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill pt" 
                style={{ 
                  width: `${reportData?.members?.total > 0 
                    ? ((reportData.members.byMembership.pt / reportData.members.total) * 100) 
                    : 0}%` 
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="members-table-container">
        <h3>All Members List (Sorted by User ID: 1, 2, 3...)</h3>
        <div className="table-wrapper">
          <table className="members-report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Membership</th>
                <th>Join Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.members?.allMembers?.map((member, idx) => (
                <tr key={idx}>
                  <td className="serial-number">{idx + 1}</td>
                  <td>{member.user_id || 'N/A'}</td>
                  <td>{member.full_name || 'N/A'}</td>
                  <td>{member.phone || 'N/A'}</td>
                  <td>{member.membership_display || getMembershipDisplay(member)}</td>
                  <td>{new Date(member.join_date).toLocaleDateString()}</td>
                  <td>{member.expiry_date ? new Date(member.expiry_date).toLocaleDateString() : 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${member.calculated_status?.class}`}>
                      {member.calculated_status?.icon} {member.calculated_status?.label}
                    </span>
                  </td>
                  <td>₹{(parseFloat(member.paid_amount) || 0).toLocaleString()}</td>
                </tr>
              ))}
              {(!reportData?.members?.allMembers || reportData.members.allMembers.length === 0) && (
                <tr>
                  <td colSpan="9" className="no-data">No members found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {reportData?.members?.allMembers?.length > 0 && (
          <div className="table-footer">
            Showing {reportData.members.allMembers.length} members in sequential order
          </div>
        )}
      </div>
    </>
  );

  // Render Revenue Report
  const renderRevenueReport = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-period">Collected</span>
          </div>
          <div className="stat-value">₹{reportData?.revenue?.total?.toLocaleString() || 0}</div>
          <div className="stat-trend positive">Amount collected</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Expected Revenue</span>
            <span className="stat-period">Total fees</span>
          </div>
          <div className="stat-value">₹{reportData?.revenue?.expected?.toLocaleString() || 0}</div>
          <div className="stat-trend">Expected amount</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Pending Revenue</span>
            <span className="stat-period">To be collected</span>
          </div>
          <div className="stat-value">₹{reportData?.revenue?.pending?.toLocaleString() || 0}</div>
          <div className="stat-trend warning">Pending amount</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">Collection Rate</span>
            <span className="stat-period">Success rate</span>
          </div>
          <div className="stat-value">{reportData?.revenue?.collectionRate || 0}%</div>
          <div className="stat-trend positive">Collection efficiency</div>
        </div>
      </div>

      <div className="method-breakdown">
        <h3>Payment Method Breakdown</h3>
        <div className="method-stats">
          <div className="method-item">
            <div className="method-info">
              <span className="method-name cash">💵 Cash</span>
              <span className="method-percent">
                {reportData?.members?.total > 0 
                  ? ((reportData.paymentMethods.Cash / reportData.members.total) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill cash" 
                style={{ 
                  width: `${reportData?.members?.total > 0 
                    ? (reportData.paymentMethods.Cash / reportData.members.total) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
            <div className="method-amount">{reportData?.paymentMethods?.Cash || 0} members</div>
          </div>
          
          <div className="method-item">
            <div className="method-info">
              <span className="method-name upi">📱 UPI</span>
              <span className="method-percent">
                {reportData?.members?.total > 0 
                  ? ((reportData.paymentMethods.UPI / reportData.members.total) * 100).toFixed(1) 
                  : 0}%
              </span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill upi" 
                style={{ 
                  width: `${reportData?.members?.total > 0 
                    ? (reportData.paymentMethods.UPI / reportData.members.total) * 100 
                    : 0}%` 
                }}
              ></div>
            </div>
            <div className="method-amount">{reportData?.paymentMethods?.UPI || 0} members</div>
          </div>
        </div>
      </div>
    </>
  );

  // Render Expiring Report
  const renderExpiringReport = () => (
    <>
      <div className="stats-grid">
        <div className="stat-card warning-card">
          <div className="stat-header">
            <span className="stat-label">Expiring Soon</span>
            <span className="stat-period">Next 30 days</span>
          </div>
          <div className="stat-value">{reportData?.expiringSoon?.length || 0}</div>
          <div className="stat-trend warning">Need renewal follow-up</div>
        </div>
      </div>

      <div className="expiring-members-table">
        <h3>Members Expiring in Next 30 Days</h3>
        <div className="table-wrapper">
          <table className="members-report-table">
            <thead>
              <tr>
                <th>#</th>
                <th>User ID</th>
                <th>Name</th>
                <th>Mobile</th>
                <th>Membership</th>
                <th>Expiry Date</th>
                <th>Days Left</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {reportData?.expiringSoon?.map((member, idx) => {
                const daysLeft = Math.ceil((new Date(member.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                return (
                  <tr key={idx} className={daysLeft <= 7 ? 'urgent-row' : ''}>
                    <td className="serial-number">{idx + 1}</td>
                    <td>{member.user_id || 'N/A'}</td>
                    <td>{member.full_name || 'N/A'}</td>
                    <td>{member.phone || 'N/A'}</td>
                    <td>{member.membership_display || getMembershipDisplay(member)}</td>
                    <td>{new Date(member.expiry_date).toLocaleDateString()}</td>
                    <td className={daysLeft <= 7 ? 'urgent-text' : ''}>{daysLeft} days</td>
                    <td>
                      <span className={`status-badge ${member.calculated_status?.class}`}>
                        {member.calculated_status?.icon} {member.calculated_status?.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {(!reportData?.expiringSoon || reportData.expiringSoon.length === 0) && (
                <tr>
                  <td colSpan="8" className="no-data">No members expiring in the next 30 days</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div className="header-title">
          <h1 className="page-title">Reports & Analytics</h1>
          <p className="page-subtitle">Comprehensive member insights and performance metrics</p>
        </div>
        <div className="export-buttons">
          <button className="export-btn excel" onClick={handleExport} disabled={exporting}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h4"/>
            </svg>
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
        </div>
      </div>

      <div className="report-nav">
        <button className={`nav-btn ${reportType === 'members' ? 'active' : ''}`} onClick={() => setReportType('members')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
          </svg>
          Members Report
        </button>
        <button className={`nav-btn ${reportType === 'revenue' ? 'active' : ''}`} onClick={() => setReportType('revenue')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
          </svg>
          Revenue Report
        </button>
        <button className={`nav-btn ${reportType === 'expiring' ? 'active' : ''}`} onClick={() => setReportType('expiring')}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Expiring Members
        </button>
      </div>

      <div className="date-range-picker">
        <div className="date-inputs">
          <div className="input-group">
            <label>Start Date</label>
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} 
              className="date-input" 
            />
          </div>
          <div className="input-group">
            <label>End Date</label>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} 
              className="date-input" 
            />
          </div>
        </div>
        <div className="quick-ranges">
          <button className="range-btn" onClick={() => {
            const today = new Date();
            const lastMonth = new Date(today);
            lastMonth.setMonth(today.getMonth() - 1);
            setDateRange({ start: lastMonth.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
          }}>Last 30 Days</button>
          <button className="range-btn" onClick={() => {
            const today = new Date();
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            setDateRange({ start: thisMonth.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
          }}>This Month</button>
          <button className="range-btn" onClick={() => {
            const today = new Date();
            const startOfYear = new Date(today.getFullYear(), 0, 1);
            setDateRange({ start: startOfYear.toISOString().split('T')[0], end: today.toISOString().split('T')[0] });
          }}>This Year</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Generating report...</p>
        </div>
      ) : (
        <div className="report-content">
          {reportType === 'members' && renderMembersReport()}
          {reportType === 'revenue' && renderRevenueReport()}
          {reportType === 'expiring' && renderExpiringReport()}
        </div>
      )}
    </div>
  );
}