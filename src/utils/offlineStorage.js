// src/utils/offlineStorage.js

const STORAGE_KEYS = {
  ESTIMATES: 'sawmill_estimates',
  USER_DATA: 'sawmill_user_data',
  BILL_COUNTER: 'sawmill_bill_counter',
  SYNC_QUEUE: 'sawmill_sync_queue',
  APP_STATE: 'sawmill_app_state'
};

export const OfflineStorage = {
  // Save data to localStorage
  setItem(key, data) {
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
      return true;
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      return false;
    }
  },

  // Get data from localStorage
  getItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  // Remove data from localStorage
  removeItem(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing from localStorage:', error);
      return false;
    }
  },

  // Clear all app data
  clearAll() {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  },

  // Check if offline storage is available
  isAvailable() {
    try {
      const test = 'test';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }
};

// Specific methods for app data
export const EstimatesStorage = {
  // Save estimates
  saveEstimates(estimates) {
    return OfflineStorage.setItem(STORAGE_KEYS.ESTIMATES, estimates);
  },

  // Get all estimates
  getEstimates() {
    return OfflineStorage.getItem(STORAGE_KEYS.ESTIMATES, []);
  },

  // Save a single estimate
  saveEstimate(estimate) {
    const estimates = this.getEstimates();
    const existingIndex = estimates.findIndex(e => e.id === estimate.id);
    
    if (existingIndex >= 0) {
      estimates[existingIndex] = estimate;
    } else {
      estimates.push(estimate);
    }
    
    return this.saveEstimates(estimates);
  },

  // Get estimate by ID
  getEstimate(id) {
    const estimates = this.getEstimates();
    return estimates.find(estimate => estimate.id === id);
  },

  // Delete estimate
  deleteEstimate(id) {
    const estimates = this.getEstimates();
    const filteredEstimates = estimates.filter(estimate => estimate.id !== id);
    return this.saveEstimates(filteredEstimates);
  }
};

export const SyncQueue = {
  // Add operation to sync queue
  addToQueue(operation) {
    const queue = OfflineStorage.getItem(STORAGE_KEYS.SYNC_QUEUE, []);
    queue.push({
      ...operation,
      timestamp: new Date().toISOString(),
      id: Date.now() + Math.random()
    });
    return OfflineStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, queue);
  },

  // Get sync queue
  getQueue() {
    return OfflineStorage.getItem(STORAGE_KEYS.SYNC_QUEUE, []);
  },

  // Remove from sync queue
  removeFromQueue(operationId) {
    const queue = this.getQueue();
    const filteredQueue = queue.filter(op => op.id !== operationId);
    return OfflineStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, filteredQueue);
  },

  // Clear sync queue
  clearQueue() {
    return OfflineStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, []);
  }
};

export const BillCounter = {
  // Get next bill number
  getNextBillNumber() {
    const counter = OfflineStorage.getItem(STORAGE_KEYS.BILL_COUNTER, 0);
    const nextNumber = counter + 1;
    OfflineStorage.setItem(STORAGE_KEYS.BILL_COUNTER, nextNumber);
    return nextNumber;
  },

  // Set bill counter (useful for syncing)
  setCounter(value) {
    return OfflineStorage.setItem(STORAGE_KEYS.BILL_COUNTER, value);
  },

  // Get current counter
  getCounter() {
    return OfflineStorage.getItem(STORAGE_KEYS.BILL_COUNTER, 0);
  }
};

export const AppState = {
  // Save current app state
  saveState(state) {
    return OfflineStorage.setItem(STORAGE_KEYS.APP_STATE, state);
  },

  // Get saved app state
  getState() {
    return OfflineStorage.getItem(STORAGE_KEYS.APP_STATE, {});
  },

  // Check if user was logged in
  wasUserLoggedIn() {
    const state = this.getState();
    return !!state.user;
  }
};

export default OfflineStorage;