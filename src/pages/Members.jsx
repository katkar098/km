import React, { useEffect, useState } from "react";
import { getMembers, updateMember, deleteMember } from "../services/memberService";
import "./Members.css";

export default function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState("both");
  const [filterStatus, setFilterStatus] = useState("all");
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({ 
    full_name: "", 
    phone: "", 
    membership_category: "",
    status: "",
    expiry_date: "",
    discount: false,
    paid_amount: "",
    remaining_amount: "",
    total_fee: "",
    payment_method: "Cash"
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [updating, setUpdating] = useState(false);

  const DISCOUNT_AMOUNT = 100;

  // Simplified Membership Categories with fixed prices
  const membershipCategories = {
    gym: {
      name: "GYM",
      price: 800,
      duration: "1 Month",
      displayName: "💪 GYM Member"
    },
    cardio: {
      name: "CARDIO",
      price: 1000,
      duration: "1 Month",
      displayName: "❤️ CARDIO Member"
    },
    pt: {
      name: "PERSONAL TRAINER",
      price: 3100,
      duration: "1 Month",
      displayName: "🎯 PERSONAL TRAINER"
    }
  };

  // Helper function to get category from membership type string
  const getCategoryFromType = (membershipType) => {
    if (!membershipType) return "gym";
    if (membershipType.includes("CARDIO")) return "cardio";
    if (membershipType.includes("PERSONAL") || membershipType.includes("TRAINER")) return "pt";
    return "gym";
  };

  // =========================
  // FETCH MEMBERS FROM DATABASE
  // =========================
  const fetchMembers = async () => {
    setLoading(true);

    try {
      const res = await getMembers();

      console.log("API RESPONSE:", res);

      let membersArray = [];
      
      if (res?.data?.data && Array.isArray(res.data.data)) {
        membersArray = res.data.data;
      } else if (res?.data && Array.isArray(res.data)) {
        membersArray = res.data;
      } else if (res?.data?.recordset && Array.isArray(res.data.recordset)) {
        membersArray = res.data.recordset;
      }
      
      if (membersArray.length > 0) {
        membersArray = [...membersArray].sort((a, b) => {
          const userIdA = a.user_id || "";
          const userIdB = b.user_id || "";
          
          const numA = parseInt(userIdA.match(/\d+/)?.[0] || 0);
          const numB = parseInt(userIdB.match(/\d+/)?.[0] || 0);
          return numA - numB;
        });
      }
      
      const today = new Date();
      const defaultExpiryDate = new Date(today);
      defaultExpiryDate.setDate(today.getDate() + 7);
      
      membersArray = membersArray.map((m) => {
        // Determine membership category - prioritize membership_category, then derive from membership_type
        let membershipCategory = m.membership_category;
        if (!membershipCategory && m.membership_type) {
          membershipCategory = getCategoryFromType(m.membership_type);
        }
        if (!membershipCategory) {
          membershipCategory = "gym";
        }
        
        return {
          ...m,
          expiry_date: m.expiry_date || defaultExpiryDate.toISOString().split('T')[0],
          payment_status: m.payment_status || "Active",
          discount_applied: m.discount_applied || false,
          membership_category: membershipCategory,
          paid_amount: m.paid_amount || 0,
          remaining_amount: m.remaining_amount || (m.total_fee || 0),
          total_fee: m.total_fee || 0,
          payment_method: m.payment_method || "Cash",
          calculated_status: calculateMemberStatus({
            ...m,
            membership_category: membershipCategory
          })
        };
      });
      
      setMembers(membersArray);

    } catch (error) {
      console.log("ERROR fetching members:", error);
      setMembers([]);
    } finally {
      setLoading(false);
    }
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

  const getDefaultExpiryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString().split('T')[0];
  };

  const getExpiryFromMembership = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 1); // All memberships are 1 month
    return date.toISOString().split('T')[0];
  };

  const getPriceForMembership = (category) => {
    if (!category) return 0;
    return membershipCategories[category]?.price || 0;
  };

  const getDisplayNameForMembership = (category) => {
    if (!category) return "💪 GYM Member";
    return membershipCategories[category]?.displayName || "💪 GYM Member";
  };

  // Calculate final price after discount
  const getFinalPrice = (category, hasDiscount) => {
    let originalPrice = getPriceForMembership(category);
    if (hasDiscount && originalPrice > 0) {
      return Math.max(0, originalPrice - DISCOUNT_AMOUNT);
    }
    return originalPrice;
  };

  const generateNextUserId = () => {
    if (members.length === 0) return "GYM001";
    
    const numbers = members.map(m => {
      const userId = m.user_id || "";
      const match = userId.match(/GYM(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    
    const maxNumber = Math.max(...numbers, 0);
    const nextNumber = maxNumber + 1;
    return `GYM${String(nextNumber).padStart(3, '0')}`;
  };

  const handleEditClick = (member) => {
    const hasDiscount = member.discount_applied || false;
    const originalPrice = getPriceForMembership(member.membership_category);
    const finalPrice = hasDiscount ? Math.max(0, originalPrice - DISCOUNT_AMOUNT) : originalPrice;
    
    setEditingMember(member);
    setEditForm({
      full_name: member.full_name || "",
      phone: member.phone || "",
      membership_category: member.membership_category || "gym",
      status: member.payment_status === "Partial" ? "Partial" : "Active",
      expiry_date: member.expiry_date || getDefaultExpiryDate(),
      discount: hasDiscount,
      paid_amount: member.paid_amount || 0,
      remaining_amount: member.remaining_amount || (finalPrice - (member.paid_amount || 0)),
      total_fee: finalPrice,
      payment_method: member.payment_method || "Cash"
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === "membership_category") {
      const newExpiry = getExpiryFromMembership();
      const originalPrice = getPriceForMembership(value);
      const hasDiscount = editForm.discount;
      const finalPrice = hasDiscount ? Math.max(0, originalPrice - DISCOUNT_AMOUNT) : originalPrice;
      
      setEditForm(prev => ({ 
        ...prev, 
        [name]: value,
        expiry_date: newExpiry,
        total_fee: finalPrice,
        paid_amount: 0,
        remaining_amount: finalPrice
      }));
    } else if (name === "discount" && type === "checkbox") {
      const originalPrice = getPriceForMembership(editForm.membership_category);
      const newDiscount = checked;
      const finalPrice = newDiscount ? Math.max(0, originalPrice - DISCOUNT_AMOUNT) : originalPrice;
      const paidAmount = parseFloat(editForm.paid_amount) || 0;
      const remainingAmount = Math.max(0, finalPrice - paidAmount);
      
      setEditForm(prev => ({ 
        ...prev, 
        discount: newDiscount,
        total_fee: finalPrice,
        remaining_amount: remainingAmount
      }));
    } else if (name === "paid_amount") {
      const paid = parseFloat(value) || 0;
      const total = parseFloat(editForm.total_fee) || 0;
      const remaining = Math.max(0, total - paid);
      setEditForm(prev => ({ 
        ...prev, 
        paid_amount: paid,
        remaining_amount: remaining
      }));
    } else if (name === "status") {
      setEditForm(prev => ({ ...prev, [name]: value }));
    } else {
      setEditForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveEdit = async () => {
    if (!editForm.full_name.trim()) {
      alert("Name is required");
      return;
    }
    
    if (!editForm.membership_category) {
      alert("Please select a membership type");
      return;
    }
    
    setUpdating(true);
    
    try {
      const finalTotal = editForm.total_fee;
      const paidAmount = parseFloat(editForm.paid_amount) || 0;
      const remainingAmount = finalTotal - paidAmount;
      
      let paymentStatus = "Active";
      if (remainingAmount > 0) {
        paymentStatus = "Partial";
      }
      if (editForm.status === "Expired") {
        paymentStatus = "Expired";
      }
      
      // Get the display name for the membership
      const membershipDisplayName = getDisplayNameForMembership(editForm.membership_category);
      
      const updateData = {
        full_name: editForm.full_name,
        phone: editForm.phone,
        membership_category: editForm.membership_category,
        membership_type: membershipDisplayName,
        payment_status: paymentStatus,
        expiry_date: editForm.expiry_date || getExpiryFromMembership(),
        total_fee: finalTotal,
        paid_amount: paidAmount,
        remaining_amount: remainingAmount,
        discount_applied: editForm.discount,
        payment_method: editForm.payment_method
      };
      
      console.log("Saving update data:", updateData);
      
      const memberId = editingMember?.member_id || editingMember?.id;
      if (!memberId) {
        alert("Invalid member ID");
        return;
      }
      
      const response = await updateMember(memberId, updateData);
      
      if (response?.success) {
        await fetchMembers();
        setShowEditModal(false);
        setEditingMember(null);
        alert(`${membershipDisplayName} updated successfully! ${editForm.discount ? `₹${DISCOUNT_AMOUNT} discount applied.` : ""}`);
      } else {
        alert("Error updating member: " + (response?.error || "Unknown error"));
      }
      
    } catch (error) {
      console.error("Update error:", error);
      alert("Error updating member. Please try again.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMember = async (member) => {
    const memberName = member?.full_name || "this member";
    if (window.confirm(`Are you sure you want to delete ${memberName}? This action cannot be undone.`)) {
      try {
        const memberId = member?.member_id || member?.id;
        if (!memberId) {
          alert("Invalid member ID");
          return;
        }
        
        const response = await deleteMember(memberId);
        
        if (response?.success) {
          await fetchMembers();
          alert("Member deleted successfully!");
        } else {
          alert("Error deleting member: " + (response?.error || "Unknown error"));
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("Error deleting member. Please try again.");
      }
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const filtered = members.filter((m) => {
    let matchesSearch = true;
    const searchLower = searchTerm.toLowerCase();
    
    if (searchTerm) {
      const name = (m.full_name || "").toLowerCase();
      const userId = (m.user_id || "").toLowerCase();
      
      if (searchType === "name") {
        matchesSearch = name.includes(searchLower);
      } else if (searchType === "id") {
        matchesSearch = userId.includes(searchLower);
      } else {
        matchesSearch = name.includes(searchLower) || userId.includes(searchLower);
      }
    }
    
    const status = (m.calculated_status?.status || m.payment_status || "").toLowerCase();
    const matchesStatus = filterStatus === "all" || status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: members.length,
    active: members.filter(m => m.calculated_status?.status === "active").length,
    partial: members.filter(m => m.calculated_status?.status === "partial").length,
    expired: members.filter(m => m.calculated_status?.status === "expired").length,
    expiringSoon: members.filter(m => {
      if (!m.expiry_date) return false;
      const daysLeft = Math.ceil((new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7 && daysLeft > 0;
    }).length
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return "N/A";
    }
  };

  // FIXED: Get membership display name correctly
  const getMembershipDisplay = (member) => {
    // First check membership_category
    if (member.membership_category === "cardio") return "❤️ CARDIO Member";
    if (member.membership_category === "pt") return "🎯 PERSONAL TRAINER";
    if (member.membership_category === "gym") return "💪 GYM Member";
    
    // Then check membership_type if category is not set
    if (member.membership_type) return member.membership_type;
    
    // Default fallback
    return "💪 GYM Member";
  };

  const getStatusDisplay = (member) => {
    const status = member.calculated_status || calculateMemberStatus(member);
    return status;
  };

  const getCurrentOriginalPrice = () => {
    return getPriceForMembership(editForm.membership_category);
  };

  const getCurrentFinalPrice = () => {
    return editForm.total_fee;
  };

  const getSelectedCategoryInfo = () => {
    if (!editForm.membership_category) return null;
    return membershipCategories[editForm.membership_category];
  };

  const categoryInfo = getSelectedCategoryInfo();

  return (
    <div className="members-container">
      {/* Header */}
      <div className="members-header">
        <div className="header-left">
          <h1 className="page-title">Member Management</h1>
          <p className="page-subtitle">Manage and track all gym members</p>
        </div>
        <div className="header-right">
          <div className="next-id-badge">
            <span className="next-id-label">Next User ID:</span>
            <span className="next-id-value">{generateNextUserId()}</span>
          </div>
          <button className="refresh-btn" onClick={fetchMembers}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Members</span>
          </div>
        </div>
        <div className="stat-card active-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active</span>
          </div>
        </div>
        <div className="stat-card partial-card">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="stat-value">{stats.partial}</span>
            <span className="stat-label">Partially Paid</span>
          </div>
        </div>
        <div className="stat-card expired-card">
          <div className="stat-icon">❌</div>
          <div className="stat-info">
            <span className="stat-value">{stats.expired}</span>
            <span className="stat-label">Expired</span>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="search-filter-bar">
        <div className="search-type-selector">
          <button className={`search-type-btn ${searchType === "both" ? "active" : ""}`} onClick={() => setSearchType("both")}>Name / ID</button>
          <button className={`search-type-btn ${searchType === "name" ? "active" : ""}`} onClick={() => setSearchType("name")}>Name Only</button>
          <button className={`search-type-btn ${searchType === "id" ? "active" : ""}`} onClick={() => setSearchType("id")}>ID Only</button>
        </div>
        
        <div className="search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder={searchType === "name" ? "Search by member name..." : searchType === "id" ? "Search by User ID..." : "Search by name or User ID..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button className="clear-search" onClick={() => setSearchTerm("")}>×</button>}
        </div>

        <div className="filter-buttons">
          <button className={`filter-btn ${filterStatus === "all" ? "active" : ""}`} onClick={() => setFilterStatus("all")}>All Members</button>
          <button className={`filter-btn active-filter ${filterStatus === "active" ? "active" : ""}`} onClick={() => setFilterStatus("active")}><span className="dot green"></span>Active</button>
          <button className={`filter-btn partial-filter ${filterStatus === "partial" ? "active" : ""}`} onClick={() => setFilterStatus("partial")}><span className="dot orange"></span>Partially Paid</button>
          <button className={`filter-btn expired-filter ${filterStatus === "expired" ? "active" : ""}`} onClick={() => setFilterStatus("expired")}><span className="dot red"></span>Expired</button>
        </div>
      </div>

      {/* Members Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading members...</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="members-table compact">
              <thead>
                <tr>
                  <th>User ID</th>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Membership</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((m, index) => {
                    const expiryDate = m.expiry_date ? formatDate(m.expiry_date) : formatDate(getDefaultExpiryDate());
                    let daysLeft = 0;
                    if (m.expiry_date) {
                      daysLeft = Math.ceil((new Date(m.expiry_date) - new Date()) / (1000 * 60 * 60 * 24));
                    }
                    const membershipDisplay = getMembershipDisplay(m);
                    const displayUserId = m.user_id || "N/A";
                    const statusDisplay = getStatusDisplay(m);
                    
                    return (
                      <tr key={m.member_id || m.id || m.user_id || index}>
                        <td className="user-id-cell"><span className="user-id-badge">{displayUserId}</span></td>
                        <td className="member-cell">
                          <div className="member-info">
                            <div className="member-avatar" style={{ backgroundColor: statusDisplay.status === "active" ? "#28a745" : statusDisplay.status === "partial" ? "#fd7e14" : "#dc3545" }}>
                              {m.full_name?.charAt(0)?.toUpperCase() || "M"}
                            </div>
                            <div className="member-details">
                              <span className="member-name">{m.full_name || "N/A"}</span>
                              {m.email && <span className="member-email">{m.email}</span>}
                            </div>
                          </div>
                        </td>
                        <td>{m.phone || "N/A"}</td>
                        <td className="membership-cell">
                          <span className={`membership-badge ${m.membership_category === "cardio" ? "cardio-badge" : m.membership_category === "pt" ? "pt-badge" : "gym-badge"}`}>
                            {membershipDisplay}
                          </span>
                        </td>
                        <td className="expiry-cell">
                          <div className="expiry-wrapper">
                            <span className="expiry-date">{expiryDate}</span>
                            {daysLeft <= 7 && daysLeft > 0 && statusDisplay.status === "active" && (
                              <span className={`days-left ${daysLeft <= 3 ? "urgent" : ""}`}>{daysLeft} days left</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${statusDisplay.class}`}>
                            {statusDisplay.icon} {statusDisplay.label}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button className="edit-btn" onClick={() => handleEditClick(m)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4L18.5 2.5z" />
                              </svg>
                              Edit
                            </button>
                            <button className="delete-btn" onClick={() => handleDeleteMember(m)}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="7" className="no-data">
                      <div className="no-data-content">
                        <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p>No members found</p>
                        <span className="no-data-hint">Try adjusting your search</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="table-info">Showing {filtered.length} members</div>
        </>
      )}

      {/* Edit Modal with Simplified Membership Options */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Member</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="edit-form-scroll">
                <div className="form-group">
                  <label>User ID (Cannot be changed)</label>
                  <input type="text" value={editingMember?.user_id || "N/A"} className="form-input" disabled />
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="full_name" value={editForm.full_name} onChange={handleEditChange} className="form-input" />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input type="tel" name="phone" value={editForm.phone} onChange={handleEditChange} className="form-input" />
                </div>

                {/* Membership Category Selection - Only 3 options */}
                <div className="form-group">
                  <label>Membership Type</label>
                  <div className="category-buttons">
                    <button 
                      type="button"
                      className={`category-option ${editForm.membership_category === "gym" ? "active" : ""}`}
                      onClick={() => handleEditChange({ target: { name: "membership_category", value: "gym" } })}
                    >
                      💪 GYM
                      <span className="category-price">₹{membershipCategories.gym.price}</span>
                    </button>
                    <button 
                      type="button"
                      className={`category-option ${editForm.membership_category === "cardio" ? "active" : ""}`}
                      onClick={() => handleEditChange({ target: { name: "membership_category", value: "cardio" } })}
                    >
                      ❤️ CARDIO
                      <span className="category-price">₹{membershipCategories.cardio.price}</span>
                    </button>
                    <button 
                      type="button"
                      className={`category-option ${editForm.membership_category === "pt" ? "active" : ""}`}
                      onClick={() => handleEditChange({ target: { name: "membership_category", value: "pt" } })}
                    >
                      🎯 PT
                      <span className="category-price">₹{membershipCategories.pt.price}</span>
                    </button>
                  </div>
                  <small className="form-hint">All memberships are for 1 month duration</small>
                </div>

                {/* Selected Category Info */}
                {categoryInfo && (
                  <div className="selected-category-info">
                    <div className={`category-badge ${editForm.membership_category}`}>
                      {categoryInfo.displayName}
                    </div>
                  </div>
                )}

                {/* Status Options */}
                <div className="form-group">
                  <label>Payment Status</label>
                  <select name="status" value={editForm.status} onChange={handleEditChange} className="form-input">
                    <option value="Active">✅ Active - Full Payment</option>
                    <option value="Partial">💰 Partially Paid</option>
                    <option value="Expired">❌ Expired</option>
                  </select>
                </div>

                {/* Payment Details */}
                {editForm.membership_category && (
                  <div className="payment-details">
                    <div className="price-preview">
                      <div className="price-row">
                        <span>Membership Fee:</span>
                        <span>₹{getCurrentOriginalPrice()}</span>
                      </div>
                      {editForm.discount && (
                        <div className="price-row discount">
                          <span>Discount (₹{DISCOUNT_AMOUNT}):</span>
                          <span>-₹{DISCOUNT_AMOUNT}</span>
                        </div>
                      )}
                      <div className="price-row total">
                        <span>Total Amount:</span>
                        <span className="final-price">₹{getCurrentFinalPrice()}</span>
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label>Paid Amount (₹)</label>
                        <input 
                          type="number" 
                          name="paid_amount" 
                          value={editForm.paid_amount} 
                          onChange={handleEditChange} 
                          className="form-input" 
                          step="0.01"
                          placeholder="Enter paid amount"
                        />
                      </div>
                      <div className="form-group">
                        <label>Remaining Amount (₹)</label>
                        <input 
                          type="number" 
                          value={editForm.remaining_amount} 
                          className="form-input remaining-amount" 
                          disabled 
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method Selection - Cash or UPI */}
                <div className="form-group">
                  <label>Payment Method</label>
                  <div className="payment-method-buttons">
                    <button 
                      type="button"
                      className={`payment-method-btn ${editForm.payment_method === "Cash" ? "active" : ""}`}
                      onClick={() => setEditForm(prev => ({ ...prev, payment_method: "Cash" }))}
                    >
                      💵 Cash
                    </button>
                    <button 
                      type="button"
                      className={`payment-method-btn ${editForm.payment_method === "UPI" ? "active" : ""}`}
                      onClick={() => setEditForm(prev => ({ ...prev, payment_method: "UPI" }))}
                    >
                      📱 UPI
                    </button>
                  </div>
                </div>

                {/* Discount Checkbox */}
                <div className="form-group discount-checkbox">
                  <label className="checkbox-label">
                    <input 
                      type="checkbox" 
                      name="discount" 
                      checked={editForm.discount} 
                      onChange={handleEditChange} 
                    />
                    <span className="checkbox-text">Apply ₹{DISCOUNT_AMOUNT} Special Discount</span>
                  </label>
                  <small className="form-hint">Discount will reduce total fee by ₹{DISCOUNT_AMOUNT}</small>
                </div>

                <div className="form-group">
                  <label>Expiry Date</label>
                  <input type="date" name="expiry_date" value={editForm.expiry_date} onChange={handleEditChange} className="form-input" />
                  <small className="form-hint">Auto-updates to 1 month from selected date</small>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)} disabled={updating}>Cancel</button>
              <button className="btn-save" onClick={handleSaveEdit} disabled={updating}>
                {updating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}