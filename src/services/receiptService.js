// src/services/receiptService.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Generate Membership Receipt
export const generateMembershipReceipt = (memberData, paymentData, type = 'new') => {
  const doc = new jsPDF();
  const currentDate = new Date();
  
  // Colors
  const primaryColor = [139, 0, 0]; // Dark Red
  const secondaryColor = [100, 100, 100];
  
  // Header with Logo
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 40, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('KM FITNESS CLUB', 105, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text('Gym Management System', 105, 30, { align: 'center' });
  
  // Receipt Title
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(type === 'new' ? 'MEMBERSHIP RECEIPT' : 'RENEWAL RECEIPT', 105, 55, { align: 'center' });
  
  // Receipt Details
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 65, 190, 65);
  
  // Receipt Number and Date
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Receipt No: RCPT-${Date.now()}`, 20, 75);
  doc.text(`Date: ${currentDate.toLocaleDateString()}`, 150, 75);
  doc.text(`Time: ${currentDate.toLocaleTimeString()}`, 150, 82);
  
  // Member Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MEMBER DETAILS', 20, 95);
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(20, 98, 190, 98);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  
  const memberDetails = [
    ['Member Name:', memberData.full_name || memberData.name],
    ['Member ID:', memberData.user_id || memberData.member_id],
    ['Phone:', memberData.phone],
    ['Email:', memberData.email || 'N/A'],
    ['Address:', memberData.address || 'N/A']
  ];
  
  let yPos = 108;
  memberDetails.forEach(detail => {
    doc.text(detail[0], 20, yPos);
    doc.text(detail[1], 80, yPos);
    yPos += 7;
  });
  
  // Membership Details Section
  yPos += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('MEMBERSHIP DETAILS', 20, yPos);
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(20, yPos + 3, 190, yPos + 3);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  yPos += 13;
  
  const membershipDetails = [
    ['Membership Type:', paymentData.membership_type || memberData.membership_type],
    ['Plan:', paymentData.plan_name || 'Standard'],
    ['Start Date:', memberData.join_date || paymentData.start_date],
    ['Expiry Date:', memberData.expiry_date || paymentData.expiry_date]
  ];
  
  membershipDetails.forEach(detail => {
    doc.text(detail[0], 20, yPos);
    doc.text(detail[1], 80, yPos);
    yPos += 7;
  });
  
  // Payment Summary Section
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('PAYMENT SUMMARY', 20, yPos);
  
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(20, yPos + 3, 190, yPos + 3);
  
  // Payment Table
  const paymentTableData = [
    ['Description', 'Amount (₹)'],
    [`${paymentData.membership_type || memberData.membership_type} Membership Fee`, paymentData.amount || memberData.paid_amount],
  ];
  
  if (paymentData.discount && paymentData.discount > 0) {
    paymentTableData.push(['Discount', `-${paymentData.discount}`]);
  }
  
  paymentTableData.push(['Total Amount', paymentData.total_amount || paymentData.amount]);
  
  doc.autoTable({
    startY: yPos + 8,
    head: [paymentTableData[0]],
    body: paymentTableData.slice(1),
    theme: 'striped',
    headStyles: { fillColor: primaryColor, textColor: [255, 255, 255], fontSize: 10 },
    bodyStyles: { fontSize: 10 },
    columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'right' } },
    margin: { left: 20 }
  });
  
  let finalY = doc.lastAutoTable.finalY + 10;
  
  // Payment Method
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Payment Method: ${paymentData.payment_method || memberData.payment_method || 'Cash'}`, 20, finalY);
  finalY += 7;
  doc.text(`Payment Status: ${paymentData.payment_status || 'Completed'}`, 20, finalY);
  
  // Footer
  finalY += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, finalY, 190, finalY);
  
  doc.setFontSize(8);
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text('Thank you for choosing KM FITNESS CLUB!', 105, finalY + 8, { align: 'center' });
  doc.text('This is a computer generated receipt. No signature required.', 105, finalY + 13, { align: 'center' });
  doc.text(`Generated on: ${currentDate.toLocaleString()}`, 105, finalY + 18, { align: 'center' });
  
  // Save PDF
  const filename = `${type === 'new' ? 'Membership' : 'Renewal'}_Receipt_${memberData.full_name || memberData.name}_${Date.now()}.pdf`;
  doc.save(filename);
  
  return filename;
};

// Generate Simple Receipt (for quick print)
export const generateSimpleReceipt = (memberData, amount, type = 'membership') => {
  const doc = new jsPDF();
  const primaryColor = [139, 0, 0];
  
  // Simple Receipt Design
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, 210, 50, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEIPT', 105, 30, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 150, 65);
  doc.text(`Time: ${new Date().toLocaleTimeString()}`, 150, 72);
  
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('KM FITNESS CLUB', 105, 90, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Gym Management System', 105, 98, { align: 'center' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 105, 190, 105);
  
  let yPos = 115;
  doc.text(`Member Name: ${memberData.full_name || memberData.name}`, 20, yPos);
  yPos += 8;
  doc.text(`Member ID: ${memberData.user_id || memberData.member_id}`, 20, yPos);
  yPos += 8;
  doc.text(`Membership Type: ${memberData.membership_type}`, 20, yPos);
  yPos += 8;
  doc.text(`Amount Paid: ₹${amount}`, 20, yPos);
  yPos += 8;
  doc.text(`Payment Method: ${memberData.payment_method || 'Cash'}`, 20, yPos);
  yPos += 8;
  doc.text(`Expiry Date: ${memberData.expiry_date}`, 20, yPos);
  
  yPos += 20;
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(20, yPos, 190, yPos);
  
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your payment!', 105, yPos + 10, { align: 'center' });
  
  doc.save(`${type}_receipt_${memberData.full_name || memberData.name}.pdf`);
};

export default {
  generateMembershipReceipt,
  generateSimpleReceipt
};