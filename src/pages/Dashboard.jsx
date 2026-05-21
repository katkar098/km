import React, { useEffect, useState } from "react";
import { getMembers } from "../services/memberService";
import "./Dashboard.css";

export default function Dashboard() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState([]);

  const [stats, setStats] = useState({
    active: 0,
    partial: 0,
    expired: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    expiringSoon: 0
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const res = await getMembers();
      const data = res?.data?.data || [];
      setMembers(data);
      calculateStats(data);
      generateRecentActivities(data);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const now = new Date();

    const active = data.filter(m =>
      m.expiry_date && new Date(m.expiry_date) > now
    );

    const partial = data.filter(m =>
      Number(m.remaining_amount || 0) > 0
    );

    const expired = data.filter(m =>
      m.expiry_date && new Date(m.expiry_date) < now
    );

    const totalRevenue = data.reduce(
      (sum, m) => sum + Number(m.paid_amount || 0),
      0
    );

    const last30 = new Date();
    last30.setDate(last30.getDate() - 30);

    const monthlyRevenue = data
      .filter(m => m.created_at && new Date(m.created_at) > last30)
      .reduce((sum, m) => sum + Number(m.paid_amount || 0), 0);

    const next7 = new Date();
    next7.setDate(next7.getDate() + 7);

    const expiringSoon = data.filter(m =>
      m.expiry_date &&
      new Date(m.expiry_date) > now &&
      new Date(m.expiry_date) <= next7
    ).length;

    setStats({
      active: active.length,
      partial: partial.length,
      expired: expired.length,
      totalRevenue,
      monthlyRevenue,
      expiringSoon
    });
  };

  const generateRecentActivities = (data) => {
    const recent = data
      .filter(m => m.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(m => ({
        id: m.member_id || m.id,
        name: m.full_name,
        action: "joined",
        date: m.created_at,
        amount: m.paid_amount
      }));

    setRecentActivities(recent);
  };

  const safePercent = (value) => {
    if (!members.length) return "0%";
    return `${Math.round((value / members.length) * 100)}%`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount) => {
    return `₹${amount?.toLocaleString() || 0}`;
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Gym Overview & Statistics</p>
        </div>
        <div className="header-date">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card active">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>Active Members</h3>
            <p className="stat-number">{stats.active}</p>
            <span className="stat-percent">{safePercent(stats.active)} of total</span>
          </div>
        </div>

        <div className="stat-card partial">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <h3>Partial Payments</h3>
            <p className="stat-number">{stats.partial}</p>
            <span className="stat-percent">{safePercent(stats.partial)} of total</span>
          </div>
        </div>

        <div className="stat-card expired">
          <div className="stat-icon">❌</div>
          <div className="stat-content">
            <h3>Expired</h3>
            <p className="stat-number">{stats.expired}</p>
            <span className="stat-percent">{safePercent(stats.expired)} of total</span>
          </div>
        </div>

        <div className="stat-card revenue">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Revenue</h3>
            <p className="stat-number">{formatCurrency(stats.totalRevenue)}</p>
            <span className="stat-percent">Lifetime collection</span>
          </div>
        </div>

        <div className="stat-card monthly">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <h3>Monthly Revenue</h3>
            <p className="stat-number">{formatCurrency(stats.monthlyRevenue)}</p>
            <span className="stat-percent">Last 30 days</span>
          </div>
        </div>

        <div className="stat-card expiring">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <h3>Expiring Soon</h3>
            <p className="stat-number">{stats.expiringSoon}</p>
            <span className="stat-percent">Next 7 days</span>
          </div>
        </div>
      </div>

      {/* Distribution Section */}
      <div className="distribution-card">
        <h2>Membership Distribution</h2>
        <div className="distribution-bars">
          <div className="bar-item">
            <div className="bar-label">
              <span>Active Members</span>
              <span>{stats.active} ({safePercent(stats.active)})</span>
            </div>
            <div className="bar-bg">
              <div 
                className="bar-fill active-bar" 
                style={{ width: safePercent(stats.active) }}
              ></div>
            </div>
          </div>

          <div className="bar-item">
            <div className="bar-label">
              <span>Partial Payments</span>
              <span>{stats.partial} ({safePercent(stats.partial)})</span>
            </div>
            <div className="bar-bg">
              <div 
                className="bar-fill partial-bar" 
                style={{ width: safePercent(stats.partial) }}
              ></div>
            </div>
          </div>

          <div className="bar-item">
            <div className="bar-label">
              <span>Expired Members</span>
              <span>{stats.expired} ({safePercent(stats.expired)})</span>
            </div>
            <div className="bar-bg">
              <div 
                className="bar-fill expired-bar" 
                style={{ width: safePercent(stats.expired) }}
              ></div>
            </div>
          </div>
        </div>
        <div className="total-members">
          <span>Total Members</span>
          <strong>{members.length}</strong>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="activities-card">
        <h2>Recent Activities</h2>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading activities...</p>
          </div>
        ) : recentActivities.length > 0 ? (
          <div className="activities-list">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="activity-item">
                <div className="activity-icon">👤</div>
                <div className="activity-details">
                  <span className="activity-name">{activity.name}</span>
                  <span className="activity-action">{activity.action}</span>
                </div>
                <div className="activity-date">{formatDate(activity.date)}</div>
                {activity.amount && (
                  <div className="activity-amount">{formatCurrency(activity.amount)}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-activities">
            <p>No recent activities</p>
          </div>
        )}
      </div>
    </div>
  );
}