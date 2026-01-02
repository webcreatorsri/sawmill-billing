// src/components/AddEstimate.jsx - Enhanced with Offline Support
import React, { useState, useEffect } from "react";
import { db, doc, runTransaction, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, limit } from "../firebase";
import { totalUnitsForItem, roundTwo } from "../utils";
import { useNetworkStatus } from "../hooks/useNetworkStatus";
import { OfflineService } from "../services/offlineService";
import { EstimatesStorage, BillCounter } from "../utils/offlineStorage";

const WOOD_VARIETIES = [ "Teak 1", "Teak 2", "Padauk", "vengai", "Kongu", "Mahogany", "Vembu", "Poovarasam", "Country Wood"];
const BILL_TYPES = ["None", "Sizes", "Planks"];
const STATUS_OPTIONS = [
  { value: "none", label: "None", color: "#666" },
  { value: "pending", label: "Pending", color: "#d97706" },
  { value: "in_progress", label: "In Progress", color: "#1e40af" },
  { value: "completed", label: "Completed", color: "#059669" },
  { value: "delayed", label: "Delayed", color: "#dc2626" }
];

const POPULAR_COMBINATIONS = [
  {
    name: "Standard Teak Planks",
    wood_type: "Teak Wood",
    bill_type: "Planks",
    length: 8,
    breadth: 1,
    height: 0,
    unit_price: 1200
  },
  {
    name: "Rosewood Sizes",
    wood_type: "Rosewood",
    bill_type: "Sizes",
    length: 10,
    breadth: 2,
    height: 2,
    unit_price: 1800
  },
  {
    name: "Plywood Sheets",
    wood_type: "Plywood",
    bill_type: "Planks",
    length: 8,
    breadth: 4,
    height: 0,
    unit_price: 800
  },
  {
    name: "Rubber Wood Blocks",
    wood_type: "Rubber Wood",
    bill_type: "Sizes",
    length: 6,
    breadth: 3,
    height: 3,
    unit_price: 600
  },
  {
    name: "Oak Wood Planks",
    wood_type: "Oak Wood",
    bill_type: "Planks",
    length: 12,
    breadth: 2,
    height: 0,
    unit_price: 1500
  },
  {
    name: "MDF Boards",
    wood_type: "MDF",
    bill_type: "Planks",
    length: 8,
    breadth: 4,
    height: 0,
    unit_price: 400
  },
  {
    name: "Sheesham Sizes",
    wood_type: "Sheesham Wood",
    bill_type: "Sizes",
    length: 8,
    breadth: 3,
    height: 3,
    unit_price: 1400
  },
  {
    name: "Pine Wood Planks",
    wood_type: "Pine Wood",
    bill_type: "Planks",
    length: 10,
    breadth: 1,
    height: 0,
    unit_price: 700
  }
];

const defaultRow = () => ({
  wood_type: "None",
  bill_type: "None",
  length: "",
  breadth: "",
  height: "",
  nos: 1,
  total_units: 0,
  unit_price: "",
  total_price: 0,
});

export default function AddEstimate({ user }) {
  const [rows, setRows] = useState([defaultRow()]);
  const [planingCharges, setPlaningCharges] = useState(0);
  const [sawingCharges, setSawingCharges] = useState(0);
  const [saving, setSaving] = useState(false);
  const [billNo, setBillNo] = useState(null);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState("none");
  const [recentItems, setRecentItems] = useState([]);
  const [showRecentItems, setShowRecentItems] = useState(false);
  const [showCombinations, setShowCombinations] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calculatorInput, setCalculatorInput] = useState("");
  const [calculatorResult, setCalculatorResult] = useState("");
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [showTips, setShowTips] = useState(true);
  const [efficiencyMode, setEfficiencyMode] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [loading, setLoading] = useState(false);
  
  // Add these new state variables for offline functionality
  const { isOnline, isInitialized } = useNetworkStatus();
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  // Show notification function
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  };

  // Check for pending sync operations
  const checkPendingSync = () => {
    const queue = JSON.parse(localStorage.getItem('sawmill_sync_queue') || '[]');
    setPendingSyncCount(queue.length);
  };

  useEffect(() => {
    loadRecentEstimates();
    checkPendingSync();
  }, []);

  // Keyboard event handler for Enter key and arrow navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Enter key to add new row (when not in input fields)
      if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT' || activeElement.tagName === 'TEXTAREA';
        
        if (!isInputField) {
          e.preventDefault();
          addRow();
          showNotification('New row added', 'success');
        }
      }

      // Arrow key navigation between rows
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT';
        
        if (isInputField) {
          e.preventDefault();
          const currentRow = activeElement.closest('.item-row-card');
          if (currentRow) {
            const allRows = Array.from(document.querySelectorAll('.item-row-card'));
            const currentIndex = allRows.indexOf(currentRow);
            
            if (e.key === 'ArrowDown' && currentIndex < allRows.length - 1) {
              // Move to next row, same column
              const nextRow = allRows[currentIndex + 1];
              const inputs = nextRow.querySelectorAll('input, select');
              const currentInputIndex = Array.from(currentRow.querySelectorAll('input, select')).indexOf(activeElement);
              if (inputs[currentInputIndex]) {
                inputs[currentInputIndex].focus();
                inputs[currentInputIndex].select();
              }
            } else if (e.key === 'ArrowUp' && currentIndex > 0) {
              // Move to previous row, same column
              const prevRow = allRows[currentIndex - 1];
              const inputs = prevRow.querySelectorAll('input, select');
              const currentInputIndex = Array.from(currentRow.querySelectorAll('input, select')).indexOf(activeElement);
              if (inputs[currentInputIndex]) {
                inputs[currentInputIndex].focus();
                inputs[currentInputIndex].select();
              }
            }
          }
        }
      }

      // Tab key navigation within row
      if (e.key === 'Tab') {
        const activeElement = document.activeElement;
        const isInputField = activeElement.tagName === 'INPUT' || activeElement.tagName === 'SELECT';
        
        if (isInputField) {
          e.preventDefault();
          const currentRow = activeElement.closest('.item-row-card');
          if (currentRow) {
            const inputs = Array.from(currentRow.querySelectorAll('input, select'));
            const currentIndex = inputs.indexOf(activeElement);
            
            if (e.shiftKey) {
              // Shift+Tab - move to previous field
              if (currentIndex > 0) {
                inputs[currentIndex - 1].focus();
                inputs[currentIndex - 1].select();
              }
            } else {
              // Tab - move to next field
              if (currentIndex < inputs.length - 1) {
                inputs[currentIndex + 1].focus();
                inputs[currentIndex + 1].select();
              } else {
                // If at last field, move to next row first field
                const allRows = Array.from(document.querySelectorAll('.item-row-card'));
                const rowIndex = allRows.indexOf(currentRow);
                if (rowIndex < allRows.length - 1) {
                  const nextRow = allRows[rowIndex + 1];
                  const nextInputs = nextRow.querySelectorAll('input, select');
                  if (nextInputs[0]) {
                    nextInputs[0].focus();
                    nextInputs[0].select();
                  }
                }
              }
            }
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [rows]);

  function calcSubTotal() {
    return roundTwo(rows.reduce((sum, row) => sum + (Number(row.total_price) || 0), 0));
  }

  // Update loadRecentEstimates to work offline
  async function loadRecentEstimates() {
    setLoading(true);
    try {
      const estimates = await OfflineService.getAllEstimates();
      
      const recent = estimates.slice(0, 10).map(estimate => ({
        id: estimate.id,
        bill_no: estimate.bill_no,
        customer_name: estimate.customer_name || "Walk-in Customer",
        customer_phone: estimate.customer_phone,
        items: estimate.items || [],
        total_amount: estimate.grand_total || 0,
        date: estimate.date,
        status: estimate.status,
        isLocal: estimate.isLocal || false
      }));
      
      setRecentItems(recent);
    } catch (error) {
      console.error("Error loading recent estimates:", error);
      // Fallback to local storage only
      const localEstimates = EstimatesStorage.getEstimates();
      setRecentItems(localEstimates.slice(0, 10));
    } finally {
      setLoading(false);
    }
  }

  function quickAddFromRecent(recentEstimate) {
    const newRows = recentEstimate.items.map(item => ({
      wood_type: item.wood_type,
      bill_type: item.bill_type,
      length: item.length || "",
      breadth: item.breadth || "",
      height: item.height || "",
      nos: item.nos || 1,
      total_units: item.total_units || 0,
      unit_price: item.unit_price || "",
      total_price: item.total_price || 0,
    }));
    
    setRows(newRows);
    setShowRecentItems(false);
    showNotification(`Loaded template from Bill #${recentEstimate.bill_no}`, 'info');
  }

  function addPopularCombination(combination) {
    const newRow = {
      wood_type: combination.wood_type,
      bill_type: combination.bill_type,
      length: combination.length,
      breadth: combination.breadth,
      height: combination.height,
      nos: 1,
      total_units: 0,
      unit_price: combination.unit_price,
      total_price: 0,
    };
    
    // Calculate units for the new row
    const computedUnits = totalUnitsForItem(newRow);
    newRow.total_units = roundTwo(computedUnits);
    newRow.total_price = roundTwo(newRow.total_units * newRow.unit_price);
    
    setRows(prev => [...prev, newRow]);
    setShowCombinations(false);
    showNotification(`Added ${combination.name} to estimate`, 'success');
  }

  function updateRow(index, key, value) {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [key]: value };

    const item = newRows[index];
    const computedUnits = totalUnitsForItem(item);
    const unitPrice = Number(item.unit_price) || 0;
    item.total_units = roundTwo(computedUnits);
    item.total_price = roundTwo(item.total_units * unitPrice);
    newRows[index] = item;

    setRows(newRows);
  }

  function addRow() {
    setRows(prev => [...prev, defaultRow()]);
    
    // Focus on the first input of the new row after a small delay
    setTimeout(() => {
      const allRows = document.querySelectorAll('.item-row-card');
      const newRow = allRows[allRows.length - 1];
      if (newRow) {
        const firstInput = newRow.querySelector('input, select');
        if (firstInput) {
          firstInput.focus();
          firstInput.select();
        }
      }
    }, 100);
  }

  function removeRow(index) {
    if (rows.length === 1) {
      showNotification('Cannot remove the only item', 'error');
      return;
    }
    setRows(prev => prev.filter((_, i) => i !== index));
    showNotification('Item removed', 'info');
  }

  function duplicateRow(index) {
    const rowToDuplicate = { ...rows[index] };
    setRows(prev => [...prev, rowToDuplicate]);
    showNotification('Item duplicated', 'success');
  }

  // New function to move row up
  function moveRowUp(index) {
    if (index === 0) {
      showNotification('Cannot move first item up', 'info');
      return;
    }
    const newRows = [...rows];
    [newRows[index - 1], newRows[index]] = [newRows[index], newRows[index - 1]];
    setRows(newRows);
    showNotification('Item moved up', 'success');
  }

  // New function to move row down
  function moveRowDown(index) {
    if (index === rows.length - 1) {
      showNotification('Cannot move last item down', 'info');
      return;
    }
    const newRows = [...rows];
    [newRows[index], newRows[index + 1]] = [newRows[index + 1], newRows[index]];
    setRows(newRows);
    showNotification('Item moved down', 'success');
  }

  function clearAllRows() {
    if (rows.length <= 1) {
      showNotification('No items to clear', 'info');
      return;
    }
    setRows([defaultRow()]);
    showNotification('All items cleared', 'info');
  }

  function applyBulkPrice(price) {
    if (!price || price <= 0) {
      showNotification('Please enter a valid price', 'error');
      return;
    }
    const newRows = rows.map(row => ({
      ...row,
      unit_price: price,
      total_price: roundTwo(row.total_units * price)
    }));
    setRows(newRows);
    showNotification(`Applied ₹${price} to all items`, 'success');
  }

  function calculateWoodRequirement() {
    setShowCalculator(true);
  }

  function handleCalculatorCalculation() {
    try {
      // Simple calculation for wood requirement
      const expression = calculatorInput.replace(/[^0-9+*/-]/g, '');
      const result = eval(expression);
      setCalculatorResult(`Result: ${result} units`);
    } catch (error) {
      setCalculatorResult("Invalid calculation");
    }
  }

  function getEfficiencyTips() {
    const tips = [
      "💡 Use standard sizes to reduce waste",
      "💡 Consider bulk pricing for orders above 100 units",
      "💡 Plan cuts efficiently to maximize wood usage",
      "💡 Check moisture content before processing",
      "💡 Use appropriate wood type for the project",
      "💡 Optimize cutting patterns to minimize scrap",
      "💡 Consider pre-cut sizes for faster processing",
      "💡 Use wood calculators for accurate estimation"
    ];
    return tips[Math.floor(Math.random() * tips.length)];
  }

  function getTotalWoodVolume() {
    return rows.reduce((total, row) => total + (Number(row.total_units) || 0), 0);
  }

  function getMostUsedWoodType() {
    const woodCount = {};
    rows.forEach(row => {
      if (row.wood_type && row.wood_type !== "None") {
        woodCount[row.wood_type] = (woodCount[row.wood_type] || 0) + 1;
      }
    });
    
    const mostUsed = Object.entries(woodCount).sort((a, b) => b[1] - a[1])[0];
    return mostUsed ? mostUsed[0] : "None";
  }

  function addCustomCombination() {
    const newCombination = {
      name: "Custom Combination",
      wood_type: "Teak Wood",
      bill_type: "Sizes",
      length: 8,
      breadth: 1,
      height: 1,
      unit_price: 1000
    };
    
    const newRow = {
      wood_type: newCombination.wood_type,
      bill_type: newCombination.bill_type,
      length: newCombination.length,
      breadth: newCombination.breadth,
      height: newCombination.height,
      nos: 1,
      total_units: 0,
      unit_price: newCombination.unit_price,
      total_price: 0,
    };
    
    const computedUnits = totalUnitsForItem(newRow);
    newRow.total_units = roundTwo(computedUnits);
    newRow.total_price = roundTwo(newRow.total_units * newRow.unit_price);
    
    setRows(prev => [...prev, newRow]);
    setShowCombinations(false);
    showNotification('Added custom combination', 'success');
  }

  // Add sync function
  const handleSync = async () => {
    if (!isOnline) {
      showNotification('Cannot sync while offline', 'error');
      return;
    }

    setSaving(true);
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
      loadRecentEstimates(); // Refresh the list
    } catch (error) {
      showNotification(`Sync error: ${error.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Update the handleSave function with offline support
  async function handleSave() {
    if (rows.length === 0 || (rows.length === 1 && rows[0].wood_type === "None")) {
      showNotification('Please add at least one item to save estimate', 'error');
      return;
    }

    setSaving(true);
    
    try {
      let nextBillNo;
      
      if (isOnline) {
        // Online mode - use Firebase
        const countersRef = doc(db, "counters", "metadata");
        await runTransaction(db, async (t) => {
          const snap = await t.get(countersRef);
          if (!snap.exists()) {
            t.set(countersRef, { lastBillNo: 1 });
            nextBillNo = 1;
          } else {
            const last = snap.data().lastBillNo || 0;
            nextBillNo = last + 1;
            t.update(countersRef, { lastBillNo: nextBillNo });
          }
        });
      } else {
        // Offline mode - use local counter
        nextBillNo = BillCounter.getNextBillNumber();
        setIsOfflineMode(true);
      }

      const subTotal = calcSubTotal();
      const grandTotal = roundTwo(subTotal + Number(planingCharges || 0) + Number(sawingCharges || 0));
      
      const estimateDoc = {
        bill_no: nextBillNo,
        date,
        sub_total: subTotal,
        planing_charges: Number(planingCharges || 0),
        sawing_charges: Number(sawingCharges || 0),
        grand_total: grandTotal,
        status: status,
        items: rows.map(r => ({
          wood_type: r.wood_type,
          bill_type: r.bill_type,
          length: Number(r.length || 0),
          breadth: Number(r.breadth || 0),
          height: Number(r.height || 0),
          nos: Number(r.nos || 0),
          total_units: Number(r.total_units || 0),
          unit_price: Number(r.unit_price || 0),
          total_price: Number(r.total_price || 0),
        })),
        efficiency_mode: efficiencyMode,
        total_volume: getTotalWoodVolume(),
        most_used_wood: getMostUsedWoodType(),
        createdAt: new Date().toISOString()
      };

      let result;
      
      if (isOnline) {
        // Save to Firebase
        const colRef = collection(db, "estimates");
        await addDoc(colRef, estimateDoc);
        result = { success: true, isOnline: true };
      } else {
        // Save offline
        result = await OfflineService.saveEstimateOffline(estimateDoc);
        checkPendingSync(); // Update pending sync count
      }

      if (result.success) {
        setBillNo(nextBillNo);
        setRows([defaultRow()]);
        setPlaningCharges(0);
        setSawingCharges(0);
        setDate(new Date().toISOString().split('T')[0]);
        setStatus("pending");

        const message = isOnline 
          ? `Estimate saved successfully! Bill No: ${nextBillNo}`
          : `Estimate saved offline! Bill No: ${nextBillNo} (Will sync when online)`;
        
        showNotification(message, 'success');
        
        // Reload recent estimates
        loadRecentEstimates();
      } else {
        throw new Error(result.error);
      }
      
    } catch (err) {
      console.error(err);
      showNotification(`Error saving estimate: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  }

  // Helper function for input focus
  const handleInputFocus = (e) => {
    e.target.select();
  };

  const grandTotal = roundTwo(calcSubTotal() + Number(planingCharges || 0) + Number(sawingCharges || 0));
  const totalItems = rows.length;
  const totalVolume = getTotalWoodVolume();

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
          disabled={saving}
          className="btn-sync"
        >
          {saving ? 'Syncing...' : 'Sync Now'}
        </button>
      )}
    </div>
  );

  return (
    <div className="estimate-container">
      {/* Notification Component */}
      {notification.show && (
        <div className={`notification notification-${notification.type}`}>
          <div className="notification-content">
            <span className="notification-message">{notification.message}</span>
            <button 
              onClick={() => setNotification({ show: false, message: "", type: "" })}
              className="notification-close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="page-header">
        <div>
          {renderOfflineIndicator()}
        </div>
        <div className="header-actions">
          <button 
            onClick={() => setShowRecentItems(!showRecentItems)}
            className="btn-secondary"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Load Template
          </button>
          <button 
            onClick={() => setShowCombinations(true)}
            className="btn-info"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 6V12M12 12V18M12 12H18M12 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Popular Items
          </button>
          <button 
            onClick={() => setEfficiencyMode(!efficiencyMode)}
            className={`efficiency-btn ${efficiencyMode ? "btn-success" : "btn-outline"}`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {efficiencyMode ? "Efficiency On" : "Efficiency Mode"}
          </button>
        </div>
      </div>

      {/* Efficiency Tips */}
      {showTips && efficiencyMode && (
        <div className="card efficiency-tips-card">
          <div className="card-body">
            <div className="tips-header">
              <div className="tips-icon">💡</div>
              <div className="tips-content">
                <div className="tips-title">Efficiency Tip</div>
                <div className="tips-text">{getEfficiencyTips()}</div>
              </div>
              <button 
                onClick={() => setShowTips(false)}
                className="tips-close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon stat-icon-items">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17V15M12 17V11M15 17V13M5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalItems}</div>
            <div className="stat-label">Total Items</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon stat-icon-volume">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalVolume.toFixed(2)}</div>
            <div className="stat-label">Total Volume</div>
          </div>
        </div>
        
        <div className="stat-card">
          <div className="stat-icon stat-icon-wood">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L20 8V20H4V8L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 22V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 12H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">₹{grandTotal}</div>
            <div className="stat-label">Grand Total</div>
          </div>
        </div>
      </div>

      {/* Load Template Panel - Individual Bills */}
      {showRecentItems && (
        <div className="card recent-templates-card">
          <div className="card-header">
            <h3>Load from Recent Estimates</h3>
            <button onClick={() => setShowRecentItems(false)} className="btn-outline">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Close
            </button>
          </div>
          <div className="card-body">
            <div className="recent-grid">
              {recentItems.map((recent, index) => (
                <div key={recent.id} className="recent-card" onClick={() => quickAddFromRecent(recent)}>
                  <div className="recent-header">
                    <div className="customer-name">{recent.customer_name}</div>
                    <div className="bill-info">
                      <span className="bill-number">Bill #{recent.bill_no}</span>
                      <span className="bill-date">{recent.date}</span>
                    </div>
                  </div>
                  <div className="recent-details">
                    <div className="recent-items">
                      {recent.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="recent-item">
                          <span className="item-wood">{item.wood_type}</span>
                          <span className="item-units">{item.total_units} units</span>
                        </div>
                      ))}
                      {recent.items.length > 3 && (
                        <div className="recent-more">+{recent.items.length - 3} more items</div>
                      )}
                    </div>
                    <div className="recent-total">
                      <span className="total-label">Total:</span>
                      <span className="total-amount">₹{recent.total_amount}</span>
                    </div>
                  </div>
                  <div className="recent-status">
                    <span className={`status status-${recent.status}`}>
                      {STATUS_OPTIONS.find(s => s.value === recent.status)?.label}
                    </span>
                    {recent.isLocal && (
                      <span className="offline-tag" title="Saved offline">📱</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {recentItems.length === 0 && (
              <div className="empty-state">
                <p>No recent estimates found</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="main-content-grid">
        {/* Items Section */}
        <div className="items-section">
          {/* Items Table Section */}
          <div className="card items-card">
            <div className="card-header">
              <h3>Estimate Items</h3>
              <div className="items-header-actions">
                <span className="items-count">{rows.length} item{rows.length !== 1 ? 's' : ''}</span>
                <div className="keyboard-shortcuts-hint">
                  <small>💡 Press Enter to add new row • Use ↑↓ arrows to navigate</small>
                </div>
                <div className="action-buttons">
                  <button onClick={clearAllRows} className="btn-clear" disabled={rows.length <= 1}>
                    Clear All
                  </button>
                  <button onClick={calculateWoodRequirement} className="btn-info">
                    Calculator
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body table-container">
              <div className="items-cards-container">
                {rows.map((r, idx) => (
                  <div key={idx} className={`item-row-card ${efficiencyMode ? 'efficiency-highlight' : ''}`}>
                    <div className="item-card-header">
                      <div className="item-number">Item {idx + 1}</div>
                      <div className="move-buttons">
                        <button 
                          onClick={() => moveRowUp(idx)}
                          disabled={idx === 0}
                          className="btn-move btn-move-up"
                          title="Move Up"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button 
                          onClick={() => moveRowDown(idx)}
                          disabled={idx === rows.length - 1}
                          className="btn-move btn-move-down"
                          title="Move Down"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <table className="items-table">
                      <thead>
                        <tr>
                          <th>Wood Type</th>
                          <th>Type</th>
                          <th>S1</th>
                          <th>S2</th>
                          <th>S3</th>
                          <th>Nos</th>
                          <th>Units</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="item-row">
                          <td>
                            <select 
                              value={r.wood_type} 
                              onChange={e => updateRow(idx, "wood_type", e.target.value)}
                              onFocus={handleInputFocus}
                              className="form-select"
                            >
                              {WOOD_VARIETIES.map(wood => (
                                <option key={wood} value={wood}>{wood}</option>
                              ))}
                            </select>
                          </td>
                          
                          <td>
                            <select 
                              value={r.bill_type} 
                              onChange={e => updateRow(idx, "bill_type", e.target.value)}
                              onFocus={handleInputFocus}
                              className="form-select"
                            >
                              {BILL_TYPES.map(type => (
                                <option key={type} value={type}>{type}</option>
                              ))}
                            </select>
                          </td>
                          
                          {['length', 'breadth', 'height'].map((dimension, dimIdx) => (
                            <td key={dimension}>
                              <input 
                                type="number" 
                                step="0.1" 
                                value={r[dimension]} 
                                onChange={e => updateRow(idx, dimension, e.target.value)}
                                onFocus={handleInputFocus}
                                placeholder={dimIdx === 0 ? "L" : dimIdx === 1 ? "B" : "H"}
                                className="form-input dimension-input"
                              />
                            </td>
                          ))}
                          
                          <td>
                            <input 
                              type="number" 
                              step="1" 
                              value={r.nos} 
                              onChange={e => updateRow(idx, "nos", e.target.value)}
                              onFocus={handleInputFocus}
                              placeholder="Nos"
                              className="form-input"
                            />
                          </td>
                          
                          <td>
                            <input 
                              type="number" 
                              value={r.total_units} 
                              readOnly 
                              className="form-input readonly units-display"
                            />
                          </td>
                          
                          <td>
                            <input 
                              type="number" 
                              step="0.01" 
                              value={r.unit_price} 
                              onChange={e => updateRow(idx, "unit_price", e.target.value)}
                              onFocus={handleInputFocus}
                              placeholder="Price"
                              className="form-input price-input"
                            />
                          </td>
                          
                          <td>
                            <input 
                              type="number" 
                              value={r.total_price} 
                              readOnly 
                              className="form-input readonly total-price"
                            />
                          </td>
                          
                          <td>
                            <div className="row-actions">
                              <button 
                                onClick={() => duplicateRow(idx)}
                                className="btn-duplicate"
                                title="Duplicate Row"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M8 16H6C4.89543 16 4 15.1046 4 14V6C4 4.89543 4.89543 4 6 4H14C15.1046 4 16 4.89543 16 6V8M10 20H18C19.1046 20 20 19.1046 20 18V10C20 8.89543 19.1046 8 18 8H10C8.89543 8 8 8.89543 8 10V18C8 19.1046 8.89543 20 10 20Z" 
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                              <button 
                                onClick={() => removeRow(idx)}
                                className="btn-danger"
                                disabled={rows.length === 1}
                                title="Remove Row"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 6H5H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" 
                                        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="card bulk-actions-card">
            <div className="card-header">
              <h3>Bulk Actions</h3>
            </div>
            <div className="card-body">
              <div className="bulk-action-item">
                <label className="form-label">Apply Same Price to All Items</label>
                <div className="bulk-price-input">
                  <span className="currency-symbol">₹</span>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="Enter price"
                    className="form-input"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        applyBulkPrice(e.target.value);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button 
                    onClick={(e) => {
                      const input = e.target.previousElementSibling;
                      applyBulkPrice(input.value);
                      input.value = '';
                    }}
                    className="btn-success"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Estimate Summary */}
          <div className="card summary-card">
            <div className="card-header">
              <h3>Estimate Summary</h3>
              <span className={`status-badge status-${status}`}>
                {STATUS_OPTIONS.find(s => s.value === status)?.label}
              </span>
            </div>
            <div className="card-body">
              <div className="summary-list">
                <div className="summary-item">
                  <span className="summary-label">Total Items:</span>
                  <span className="summary-value">{totalItems}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Total Volume:</span>
                  <span className="summary-value">{totalVolume.toFixed(2)} units</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Sub Total:</span>
                  <span className="summary-value">₹{calcSubTotal()}</span>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Planing Charges:</span>
                  <div className="charge-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={planingCharges} 
                      onChange={e => setPlaningCharges(e.target.value)}
                      className="charge-input"
                    />
                  </div>
                </div>
                
                <div className="summary-item">
                  <span className="summary-label">Sawing Charges:</span>
                  <div className="charge-input-wrapper">
                    <span className="currency-symbol">₹</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={sawingCharges} 
                      onChange={e => setSawingCharges(e.target.value)}
                      className="charge-input"
                    />
                  </div>
                </div>
                
                <div className="summary-divider"></div>
                
                <div className="summary-total">
                  <span className="total-label">Grand Total:</span>
                  <span className="total-amount">₹{grandTotal}</span>
                </div>
              </div>
              
              <div className="summary-actions">
                <button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="btn-save"
                >
                  {saving ? (
                    <>
                      <span className="loading-spinner"></span>
                      {isOnline ? 'Saving Estimate...' : 'Saving Offline...'}
                    </>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" 
                              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M17 21V13H7V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 3V8H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {isOnline ? 'Save Estimate' : 'Save Offline'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Popular Combinations Modal */}
      {showCombinations && (
        <div className="modal-overlay">
          <div className="modal combinations-modal">
            <div className="modal-header">
              <h3>Popular Wood Combinations</h3>
              <button onClick={() => setShowCombinations(false)} className="btn-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="combinations-header">
                <p>Click on any combination to add it to your estimate</p>
              </div>
              <div className="combinations-grid">
                {POPULAR_COMBINATIONS.map((combination, index) => (
                  <div key={index} className="combination-card" onClick={() => addPopularCombination(combination)}>
                    <div className="combination-header">
                      <h4>{combination.name}</h4>
                      <div className="combination-price">₹{combination.unit_price}/unit</div>
                    </div>
                    <div className="combination-details">
                      <div className="combination-spec">
                        <span className="spec-item">
                          <strong>Type:</strong> {combination.wood_type}
                        </span>
                        <span className="spec-item">
                          <strong>Bill:</strong> {combination.bill_type}
                        </span>
                      </div>
                      <div className="combination-dimensions">
                        {combination.bill_type === "Sizes" ? (
                          <>L: {combination.length}" × B: {combination.breadth}" × H: {combination.height}"</>
                        ) : (
                          <>L: {combination.length}ft × B: {combination.breadth}ft</>
                        )}
                      </div>
                    </div>
                    <div className="combination-footer">
                      <span className="add-indicator">Click to Add →</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-actions">
                <button onClick={() => setShowCombinations(false)} className="btn-secondary">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calculator Modal */}
      {showCalculator && (
        <div className="modal-overlay">
          <div className="modal calculator-modal">
            <div className="modal-header">
              <h3>Wood Requirement Calculator</h3>
              <button onClick={() => setShowCalculator(false)} className="btn-close">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <div className="calculator-container">
                <div className="calculator-input-group">
                  <input
                    type="text"
                    value={calculatorInput}
                    onChange={(e) => setCalculatorInput(e.target.value)}
                    placeholder="Enter calculation (e.g., 10*5/2)"
                    className="calculator-input"
                  />
                </div>
                <button onClick={handleCalculatorCalculation} className="btn-calculate">
                  Calculate
                </button>
                {calculatorResult && (
                  <div className="calculator-result">
                    {calculatorResult}
                  </div>
                )}
                <div className="calculator-tips">
                  <p>💡 You can calculate wood requirements using basic math operations</p>
                  <p>💡 Example: (10 * 5 * 2) / 12 for cubic feet calculation</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .estimate-container {
          max-width: 100%;
          margin: 0 auto;
          padding: 1rem;
          position: relative;
        }

        /* Items Cards Container */
        .items-cards-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .item-row-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }

        .item-row-card:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .item-row-card.efficiency-highlight {
          border-left: 4px solid #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%);
        }

        .item-card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
          padding-bottom: 12px;
          border-bottom: 1px solid #f3f4f6;
        }

        .item-number {
          font-weight: 600;
          color: #374151;
          font-size: 14px;
        }

        .move-buttons {
          display: flex;
          gap: 4px;
        }

        .btn-move {
          padding: 6px;
          border: 1px solid #d1d5db;
          border-radius: 4px;
          background: white;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .btn-move:hover:not(:disabled) {
          background: #f3f4f6;
          border-color: #9ca3af;
          color: #374151;
        }

        .btn-move:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Keep all existing styles below exactly as they were */
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

        /* Keyboard shortcuts hint */
        .keyboard-shortcuts-hint {
          font-size: 0.75rem;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          border-left: 3px solid #3b82f6;
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
        }

        .btn-secondary {
          background: #6b7280;
          color: white;
          height: 44px;
          border: 1px solid #6b7280;
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

        .btn-success {
          background: #059669;
          color: white;
          border: 1px solid #059669;
        }

        .btn-success:hover:not(:disabled) {
          background: #047857;
          border-color: #047857;
        }

        .btn-clear {
          background: #f59e0b;
          color: white;
          border: 1px solid #f59e0b;
        }

        .btn-clear:hover:not(:disabled) {
          background: #d97706;
          border-color: #d97706;
        }

        .btn-duplicate {
          background: #8b5cf6;
          color: white;
          border: 1px solid #8b5cf6;
          padding: 0.375rem;
        }

        .btn-duplicate:hover:not(:disabled) {
          background: #7c3aed;
          border-color: #7c3aed;
        }

        .btn-save {
          background: #059669;
          color: white;
          border: 1px solid #059669;
          width: 100%;
          justify-content: center;
        }

        .btn-save:hover:not(:disabled) {
          background: #047857;
          border-color: #047857;
        }

        .btn-calculate {
          background: #3b82f6;
          color: white;
          border: 1px solid #3b82f6;
          width: 100%;
          justify-content: center;
        }

        .btn-calculate:hover:not(:disabled) {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-close {
          background: none;
          border: none;
          color: #6b7280;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.375rem;
          transition: all 0.2s;
        }

        .btn-close:hover {
          background: #f3f4f6;
          color: #374151;
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

        /* Notification Styles */
        .notification {
          position: fixed;
          top: 1rem;
          right: 1rem;
          z-index: 1000;
          min-width: 320px;
          border-radius: 0.75rem;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
          animation: slideInRight 0.3s ease-out;
          border: 1px solid;
        }

        .notification-success {
          background: #ecfdf5;
          color: #065f46;
          border-color: #a7f3d0;
        }

        .notification-error {
          background: #fef2f2;
          color: #991b1b;
          border-color: #fecaca;
        }

        .notification-info {
          background: #eff6ff;
          color: #1e40af;
          border-color: #dbeafe;
        }

        .notification-content {
          padding: 1rem 1.25rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .notification-message {
          font-weight: 500;
          font-size: 0.875rem;
        }

        .notification-close {
          background: none;
          border: none;
          color: currentColor;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.375rem;
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .notification-close:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.05);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Efficiency Tips */
        .efficiency-tips-card {
          background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
          border: 1px solid #bae6fd;
        }

        .tips-header {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .tips-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .tips-content {
          flex: 1;
        }

        .tips-title {
          font-weight: 600;
          color: #0369a1;
          font-size: 0.875rem;
          margin-bottom: 0.25rem;
        }

        .tips-text {
          color: #0c4a6e;
          font-size: 0.875rem;
          line-height: 1.4;
        }

        .tips-close {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: 0.25rem;
          transition: all 0.2s;
        }

        .tips-close:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #374151;
        }

        /* Stats Grid */
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

        .stat-icon-items {
          background: #fef3c7;
          color: #d97706;
        }

        .stat-icon-volume {
          background: #dbeafe;
          color: #1e40af;
        }

        .stat-icon-wood {
          background: #dcfce7;
          color: #16a34a;
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

        /* Main Content Grid */
        .main-content-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
        }

        .items-section {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        /* Items Table */
        .items-header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .items-count {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        .action-buttons {
          display: flex;
          gap: 0.5rem;
        }

        .table-container {
          padding: 0;
          overflow-x: auto;
        }

        .items-table {
          width: 100%;
          border-collapse: collapse;
        }

        .items-table th {
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

        .items-table td {
          padding: 0.75rem 1rem;
          border-bottom: 1px solid #f3f4f6;
        }

        .item-row:hover {
          background: #f9fafb;
        }

        .item-row:focus-within {
          background: #f0f9ff !important;
          box-shadow: 0 0 0 2px #3b82f6;
        }

        .efficiency-highlight {
          background: #f0f9ff !important;
        }

        .form-select, .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          transition: all 0.2s;
          background: white;
          font-family: inherit;
        }

        .form-select:focus, .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
        }

        .form-input.readonly {
          background: #f9fafb;
          color: #6b7280;
          cursor: not-allowed;
        }

        .dimension-input {
          max-width: 100px;
        }
        
        .nos-input {
           max-width: 50px; 
        }

        .price-input, .total-price {
          max-width: 100px;
        }

        .units-display {
          max-width: 100px;
        }

        .row-actions {
          display: flex;
          gap: 0.25rem;
        }

        .row-actions button {
          padding: 0.375rem;
        }

        /* Bulk Actions */
        .bulk-action-item {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .form-label {
          font-weight: 500;
          color: #374151;
          font-size: 0.875rem;
        }

        .bulk-price-input {
          display: flex;
          gap: 0.5rem;
          align-items: center;
        }

        .bulk-price-input .form-input {
          flex: 1;
        }

        .currency-symbol {
          color: #6b7280;
          font-weight: 500;
        }

        /* Summary Card */
        .summary-card {
          border: 2px solid #e0e4ebff;
          background: white;
        }

        .summary-card .card-header {
          background: linear-gradient(135deg, #d4d3e7ff 0%, #ecebefff 100%);
          color: white;
          border-bottom: none;
        }

        .summary-card .card-header h3 {
          color: black;
        }

        .status-badge {
          padding: 0.375rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-none { background: #6b7280; color: white; }
        .status-pending { background: #d97706; color: white; }
        .status-in_progress { background: #1e40af; color: white; }
        .status-completed { background: #059669; color: white; }
        .status-delayed { background: #dc2626; color: white; }

        .summary-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .summary-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .summary-label {
          font-weight: 500;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .summary-value {
          font-weight: 600;
          color: #1f2937;
          font-size: 0.875rem;
        }

        .charge-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .charge-input-wrapper .currency-symbol {
          position: absolute;
          left: 0.75rem;
          z-index: 10;
        }

        .charge-input {
          padding-left: 1.75rem;
          width: 8rem;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          background: white;
          font-size: 0.875rem;
          height: 2.25rem;
        }

        .summary-divider {
          height: 1px;
          background: #e5e7eb;
          margin: 1rem 0;
        }

        .summary-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 0;
          background: #f8fafc;
          margin: 0 -1.5rem -1.5rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .total-label {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1f2937;
        }

        .total-amount {
          font-size: 1.5rem;
          font-weight: 800;
          color: #059669;
        }

        .summary-actions {
          margin-top: 1.5rem;
        }

        /* Recent Templates */
        .recent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .recent-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .recent-card:hover {
          border-color: #4f46e5;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .recent-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .customer-name {
          font-weight: 600;
          color: #1f2937;
          font-size: 1rem;
        }

        .bill-info {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.25rem;
        }

        .bill-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: #4f46e5;
        }

        .bill-date {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .recent-details {
          margin-bottom: 1rem;
        }

        .recent-items {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .recent-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.375rem 0;
          font-size: 0.875rem;
        }

        .item-wood {
          color: #374151;
          font-weight: 500;
        }

        .item-units {
          color: #6b7280;
        }

        .recent-more {
          font-size: 0.75rem;
          color: #9ca3af;
          text-align: center;
          padding: 0.375rem;
          background: #f9fafb;
          border-radius: 0.375rem;
        }

        .recent-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-top: 1px solid #f3f4f6;
        }

        .total-label {
          font-weight: 500;
          color: #6b7280;
          font-size: 0.875rem;
        }

        .total-amount {
          font-weight: 600;
          color: #059669;
          font-size: 1rem;
        }

        .recent-status {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 0.5rem;
        }

        .status {
          padding: 0.375rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-pending { background: #fef3c7; color: #d97706; }
        .status-completed { background: #d1fae5; color: #059669; }
        .status-in_progress { background: #dbeafe; color: #1e40af; }
        .status-delayed { background: #fee2e2; color: #dc2626; }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .empty-state p {
          margin: 0;
          font-size: 0.875rem;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          max-width: 900px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          border: 1px solid #e5e7eb;
        }

        .modal-header {
          padding: 1.5rem 2rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f9fafb;
          border-radius: 1rem 1rem 0 0;
        }

        .modal-header h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
        }

        .modal-body {
          padding: 2rem;
        }

        /* Popular Combinations Modal */
        .combinations-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .combinations-header p {
          color: #6b7280;
          font-size: 0.875rem;
          margin: 0;
        }

        .combinations-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .combination-card {
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          padding: 1.5rem;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }

        .combination-card:hover {
          border-color: #4f46e5;
          box-shadow: 0 8px 25px -5px rgba(79, 70, 229, 0.15);
          transform: translateY(-2px);
        }

        .combination-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .combination-header h4 {
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
          margin: 0;
          line-height: 1.4;
        }

        .combination-price {
          font-weight: 700;
          color: #059669;
          font-size: 0.875rem;
          background: #ecfdf5;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
        }

        .combination-details {
          margin-bottom: 1rem;
        }

        .combination-spec {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .spec-item {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .spec-item strong {
          color: #374151;
        }

        .combination-dimensions {
          font-size: 0.875rem;
          color: #4f46e5;
          font-weight: 500;
          background: #eef2ff;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          text-align: center;
        }

        .combination-footer {
          border-top: 1px solid #f3f4f6;
          padding-top: 0.75rem;
          text-align: center;
        }

        .add-indicator {
          font-size: 0.75rem;
          color: #4f46e5;
          font-weight: 500;
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          justify-content: center;
          border-top: 1px solid #e5e7eb;
          padding-top: 1.5rem;
        }

        /* Calculator Modal */
        .calculator-container {
          max-width: 400px;
          margin: 0 auto;
        }

        .calculator-input-group {
          margin-bottom: 1.5rem;
        }

        .calculator-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 1rem;
          transition: all 0.2s;
          background: white;
          text-align: center;
        }

        .calculator-input:focus {
          outline: none;
          border-color: #4f46e5;
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
        }

        .calculator-result {
          padding: 1.25rem;
          background: #f0f9ff;
          border: 2px solid #0ea5e9;
          border-radius: 0.75rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: #0369a1;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .calculator-tips {
          background: #f8fafc;
          padding: 1.25rem;
          border-radius: 0.75rem;
          border-left: 4px solid #4f46e5;
        }

        .calculator-tips p {
          margin: 0.5rem 0;
          font-size: 0.875rem;
          color: #6b7280;
          line-height: 1.5;
        }

        .calculator-tips p:first-child {
          margin-top: 0;
        }

        .calculator-tips p:last-child {
          margin-bottom: 0;
        }

        /* Responsive Design */
        @media (max-width: 1024px) {
          .main-content-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .estimate-container {
            padding: 0.5rem;
          }
          
          .page-header {
            flex-direction: column;
            gap: 1rem;
            align-items: stretch;
          }
          
          .header-actions {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .header-actions button {
            width: 100%;
            justify-content: center;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
          
          .action-buttons {
            flex-direction: column;
          }
          
          .items-header-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 0.75rem;
          }
          
          .recent-grid {
            grid-template-columns: 1fr;
          }
          
          .combinations-grid {
            grid-template-columns: 1fr;
          }
          
          .modal {
            width: 95%;
            margin: 1rem;
          }
          
          .modal-body {
            padding: 1.5rem;
          }
          
          .modal-actions {
            flex-direction: column;
          }
          
          .notification {
            left: 1rem;
            right: 1rem;
            min-width: auto;
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

        @media (max-width: 640px) {
          .card-header {
            flex-direction: column;
            gap: 0.75rem;
            align-items: stretch;
          }
          
          .card-header h3 {
            text-align: center;
          }
          
          .table-container {
            font-size: 0.75rem;
          }
          
          .items-table th,
          .items-table td {
            padding: 0.5rem 0.25rem;
          }
        }
      `}</style>
    </div>
  );
}