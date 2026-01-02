// src/services/offlineService.js
import { EstimatesStorage, SyncQueue, BillCounter, AppState } from '../utils/offlineStorage';
import { db, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, runTransaction } from '../firebase';

export const OfflineService = {
  // Save estimate offline and add to sync queue
  async saveEstimateOffline(estimateData) {
    try {
      // Generate local ID if not present
      const localEstimate = {
        ...estimateData,
        id: estimateData.id || `local_${Date.now()}`,
        isLocal: true,
        createdAt: new Date().toISOString(),
        bill_no: estimateData.bill_no || BillCounter.getNextBillNumber()
      };

      // Save to local storage
      await EstimatesStorage.saveEstimate(localEstimate);

      // Add to sync queue
      await SyncQueue.addToQueue({
        type: 'CREATE_ESTIMATE',
        data: localEstimate,
        localId: localEstimate.id
      });

      return {
        success: true,
        data: localEstimate,
        message: 'Estimate saved offline'
      };
    } catch (error) {
      console.error('Error saving estimate offline:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Sync all pending operations when online
  async syncPendingOperations() {
    const queue = SyncQueue.getQueue();
    const results = [];

    for (const operation of queue) {
      try {
        let result;
        
        switch (operation.type) {
          case 'CREATE_ESTIMATE':
            result = await this.syncCreateEstimate(operation);
            break;
          case 'UPDATE_ESTIMATE':
            result = await this.syncUpdateEstimate(operation);
            break;
          case 'DELETE_ESTIMATE':
            result = await this.syncDeleteEstimate(operation);
            break;
          default:
            console.warn('Unknown operation type:', operation.type);
        }

        if (result && result.success) {
          // Remove from queue on successful sync
          await SyncQueue.removeFromQueue(operation.id);
          results.push({ ...result, operationId: operation.id });
        }
      } catch (error) {
        console.error('Error syncing operation:', error);
        results.push({
          success: false,
          error: error.message,
          operationId: operation.id
        });
      }
    }

    return results;
  },

  // Sync create estimate operation
  async syncCreateEstimate(operation) {
    try {
      const estimateData = { ...operation.data };
      delete estimateData.id; // Let Firebase generate the ID
      delete estimateData.isLocal;

      // Save to Firebase
      const docRef = await addDoc(collection(db, "estimates"), {
        ...estimateData,
        syncedAt: new Date().toISOString()
      });

      // Update local storage with Firebase ID
      const localEstimates = EstimatesStorage.getEstimates();
      const updatedEstimates = localEstimates.map(est => 
        est.id === operation.localId 
          ? { ...est, id: docRef.id, isLocal: false, firebaseId: docRef.id }
          : est
      );
      
      EstimatesStorage.saveEstimates(updatedEstimates);

      return {
        success: true,
        firebaseId: docRef.id,
        localId: operation.localId
      };
    } catch (error) {
      throw new Error(`Failed to sync create estimate: ${error.message}`);
    }
  },

  // Get all estimates (online + offline)
  async getAllEstimates() {
    try {
      // Get local estimates
      const localEstimates = EstimatesStorage.getEstimates();
      
      // Try to get online estimates
      try {
        const estimatesRef = collection(db, "estimates");
        const q = query(estimatesRef, orderBy("bill_no", "desc"));
        const querySnapshot = await getDocs(q);
        
        const onlineEstimates = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Merge and remove duplicates (prefer online versions)
        const localMap = new Map(localEstimates
          .filter(est => est.isLocal)
          .map(est => [est.bill_no, est]));

        const mergedEstimates = [
          ...onlineEstimates,
          ...Array.from(localMap.values())
        ].sort((a, b) => b.bill_no - a.bill_no);

        return mergedEstimates;
      } catch (onlineError) {
        console.warn('Online fetch failed, using local data:', onlineError);
        return localEstimates;
      }
    } catch (error) {
      console.error('Error getting estimates:', error);
      return EstimatesStorage.getEstimates();
    }
  },

  // Check if we need to sync
  hasPendingOperations() {
    const queue = SyncQueue.getQueue();
    return queue.length > 0;
  }
};

export default OfflineService;