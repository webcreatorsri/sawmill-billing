// src/components/Report.jsx - Modern SaaS Design with Offline Support
import React, { useEffect, useState, useRef } from "react";
import { db, collection, getDocs, query, orderBy } from "../firebase";
import jsPDF from "jspdf";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { OfflineService } from "../services/offlineService";

export default function Report({ onSelect }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareBill, setShareBill] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedBills, setSelectedBills] = useState(new Set());
  const [dateFilter, setDateFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const reportRef = useRef();
  
  // Add offline status
  const { isOnline } = useNetworkStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Check for pending sync operations
  const checkPendingSync = () => {
    const queue = JSON.parse(localStorage.getItem('sawmill_sync_queue') || '[]');
    setPendingSyncCount(queue.length);
  };

  // Notification function
  const showNotification = (message, type = 'success') => {
    const notificationEvent = new CustomEvent('showNotification', {
      detail: { message, type }
    });
    window.dispatchEvent(notificationEvent);
  };

  // Update fetchBills to work offline
  async function fetchBills() {
    setLoading(true);
    try {
      const items = await OfflineService.getAllEstimates();
      setBills(items);
      checkPendingSync();
    } catch (err) {
      console.error(err);
      showNotification(`Error fetching bills: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // Add sync function
  const handleSync = async () => {
    if (!isOnline) {
      showNotification('Cannot sync while offline', 'error');
      return;
    }

    setLoading(true);
    try {
      const results = await OfflineService.syncPendingOperations();
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (successful > 0) {
        showNotification(`Successfully synced ${successful} estimate(s)`, 'success');
      }
      if (failed > 0) {
        showNotification(`Failed to sync ${failed} estimate(s)`, 'error');
      }
      if (successful === 0 && failed === 0) {
        showNotification('No pending estimates to sync', 'info');
      }

      checkPendingSync();
      fetchBills(); // Refresh the list
    } catch (error) {
      showNotification(`Sync error: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filter bills based on criteria
  const filteredBills = bills.filter(bill => {
    if (dateFilter && bill.date !== dateFilter) return false;
    if (statusFilter !== "all" && bill.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        bill.customer_name?.toLowerCase().includes(term) ||
        bill.bill_no.toString().includes(term) ||
        bill.grand_total.toString().includes(term)
      );
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: filteredBills.length,
    totalAmount: filteredBills.reduce((sum, bill) => sum + (Number(bill.grand_total) || 0), 0),
    completed: filteredBills.filter(bill => bill.status === 'completed').length,
    pending: filteredBills.filter(bill => bill.status === 'pending').length,
    offline: filteredBills.filter(bill => bill.isLocal).length
  };

  const toggleBillSelection = (billId) => {
    const newSelected = new Set(selectedBills);
    if (newSelected.has(billId)) {
      newSelected.delete(billId);
    } else {
      newSelected.add(billId);
    }
    setSelectedBills(newSelected);
  };

  const selectAllBills = () => {
    if (selectedBills.size === filteredBills.length) {
      setSelectedBills(new Set());
    } else {
      setSelectedBills(new Set(filteredBills.map(bill => bill.id)));
    }
  };

  const downloadDetailedPDF = async () => {
    const billsToDownload = filteredBills.filter(bill => 
      selectedBills.size === 0 ? true : selectedBills.has(bill.id)
    );

    if (billsToDownload.length === 0) {
      showNotification("No bills selected to download. Please select bills or remove filters.", 'warning');
      return;
    }

    setPdfLoading(true);
    try {
      const doc = new jsPDF();
      
      billsToDownload.forEach((bill, billIndex) => {
        if (billIndex > 0) {
          doc.addPage();
        }

        // Header
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('SAWMILL ESTIMATE BILL', 105, 15, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`Bill No: ${bill.bill_no}`, 14, 25);
        doc.text(`Date: ${bill.date}`, 14, 32);
        
        // Add offline indicator for local bills
        if (bill.isLocal) {
          doc.setTextColor(255, 0, 0);
          doc.text('*** OFFLINE - PENDING SYNC ***', 14, 39);
          doc.setTextColor(100, 100, 100);
        }
        
        if (bill.customer_name) {
          doc.text(`Customer: ${bill.customer_name}`, 14, bill.isLocal ? 46 : 39);
        }
        if (bill.customer_phone) {
          doc.text(`Phone: ${bill.customer_phone}`, 14, bill.isLocal ? 53 : 46);
        }

        // Bill Items Table
        let yPosition = bill.isLocal ? 70 : 60;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.setFillColor(240, 240, 240);
        doc.rect(14, yPosition - 5, 183, 8, 'F');
        
        doc.text('Wood Type', 16, yPosition);
        doc.text('Type', 60, yPosition);
        doc.text('S1', 85, yPosition);
        doc.text('S2', 100, yPosition);
        doc.text('S3', 115, yPosition);
        doc.text('Nos', 130, yPosition);
        doc.text('Units', 145, yPosition);
        doc.text('Price', 160, yPosition);
        doc.text('Total', 175, yPosition);
        
        yPosition += 10;

        // Bill Items
        doc.setFontSize(10);
        bill.items.forEach((item, index) => {
          if (yPosition > 250) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setTextColor(0, 0, 0);
          doc.text(item.wood_type || '-', 16, yPosition);
          doc.text(item.bill_type || '-', 60, yPosition);
          doc.text(item.length?.toString() || '0', 85, yPosition);
          doc.text(item.breadth?.toString() || '0', 100, yPosition);
          doc.text(item.height?.toString() || '0', 115, yPosition);
          doc.text(item.nos?.toString() || '0', 130, yPosition);
          doc.text(item.total_units?.toString() || '0', 145, yPosition);
          doc.text(`₹${item.unit_price || '0'}`, 160, yPosition);
          doc.text(`₹${item.total_price || '0'}`, 175, yPosition);
          
          yPosition += 7;
        });

        // Summary Section
        yPosition = Math.max(yPosition + 10, 140);
        doc.setFontSize(12);
        doc.text(`Sub Total: ₹${bill.sub_total || '0'}`, 120, yPosition);
        doc.text(`Planing Charges: ₹${bill.planing_charges || '0'}`, 120, yPosition + 7);
        doc.text(`Sawing Charges: ₹${bill.sawing_charges || '0'}`, 120, yPosition + 14);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`Grand Total: ₹${bill.grand_total || '0'}`, 120, yPosition + 25);
        doc.setFont(undefined, 'normal');

        // Status
        doc.setFontSize(10);
        if (bill.status) {
          const statusColor = bill.status === 'completed' ? [40, 167, 69] : 
                            bill.status === 'in_progress' ? [255, 193, 7] :     
                            bill.status === 'delayed' ? [220, 53, 69] :         
                            bill.status === 'None' ? [0, 0, 0] :                
                            bill.status === 'pending' ? [111, 66, 193] : [0, 123, 255]; 
          doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
          doc.text(`Status: ${bill.status.replace('_', ' ').toUpperCase()}`, 14, yPosition + 25);
        }

        // Footer
        doc.setTextColor(100, 100, 100);
        doc.text('Thank you for your business!', 105, 280, { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 285, { align: 'center' });
      });

      const fileName = selectedBills.size === 1 && billsToDownload.length === 1 
        ? `bill-${billsToDownload[0].bill_no}.pdf`
        : `sawmill-bills-${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(fileName);
      
      showNotification(`PDF generated successfully! ${billsToDownload.length} bill(s) downloaded.`, 'success');
      
    } catch (error) {
      console.error('Error generating detailed PDF:', error);
      showNotification('Error generating PDF. Please try again.', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const downloadSummaryPDF = async () => {
    const billsToDownload = filteredBills.filter(bill => 
      selectedBills.size === 0 ? true : selectedBills.has(bill.id)
    );

    if (billsToDownload.length === 0) {
      showNotification("No bills to download. Please select bills or remove filters.", 'warning');
      return;
    }

    setPdfLoading(true);
    try {
      const doc = new jsPDF('landscape');
      
      // Header
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text('Sawmill - Bills Summary Report', 14, 15);
      
      // Filters info
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
      if (dateFilter) {
        doc.text(`Date Filter: ${dateFilter}`, 14, 29);
      }
      doc.text(`Total Bills: ${billsToDownload.length}`, 200, 22);

      // Table headers
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      let yPosition = 40;
      
      doc.setFillColor(240, 240, 240);
      doc.rect(14, yPosition - 5, 270, 8, 'F');
      doc.text('Bill No', 16, yPosition);
      doc.text('Date', 35, yPosition);
      doc.text('Customer', 60, yPosition);
      doc.text('Status', 120, yPosition);
      doc.text('Items', 160, yPosition);
      doc.text('Sub Total', 190, yPosition);
      doc.text('Charges', 220, yPosition);
      doc.text('Grand Total', 250, yPosition);
      doc.text('Sync', 275, yPosition);
      
      yPosition += 10;
      
      // Bill data
      doc.setFontSize(10);
      billsToDownload.forEach((bill) => {
        if (yPosition > 180) {
          doc.addPage();
          yPosition = 20;
        }
        
        // Status color
        let statusColor = [0, 0, 0];
        if (bill.status === 'completed') statusColor = [40, 167, 69];
        else if (bill.status === 'in_progress') statusColor = [255, 193, 7];
        else if (bill.status === 'delayed') statusColor = [220, 53, 69];
        else if (bill.status === 'None') statusColor = [0, 0, 0];
        else if (bill.status === 'pending') statusColor = [111, 66, 193];

        doc.setTextColor(0, 0, 0);
        doc.text(bill.bill_no.toString(), 16, yPosition);
        doc.text(bill.date, 35, yPosition);
        doc.text(bill.customer_name || '-', 60, yPosition);
        
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(bill.status ? bill.status.replace('_', ' ').toUpperCase() : 'PENDING', 120, yPosition);
        
        doc.setTextColor(0, 0, 0);
        doc.text((bill.items?.length || 0).toString(), 160, yPosition);
        doc.text(`₹${bill.sub_total || '0'}`, 190, yPosition);
        doc.text(`₹${(bill.planing_charges || 0) + (bill.sawing_charges || 0)}`, 220, yPosition);
        doc.text(`₹${bill.grand_total || '0'}`, 250, yPosition);
        
        // Sync status
        if (bill.isLocal) {
          doc.setTextColor(220, 53, 69);
          doc.text('OFFLINE', 275, yPosition);
        } else {
          doc.setTextColor(40, 167, 69);
          doc.text('SYNCED', 275, yPosition);
        }
        
        yPosition += 7;
      });
      
      // Summary
      yPosition += 10;
      doc.setFontSize(12);
      const totalAmount = billsToDownload.reduce((sum, bill) => sum + (Number(bill.grand_total) || 0), 0);
      doc.text(`Total Amount: ₹${totalAmount.toFixed(2)}`, 14, yPosition);
      
      doc.save(`bills-summary-${new Date().toISOString().split('T')[0]}.pdf`);
      
      showNotification(`Summary report generated successfully!`, 'success');
      
    } catch (error) {
      console.error('Error generating summary PDF:', error);
      showNotification('Error generating summary PDF. Please try again.', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, []);

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

  const clearFilters = () => {
    setDateFilter("");
    setSearchTerm("");
    setStatusFilter("all");
    setSelectedBills(new Set());
  };

  // Add offline status indicator
  const renderOfflineIndicator = () => (
    <div className={`offline-indicator ${isOnline ? 'online' : 'offline'}`}>
      <div className="offline-status">
        <span className="status-dot"></span>
        {isOnline ? 'Online' : 'Offline'}
        {pendingSyncCount > 0 && (
          <span className="sync-badge">
            {pendingSyncCount} pending sync
          </span>
        )}
      </div>
      {pendingSyncCount > 0 && isOnline && (
        <button 
          onClick={handleSync}
          disabled={loading}
          className="btn-sync"
        >
          {loading ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );

  return (
    <div className="report-container" ref={reportRef}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          {renderOfflineIndicator()}
        </div>
        <div className="header-actions">
          <div className="action-buttons">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="btn-filter"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 3H2L10 12.46V19L14 21V12.46L22 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>
            <button 
              onClick={downloadSummaryPDF}
              disabled={pdfLoading || loading || filteredBills.length === 0}
              className="btn-secondary"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 13H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 17H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 9H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Summary PDF
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17V15M12 17V11M15 17V13M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Bills</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon revenue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 1V23M17 5H9.5C8.57174 5 7.6815 5.36875 7.02513 6.02513C6.36875 6.6815 6 7.57174 6 8.5C6 9.42826 6.36875 10.3185 7.02513 10.9749C7.6815 11.6313 8.57174 12 9.5 12H14.5C15.4283 12 16.3185 12.3687 16.9749 13.0251C17.6313 13.6815 18 14.5717 18 15.5C18 16.4283 17.6313 17.3185 16.9749 17.9749C16.3185 18.6313 15.4283 19 14.5 19H6" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">₹{stats.totalAmount.toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>
        
        
        
        <div className="stat-card">
          <div className="stat-icon offline">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 16C8 18.2091 9.79086 20 12 20C14.2091 20 16 18.2091 16 16M12 8V12M12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.offline}</div>
            <div className="stat-label">Offline</div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && (
        <div className="card filters-panel">
          <div className="card-header">
            <h3>Filter Bills</h3>
            <div className="filter-actions">
              <button 
                onClick={clearFilters}
                className="btn-outline"
              >
                Clear All
              </button>
            </div>
          </div>
          <div className="card-body">
            <div className="filters-grid">
              <div className="filter-group">
                <label className="filter-label">Search</label>
                <div className="search-input-wrapper">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="search-icon">
                    <path d="M21 21L16.514 16.506M19 10.5C19 15.194 15.194 19 10.5 19C5.806 19 2 15.194 2 10.5C2 5.806 5.806 2 10.5 2C15.194 2 19 5.806 19 10.5Z" 
                          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by bill no, or amount..."
                    className="search-input"
                  />
                </div>
              </div>
              
              <div className="filter-group">
                <label className="filter-label">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="filter-input"
                />
              </div>
              
              
              <div className="filter-group">
                <label className="filter-label">Selection</label>
                <div className="selection-actions">
                  <button 
                    onClick={selectAllBills}
                    className="btn-info"
                  >
                    {selectedBills.size === filteredBills.length ? "Deselect All" : "Select All"}
                  </button>
                  <button 
                    onClick={() => setSelectedBills(new Set())}
                    className="btn-danger"
                  >
                    Clear Selection
                  </button>
                </div>
              </div>
            </div>
            
            <div className="filter-summary">
              <div className="summary-text">
                Showing: <strong>{filteredBills.length}</strong> bill{filteredBills.length !== 1 ? 's' : ''}
                {selectedBills.size > 0 && (
                  <span className="selection-count">
                    (<strong>{selectedBills.size}</strong> selected)
                  </span>
                )}
                {stats.offline > 0 && (
                  <span className="offline-count">
                    (<strong>{stats.offline}</strong> offline)
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bills Table */}
      {loading ? (
        <div className="card loading-card">
          <div className="card-body">
            <div className="loading-spinner">
              <div className="loading"></div>
            </div>
            <h3>Loading Estimates...</h3>
            <p>Fetching your bill records</p>
          </div>
        </div>
      ) : filteredBills.length === 0 ? (
        <div className="card empty-state">
          <div className="card-body">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 17V15M12 17V11M15 17V13M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3>
              {searchTerm || dateFilter || statusFilter !== "all" ? "No matching bills found" : "No bills found"}
            </h3>
            <p>
              {searchTerm || dateFilter || statusFilter !== "all" 
                ? "Try adjusting your filters to see more results." 
                : "Get started by creating your first estimate."}
            </p>
            {(searchTerm || dateFilter || statusFilter !== "all") && (
              <button 
                onClick={clearFilters}
                className="btn-primary"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table className="bills-table">
              <thead>
                <tr>
                  <th className="col-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedBills.size === filteredBills.length && filteredBills.length > 0}
                      onChange={selectAllBills}
                      className="checkbox"
                    />
                  </th>
                  <th className="col-bill-no">Bill No</th>
                  <th className="col-date">Date</th>
                  <th className="col-items">Items</th>
                  <th className="col-total">Grand Total</th>
                  <th className="col-sync">Sync</th>
                  <th className="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.map(bill => (
                  <tr key={bill.id} className="bill-row">
                    <td className="col-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedBills.has(bill.id)}
                        onChange={() => toggleBillSelection(bill.id)}
                        className="checkbox"
                      />
                    </td>
                    <td className="col-bill-no">
                      <div className="bill-number">
                        <span className="bill-prefix">#</span>
                        {bill.bill_no}
                        {bill.isLocal && (
                          <span className="offline-tag" title="Saved offline - will sync when online">
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="col-date">
                      <div className="bill-date">{bill.date}</div>
                    </td>
                    
                   
                    <td className="col-items">
                      <div className="items-count">
                        {bill.items?.length || 0} item{(bill.items?.length || 0) !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="col-total">
                      <div className="total-amount">₹{bill.grand_total}</div>
                    </td>
                    <td className="col-sync">
                      {bill.isLocal ? (
                        <span className="sync-status offline" title="Pending sync">
                          Offline
                        </span>
                      ) : (
                        <span className="sync-status online" title="Synced with cloud">
                          Online
                        </span>
                      )}
                    </td>
                    <td className="col-actions">
                      <div className="action-buttons">
                        <button 
                          onClick={() => onSelect(bill)}
                          className="btn-info"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" 
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" 
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>
        {`
        .report-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 1rem;
        }

        /* Offline Indicator Styles */
        .offline-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-bottom: 16px;
        }

        .offline-indicator.offline {
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #f59e0b;
        }

        .offline-indicator.online {
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #10b981;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
        }

        .offline-indicator.offline .status-dot {
          background: #d97706;
        }

        .offline-indicator.online .status-dot {
          background: #059669;
        }

        .sync-badge {
          background: #ef4444;
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          margin-left: 8px;
        }

        .btn-sync {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-sync:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-sync:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .offline-tag {
          margin-left: 8px;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .sync-status {
          font-size: 0.75rem;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 12px;
        }

        .sync-status.offline {
          background: #fef3c7;
          color: #92400e;
        }

        .sync-status.online {
          background: #d1fae5;
          color: #065f46;
        }

        .offline-count {
          margin-left: 8px;
          color: #d97706;
        }

        .stat-icon.offline {
          background: #fef3c7;
          color: #d97706;
        }

        /* Page Header */
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding: 0 0.5rem;
        }

        .page-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .header-actions {
          display: flex;
          gap: 0.75rem;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        /* Button Styles */
        .btn-filter {
          background: #6b7280;
          color: white;
          height: 44px;
          border: 1px solid #6b7280;
        }

        .btn-filter:hover:not(:disabled) {
          background: #4b5563;
          border-color: #4b5563;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
          height: 44px;
          align-items: center;
          border: 1px solid #3b82f6;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
          heigth: 44px;
          text-align: center;
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
          height: 44px;
          align-items: center;
          border: 10px solid #6b7280;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #4b5563;
          border-color: #4b5563;
        }

        .btn-outline {
          background: transparent;
          border: 1px solid #d1d5db;
          color: #374151;
        }

        .btn-outline:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .btn-info {
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
        }

        .btn-info:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-danger {
          background: #ef4444;
          color: white;
          border: 1px solid #ef4444;
        }

        .btn-danger:hover:not(:disabled) {
          background: #dc2626;
          border-color: #dc2626;
        }

        button {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border: 1px solid transparent;
          border-radius: 0.5rem;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        button svg {
          flex-shrink: 0;
        }

        .loading-spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Card Styles */
        .card {
          background: white;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }

        .card-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
        }

        .card-header h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .card-body {
          padding: 1.5rem;
        }

        /* Statistics Grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }

        .stat-icon {
          padding: 0.75rem;
          border-radius: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-icon.total {
          background: #fef3c7;
          color: #d97706;
        }

        .stat-icon.revenue {
          background: #dbeafe;
          color: #1e40af;
        }

        .stat-icon.completed {
          background: #dcfce7;
          color: #16a34a;
        }

        .stat-icon.offline {
          background: #fef3c7;
          color: #d97706;
        }

        .stat-content {
          flex: 1;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          line-height: 1;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        /* Filters Panel */
        .filters-panel {
          border: 2px solid #e5e7eb;
          background: white;
        }

        .filters-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .filter-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .filter-label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        /* Search Input */
        .search-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 0.75rem;
          color: #6b7280;
          z-index: 10;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 0.75rem 0.625rem 2.5rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          font-family: inherit;
        }

        .search-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Filter Inputs */
        .filter-input, .filter-select {
          width: 100%;
          padding: 0.625rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          font-family: inherit;
        }

        .filter-input:focus, .filter-select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        /* Selection Actions */
        .selection-actions {
          display: flex;
          gap: 0.5rem;
        }

        .selection-actions button {
          padding: 0.5rem 1rem;
          font-size: 0.75rem;
        }

        /* Filter Summary */
        .filter-summary {
          padding-top: 1rem;
          border-top: 1px solid #e5e7eb;
        }

        .summary-text {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .summary-text strong {
          color: #1f2937;
        }

        .selection-count {
          margin-left: 0.5rem;
          color: #3b82f6;
        }

        .offline-count {
          margin-left: 0.5rem;
          color: #d97706;
        }

        /* Loading State */
        .loading-card {
          text-align: center;
        }

        .loading-spinner {
          margin: 0 auto 1rem;
        }

        .loading-card h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .loading-card p {
          color: #6b7280;
          font-size: 0.875rem;
        }

        /* Empty State */
        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
        }

        .empty-icon {
          margin-bottom: 1.5rem;
          color: #9ca3af;
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .empty-state p {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 1.5rem;
        }

        /* Table Styles */
        .table-container {
          overflow-x: auto;
        }

        .bills-table {
          width: 100%;
          border-collapse: collapse;
        }

        .bills-table th {
          background: #f8fafc;
          padding: 0.75rem 1rem;
          text-align: left;
          font-size: 0.75rem;
          font-weight: 600;
          color: #374151;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px solid #e5e7eb;
        }

        .bills-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .bill-row:hover {
          background: #f9fafb;
        }

        .col-checkbox {
          width: 40px;
        }

        .col-sync {
          width: 100px;
        }

        .checkbox {
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
          border: 1px solid #d1d5db;
          cursor: pointer;
        }

        .bill-number {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .bill-prefix {
          color: #6b7280;
        }

        .bill-date {
          color: #6b7280;
          font-size: 0.875rem;
        }

       

        /* Status Badges */
        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

       

        .items-count {
          color: #6b7280;
          font-size: 0.875rem;
        }

        .total-amount {
          font-weight: 600;
          color: #059669;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

      
        .action-buttons button {
          padding: 0.375rem 0.75rem;
          font-size: 0.75rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .header-actions {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .filters-grid {
            grid-template-columns: 1fr;
          }
          
          .selection-actions {
            flex-direction: column;
          }
          
          .table-container {
            font-size: 0.75rem;
          }
          
          .bills-table th,
          .bills-table td {
            padding: 0.5rem 0.25rem;
          }

          .offline-indicator {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
          
          
          .btn-sync {
            align-self: flex-end;
          }
        }
        `}
      </style>
    </div>
  );
}