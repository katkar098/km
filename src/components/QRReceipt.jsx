import React from "react";
import { QRCodeCanvas } from "qrcode.react";

export default function QRReceipt({ member }) {
  const value = `Name: ${member.full_name} | Amount: ${member.paid_amount}`;

  return (
    <div className="p-4 border rounded-lg">
      <h2 className="font-bold mb-3">QR Receipt</h2>
      <QRCodeCanvas value={value} size={180} />
    </div>
  );
}