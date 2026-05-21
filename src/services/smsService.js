// services/smsService.js
import axios from "axios";

// SMS Mobile API Configuration
const SMS_API_KEY = "e48f7f74045d61e8867c0cce8531a574d0ee96de554af81c"; // Replace with your actual API key
const SMS_SENDER_ID = "KM"; // Your sender ID
const SMS_API_URL = "https://api.smsmobileapi.com/send";

// SMS Templates
export const SMS_TEMPLATES = {
  WELCOME: {
    template: "🎉 Welcome to KM FITNESS CLUB, {name}! Your {membership} membership is active until {expiry}. Stay fit! 💪",
    type: "transactional"
  },
  RENEWAL_CONFIRMATION: {
    template: "✅ Membership Renewed! Dear {name}, your {membership} membership has been renewed until {expiry}. Amount paid: ₹{amount}. Thank you! - KM FITNESS CLUB",
    type: "transactional"
  },
  EXPIRY_WARNING_7: {
    template: "🚨 URGENT: {name}, your membership expires in {days} days on {expiry}! Don't let your fitness journey stop. Renew now: {phone}",
    type: "promotional"
  },
  EXPIRY_WARNING_3: {
    template: "🔴 LAST CHANCE! {name}, your membership expires in {days} days on {expiry}. Renew immediately to avoid interruption. Call {phone}",
    type: "promotional"
  },
  EXPIRY_WARNING_1: {
    template: "⚠️ FINAL REMINDER: {name}, your membership expires TOMORROW ({expiry})! Renew today to continue access. Contact {phone}",
    type: "transactional"
  },
  MEMBERSHIP_EXPIRED: {
    template: "❌ Membership Expired: Dear {name}, your membership has expired on {expiry}. Please renew to regain gym access. Call {phone}",
    type: "transactional"
  },
  PAYMENT_PARTIAL: {
    template: "💰 Payment Reminder: {name}, you have a pending payment of ₹{amount} for your {membership} membership. Please complete payment by {due_date}. Call {phone}",
    type: "transactional"
  },
  PAYMENT_RECEIVED: {
    template: "💰 Payment Received: ₹{amount} received from {name} for {membership} membership. Thank you for your payment!",
    type: "transactional"
  }
};

// Send SMS function
export const sendSMS = async (mobileNumber, message) => {
  try {
    // Clean mobile number (remove special characters, ensure 10 digits)
    const cleanNumber = mobileNumber.toString().replace(/\D/g, '');
    const fullNumber = cleanNumber.startsWith('91') ? cleanNumber : `91${cleanNumber}`;
    
    const response = await axios.post(
      SMS_API_URL,
      {
        to: fullNumber,
        message: message,
        sender_id: SMS_SENDER_ID,
        route: "transactional",
        entity_id: "", // Add your entity ID if required
        template_id: "" // Add your template ID if required
      },
      {
        headers: {
          "X-API-Key": SMS_API_KEY,
          "Content-Type": "application/json"
        },
        timeout: 10000
      }
    );
    
    if (response.data && response.data.status === "success") {
      console.log(`✅ SMS sent successfully to ${mobileNumber}`);
      return { success: true, data: response.data };
    } else {
      throw new Error(response.data?.message || "SMS sending failed");
    }
  } catch (error) {
    console.error(`❌ SMS failed for ${mobileNumber}:`, error.message);
    return { success: false, error: error.message };
  }
};

// Send template-based SMS
export const sendTemplateSMS = async (mobileNumber, templateName, replacements) => {
  try {
    const template = SMS_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }
    
    let message = template.template;
    for (const [key, value] of Object.entries(replacements)) {
      message = message.replace(`{${key}}`, value);
    }
    
    return await sendSMS(mobileNumber, message);
  } catch (error) {
    console.error("Template SMS error:", error.message);
    return { success: false, error: error.message };
  }
};

// Welcome message for new member
export const sendWelcomeSMS = async (member) => {
  return await sendTemplateSMS(member.phone, "WELCOME", {
    name: member.full_name,
    membership: member.membership_type,
    expiry: new Date(member.expiry_date).toLocaleDateString()
  });
};

// Renewal confirmation SMS
export const sendRenewalConfirmationSMS = async (member, renewalDetails) => {
  return await sendTemplateSMS(member.phone, "RENEWAL_CONFIRMATION", {
    name: member.full_name,
    membership: renewalDetails.new_membership_type || member.membership_type,
    expiry: new Date(renewalDetails.new_expiry_date || member.expiry_date).toLocaleDateString(),
    amount: renewalDetails.amount || renewalDetails.paid_amount
  });
};

// Expiry warning SMS based on days left
export const sendExpiryWarningSMS = async (member, daysLeft) => {
  let templateName = "EXPIRY_WARNING_7"; // default
  
  if (daysLeft <= 1) {
    templateName = "EXPIRY_WARNING_1";
  } else if (daysLeft <= 3) {
    templateName = "EXPIRY_WARNING_3";
  } else if (daysLeft <= 7) {
    templateName = "EXPIRY_WARNING_7";
  } else if (daysLeft <= 14) {
    templateName = "EXPIRY_WARNING_14";
  } else if (daysLeft <= 30) {
    templateName = "EXPIRY_WARNING_30";
  }
  
  return await sendTemplateSMS(member.phone, templateName, {
    name: member.full_name,
    days: daysLeft,
    expiry: new Date(member.expiry_date).toLocaleDateString(),
    phone: process.env.REACT_APP_GYM_PHONE || "9876543210"
  });
};

// Membership expired SMS
export const sendExpiredSMS = async (member) => {
  return await sendTemplateSMS(member.phone, "MEMBERSHIP_EXPIRED", {
    name: member.full_name,
    expiry: new Date(member.expiry_date).toLocaleDateString(),
    phone: process.env.REACT_APP_GYM_PHONE || "9876543210"
  });
};

// Partial payment reminder SMS
export const sendPartialPaymentSMS = async (member) => {
  const remainingAmount = member.remaining_amount || (member.total_fee - member.paid_amount);
  return await sendTemplateSMS(member.phone, "PAYMENT_PARTIAL", {
    name: member.full_name,
    amount: remainingAmount,
    membership: member.membership_type,
    due_date: new Date(member.expiry_date).toLocaleDateString(),
    phone: process.env.REACT_APP_GYM_PHONE || "9876543210"
  });
};

// Payment received SMS
export const sendPaymentReceivedSMS = async (member, amount) => {
  return await sendTemplateSMS(member.phone, "PAYMENT_RECEIVED", {
    name: member.full_name,
    amount: amount,
    membership: member.membership_type
  });
};

export default {
  sendSMS,
  sendTemplateSMS,
  sendWelcomeSMS,
  sendRenewalConfirmationSMS,
  sendExpiryWarningSMS,
  sendExpiredSMS,
  sendPartialPaymentSMS,
  sendPaymentReceivedSMS
};