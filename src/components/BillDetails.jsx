// src/components/BillDetails.jsx
import React from "react";
import { roundTwo } from "../utils";

export function BillDetails({ bill, onClose }) {
  if (!bill) return null;

  const getStatusClass = (status) => {
    switch(status) {
      case 'completed': return 'status-completed';
      case 'in_progress': return 'status-in_progress';
      case 'delayed': return 'status-delayed';
      case 'pending': return 'status-pending';
      case 'None': return 'status-none';
      default: return 'status-none';
    }
  };

  const getStatusText = (status) => {
    if (!status || status === 'None') return 'NONE';
    return status.replace('_', ' ').toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Create a print-friendly version
    const printWindow = window.open('', '_blank');
    const printContent = generatePrintHTML();
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const generatePrintHTML = () => {
    const itemsHTML = bill.items?.map((item, index) => `
      <tr>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; font-size: 11px;">
          ${item.wood_type || '-'}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: center; font-size: 10px;">
          ${item.bill_type || '-'}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: center; font-size: 10px;">
          ${item.length || '0'}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: center; font-size: 10px;">
          ${item.breadth || '0'}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: center; font-size: 10px;">
          ${item.height || '0'}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: center; font-size: 10px;">
          ${item.nos || '0'}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: right; font-size: 10px;">
          ${roundTwo(item.total_units || 0)}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: right; font-size: 10px;">
          ₹${roundTwo(item.unit_price || 0)}
        </td>
        <td style="padding: 6px 4px; border-bottom: 1px dotted #ddd; text-align: right; font-weight: 600; font-size: 11px;">
          ₹${roundTwo(item.total_price || 0)}
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Bill #${bill.bill_no}</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 5mm;
            }
            body {
              margin: 0;
              padding: 0;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            width: 80mm;
            margin: 0 auto;
            padding: 10px;
            font-size: 11px;
            line-height: 1.4;
          }
          
          .header {
            text-align: center;
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 8px 0;
            margin-bottom: 10px;
          }
          
          .store-name {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 2px;
          }
          
          .bill-title {
            font-size: 12px;
            margin-top: 4px;
          }
          
          .separator {
            border-top: 1px dashed #000;
            margin: 8px 0;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin: 3px 0;
            font-size: 10px;
          }
          
          .label {
            font-weight: 600;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
            font-size: 10px;
          }
          
          th {
            background: #f0f0f0;
            padding: 6px 4px;
            text-align: left;
            font-size: 9px;
            font-weight: 600;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
          }
          
          th.center {
            text-align: center;
          }
          
          th.right {
            text-align: right;
          }
          
          .summary {
            margin-top: 10px;
            border-top: 2px solid #000;
            padding-top: 8px;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin: 4px 0;
            font-size: 11px;
          }
          
          .grand-total {
            border-top: 2px solid #000;
            border-bottom: 2px solid #000;
            padding: 8px 0;
            margin-top: 8px;
            font-size: 14px;
            font-weight: bold;
          }
          
          .footer {
            text-align: center;
            margin-top: 15px;
            padding-top: 10px;
            border-top: 1px dashed #000;
            font-size: 10px;
          }
          
          .thank-you {
            font-weight: bold;
            margin-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="store-name">
          Siva Sakthi Sawmill</div>
          <div class="bill-title">ESTIMATE BILL</div>
        </div>
        
        <div class="info-row">
          <span class="label">Bill No:</span>
          <span>#${bill.bill_no}</span>
        </div>
        
        <div class="info-row">
          <span class="label">Date:</span>
          <span>${formatDate(bill.date)}</span>
        </div>
        
        ${bill.customer_name ? `
          <div class="info-row">
            <span class="label">Customer:</span>
            <span>${bill.customer_name}</span>
          </div>
        ` : ''}
        
        ${bill.customer_phone ? `
          <div class="info-row">
            <span class="label">Phone:</span>
            <span>${bill.customer_phone}</span>
          </div>
        ` : ''}
        
        <div class="separator"></div>
        
        <table>
          <thead>
            <tr>
              <th>Wood</th>
              <th class="center">Type</th>
              <th class="center">L</th>
              <th class="center">B</th>
              <th class="center">H</th>
              <th class="center">Nos</th>
              <th class="right">Units</th>
              <th class="right">Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        
        <div class="summary">
          <div class="summary-row">
            <span class="label">Sub Total:</span>
            <span>₹${roundTwo(bill.sub_total || 0)}</span>
          </div>
          
          ${bill.planing_charges > 0 ? `
            <div class="summary-row">
              <span class="label">Planing Charges:</span>
              <span>₹${roundTwo(bill.planing_charges || 0)}</span>
            </div>
          ` : ''}
          
          ${bill.sawing_charges > 0 ? `
            <div class="summary-row">
              <span class="label">Sawing Charges:</span>
              <span>₹${roundTwo(bill.sawing_charges || 0)}</span>
            </div>
          ` : ''}
          
          <div class="summary-row grand-total">
            <span>GRAND TOTAL:</span>
            <span>₹${roundTwo(bill.grand_total || 0)}</span>
          </div>
        </div>
        
        <div class="footer">
          <div>Status: ${getStatusText(bill.status)}</div>
          <div class="thank-you">Thank You! Visit Again</div>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <>
      <div className="bill-modal">
        {/* Header */}
        <div style={{ 
          padding: "24px", 
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
          color: "white"
        }}>
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "flex-start",
            marginBottom: "16px"
          }}>
            <div>
              <h2 style={{ 
                margin: 0, 
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "700"
              }}>
                Estimate Details
              </h2>
              <div style={{ 
                fontSize: "0.875rem", 
                opacity: 0.9,
                marginTop: "4px"
              }}>
                Bill #{bill.bill_no} • {formatDate(bill.date)}
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: "rgba(255,255,255,0.2)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px"
              }}
              onMouseOver={(e) => e.target.style.background = "rgba(255,255,255,0.3)"}
              onMouseOut={(e) => e.target.style.background = "rgba(255,255,255,0.2)"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Close
            </button>
          </div>

          {/* Status Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span className={`status-badge ${getStatusClass(bill.status)}`} style={{ 
              background: "rgba(255,255,255,0.9)",
              fontSize: "0.75rem",
              padding: "4px 12px",
              borderRadius: "12px",
              fontWeight: "600"
            }}>
              {getStatusText(bill.status)}
            </span>
            {bill.customer_name && (
              <span style={{ fontSize: "0.875rem", opacity: 0.9 }}>
                Customer: {bill.customer_name}
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: "24px", maxHeight: "70vh", overflowY: "auto" }}>
          {/* Customer Information */}
          {(bill.customer_name || bill.customer_phone) && (
            <div className="card" style={{ marginBottom: "24px" }}>
              <div className="card-header">
                <h3 style={{ margin: 0, fontSize: "1.125rem" }}>Customer Information</h3>
              </div>
              <div className="card-body">
                <div style={{ 
                  display: "grid", 
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", 
                  gap: "16px" 
                }}>
                  {bill.customer_name && (
                    <div>
                      <label style={{ 
                        display: "block", 
                        fontSize: "0.875rem", 
                        fontWeight: "500", 
                        color: "#6b7280",
                        marginBottom: "4px"
                      }}>
                        Name
                      </label>
                      <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                        {bill.customer_name}
                      </div>
                    </div>
                  )}
                  {bill.customer_phone && (
                    <div>
                      <label style={{ 
                        display: "block", 
                        fontSize: "0.875rem", 
                        fontWeight: "500", 
                        color: "#6b7280",
                        marginBottom: "4px"
                      }}>
                        Phone
                      </label>
                      <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                        {bill.customer_phone}
                      </div>
                    </div>
                  )}
                  <div>
                    <label style={{ 
                      display: "block", 
                      fontSize: "0.875rem", 
                      fontWeight: "500", 
                      color: "#6b7280",
                      marginBottom: "4px"
                    }}>
                      Bill Date
                    </label>
                    <div style={{ fontSize: "1rem", fontWeight: "500" }}>
                      {formatDate(bill.date)}
                    </div>
                  </div>
                  <div>
                    <label style={{ 
                      display: "block", 
                      fontSize: "0.875rem", 
                      fontWeight: "500", 
                      color: "#6b7280",
                      marginBottom: "4px"
                    }}>
                      Status
                    </label>
                    <span className={`status-badge ${getStatusClass(bill.status)}`}>
                      {getStatusText(bill.status)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table */}
          <div className="card" style={{ marginBottom: "24px" }}>
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: "1.125rem" }}>Items</h3>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                {bill.items?.length || 0} item{(bill.items?.length || 0) !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>Wood Type</th>
                      <th style={{ padding: "12px", textAlign: "left", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>Type</th>
                      <th style={{ padding: "12px", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>L</th>
                      <th style={{ padding: "12px", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>B</th>
                      <th style={{ padding: "12px", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>H</th>
                      <th style={{ padding: "12px", textAlign: "center", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>Nos</th>
                      <th style={{ padding: "12px", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>Units</th>
                      <th style={{ padding: "12px", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>Unit Price</th>
                      <th style={{ padding: "12px", textAlign: "right", fontSize: "0.75rem", fontWeight: "600", color: "#374151", textTransform: "uppercase" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.items?.map((item, index) => (
                      <tr key={index} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "12px", fontWeight: "500" }}>
                          {item.wood_type || '-'}
                        </td>
                        <td style={{ padding: "12px", color: "#6b7280", fontSize: "0.875rem" }}>
                          {item.bill_type || '-'}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#374151" }}>
                          {item.length || '0'}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#374151" }}>
                          {item.breadth || '0'}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#374151" }}>
                          {item.height || '0'}
                        </td>
                        <td style={{ padding: "12px", textAlign: "center", color: "#374151" }}>
                          {item.nos || '0'}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", fontWeight: "500", color: "#4f46e5" }}>
                          {roundTwo(item.total_units || 0)}
                        </td>
                        <td style={{ padding: "12px", textAlign: "right", color: "#374151" }}>
                          ₹{roundTwo(item.unit_price || 0)}
                        </td>
                        <td style={{ 
                          padding: "12px",
                          textAlign: "right", 
                          fontWeight: "600", 
                          color: "#059669",
                          fontSize: "0.9375rem"
                        }}>
                          ₹{roundTwo(item.total_price || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          <div className="card">
            <div className="card-header">
              <h3 style={{ margin: 0, fontSize: "1.125rem" }}>Summary</h3>
            </div>
            <div className="card-body">
              <div style={{ 
                display: "grid", 
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", 
                gap: "24px" 
              }}>
                {/* Charges Breakdown */}
                <div>
                  <h4 style={{ 
                    margin: "0 0 16px 0", 
                    fontSize: "1rem",
                    color: "#374151"
                  }}>
                    Charges Breakdown
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between",
                      alignItems: "center",
                      paddingBottom: "8px",
                      borderBottom: "1px solid #e5e7eb"
                    }}>
                      <span style={{ color: "#6b7280" }}>Sub Total:</span>
                      <span style={{ fontWeight: "500" }}>₹{roundTwo(bill.sub_total || 0)}</span>
                    </div>
                    
                    {bill.planing_charges > 0 && (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ color: "#6b7280" }}>Planing Charges:</span>
                        <span style={{ fontWeight: "500" }}>₹{roundTwo(bill.planing_charges || 0)}</span>
                      </div>
                    )}
                    
                    {bill.sawing_charges > 0 && (
                      <div style={{ 
                        display: "flex", 
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <span style={{ color: "#6b7280" }}>Sawing Charges:</span>
                        <span style={{ fontWeight: "500" }}>₹{roundTwo(bill.sawing_charges || 0)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Grand Total */}
                <div style={{ 
                  background: "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                  borderRadius: "12px",
                  padding: "20px",
                  border: "2px solid #0ea5e9"
                }}>
                  <div style={{ 
                    display: "flex", 
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "12px"
                  }}>
                    <span style={{ 
                      fontSize: "1.125rem", 
                      fontWeight: "600",
                      color: "#0369a1"
                    }}>
                      Grand Total:
                    </span>
                    <span style={{ 
                      fontSize: "1.75rem", 
                      fontWeight: "700",
                      color: "#059669"
                    }}>
                      ₹{roundTwo(bill.grand_total || 0)}
                    </span>
                  </div>
                  
                  {/* Additional charges summary */}
                  {(bill.planing_charges > 0 || bill.sawing_charges > 0) && (
                    <div style={{ 
                      fontSize: "0.875rem", 
                      color: "#0c4a6e",
                      paddingTop: "12px",
                      borderTop: "1px solid #bae6fd"
                    }}>
                      Includes:
                      {bill.planing_charges > 0 && ` Planing (₹${roundTwo(bill.planing_charges)})`}
                      {bill.planing_charges > 0 && bill.sawing_charges > 0 && ' +'}
                      {bill.sawing_charges > 0 && ` Sawing (₹${roundTwo(bill.sawing_charges)})`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            gap: "12px", 
            marginTop: "24px",
            paddingTop: "24px",
            borderTop: "2px solid #e5e7eb",
            flexWrap: "wrap"
          }}>
            <button 
              onClick={onClose}
              style={{
                background: "white",
                color: "#374151",
                border: "2px solid #d1d5db",
                borderRadius: "8px",
                padding: "12px 24px",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "600",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}
              onMouseOver={(e) => {
                e.target.style.background = "#f9fafb";
                e.target.style.borderColor = "#9ca3af";
              }}
              onMouseOut={(e) => {
                e.target.style.background = "white";
                e.target.style.borderColor = "#d1d5db";
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 19L3 12M3 12L10 5M3 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Close
            </button>
            
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button 
                onClick={handlePrint}
                style={{
                  background: "#3b82f6",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseOver={(e) => e.target.style.background = "#2563eb"}
                onMouseOut={(e) => e.target.style.background = "#3b82f6"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9V2H18V9M6 18H4C3.46957 18 2.96086 17.7893 2.58579 17.4142C2.21071 17.0391 2 16.5304 2 16V11C2 10.4696 2.21071 9.96086 2.58579 9.58579C2.96086 9.21071 3.46957 9 4 9H20C20.5304 9 21.0391 9.21071 21.4142 9.58579C21.7893 9.96086 22 10.4696 22 11V16C22 16.5304 21.7893 17.0391 21.4142 17.4142C21.0391 17.7893 20.5304 18 20 18H18M6 14H18V22H6V14Z" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Print Bill
              </button>
              
              <button 
                onClick={handleDownloadPDF}
                style={{
                  background: "#059669",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  padding: "12px 24px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: "600",
                  transition: "all 0.2s",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px"
                }}
                onMouseOver={(e) => e.target.style.background = "#047857"}
                onMouseOut={(e) => e.target.style.background = "#059669"}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3" 
                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>
      
    {/* Print Styles */}
      <style>{`
        @media print {
          .bill-modal {
            position: static !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          
          button {
            display: none !important;
          }
          
          @page {
            size: 80mm auto;
            margin: 5mm;
          }
          
          body {
            width: 80mm;
          }
        }
        
        .status-badge {
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .status-completed {
          background: #d1fae5;
          color: #065f46;
        }
        
        .status-in_progress {
          background: #dbeafe;
          color: #1e40af;
        }
        
        .status-delayed {
          background: #fee2e2;
          color: #991b1b;
        }
        
        .status-pending {
          background: #fef3c7;
          color: #92400e;
        }
        
        .status-none {
          background: #f3f4f6;
          color: #6b7280;
        }
      `}</style>
    </>
  );
}

export default BillDetails;