// src/hooks/useNotification.js
import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "" });
    }, 4000);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification({ show: false, message: "", type: "" });
  }, []);

  return {
    notification,
    showNotification,
    hideNotification
  };
};

export default useNotification;