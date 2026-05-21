import {
  sendExpiryWarningSMS,
  sendExpiredSMS,
  sendPartialPaymentSMS
} from "../services/smsService";

// normalize date (fix timezone + time issue)
const getDaysLeft = (expiryDate) => {
  const today = new Date();
  const expiry = new Date(expiryDate);

  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
};

// safe storage
const getSent = () =>
  JSON.parse(localStorage.getItem("sentReminders") || "{}");

const saveSent = (data) =>
  localStorage.setItem("sentReminders", JSON.stringify(data));

export const checkAndSendExpiryReminders = async () => {
  const members = JSON.parse(localStorage.getItem("members") || "[]");
  const sentReminders = getSent();

  console.log(`Checking ${members.length} members...`);

  for (const member of members) {
    if (!member.expiry_date || !member.phone) continue;

    const daysLeft = getDaysLeft(member.expiry_date);

    // stable keys (IMPORTANT FIX)
    const userId = member.user_id || member.id;

    // -----------------------------
    // 1. EXPIRED MEMBERS
    // -----------------------------
    if (daysLeft < 0) {
      const key = `${userId}_expired`;

      if (!sentReminders[key]) {
        const res = await sendExpiredSMS(member);

        if (res.success) {
          sentReminders[key] = Date.now();
          console.log(`❌ Expired SMS sent to ${member.full_name}`);
        }
      }
    }

    // -----------------------------
    // 2. EXPIRY WARNINGS
    // -----------------------------
    const warningDays = [30, 14, 7, 3, 1];

    if (warningDays.includes(daysLeft)) {
      const key = `${userId}_warn_${daysLeft}`;

      if (!sentReminders[key]) {
        const res = await sendExpiryWarningSMS(member, daysLeft);

        if (res.success) {
          sentReminders[key] = Date.now();
          console.log(`⚠️ Warning sent (${daysLeft} days) -> ${member.full_name}`);
        }
      }
    }

    // -----------------------------
    // 3. PARTIAL PAYMENT REMINDER
    // -----------------------------
    const remainingAmount =
      member.remaining_amount || (member.total_fee - member.paid_amount);

    if (remainingAmount > 0 && daysLeft <= 7 && daysLeft > 0) {
      const key = `${userId}_partial_7`;

      if (!sentReminders[key]) {
        const res = await sendPartialPaymentSMS(member);

        if (res.success) {
          sentReminders[key] = Date.now();
          console.log(`💰 Payment reminder sent -> ${member.full_name}`);
        }
      }
    }
  }

  saveSent(sentReminders);
};

// -----------------------------
// AUTO SCHEDULER
// -----------------------------
export const startReminderScheduler = () => {
  console.log("🚀 SMS Reminder Scheduler Started");

  // first run after 5 sec
  setTimeout(checkAndSendExpiryReminders, 5000);

  // run every 1 hour
  setInterval(checkAndSendExpiryReminders, 60 * 60 * 1000);
};

// manual trigger
export const manualTriggerReminders = () => {
  console.log("Manual trigger running...");
  checkAndSendExpiryReminders();
};

export default {
  startReminderScheduler,
  manualTriggerReminders,
  checkAndSendExpiryReminders
};