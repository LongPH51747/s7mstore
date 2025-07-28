import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ENDPOINTS, API_HEADERS } from '../config/api';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentNotification, setCurrentNotification] = useState(null);
  const [lastProductCount, setLastProductCount] = useState(0);
  const [lastProductIds, setLastProductIds] = useState([]);
  const [notifiedProductIds, setNotifiedProductIds] = useState([]); // Track đã thông báo
  const [notifiedOrderIds, setNotifiedOrderIds] = useState([]); // Track order đã thông báo
  const [lastOrderIds, setLastOrderIds] = useState([]); // Track order IDs
  const intervalRef = useRef(null);
  const orderIntervalRef = useRef(null); // Separate interval for orders
  const isCheckingRef = useRef(false); // Prevent multiple checks
  const isCheckingOrdersRef = useRef(false); // Prevent multiple order checks
  const lastCheckRef = useRef(0); // Debounce check calls
  const lastOrderCheckRef = useRef(0); // Debounce order checks
  const lastNotificationRef = useRef(0); // Track last notification time

  // Khởi tạo khi app start
  useEffect(() => {
    initializeNotifications();
    startPolling();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Khởi tạo notifications từ AsyncStorage
  const initializeNotifications = async () => {
    try {
      console.log('🔄 Initializing notifications from AsyncStorage...');
      const savedNotifications = await AsyncStorage.getItem('notifications');
      const savedProductCount = await AsyncStorage.getItem('lastProductCount');
      const savedProductIds = await AsyncStorage.getItem('lastProductIds');
      const savedNotifiedIds = await AsyncStorage.getItem('notifiedProductIds');
      const savedOrderIds = await AsyncStorage.getItem('lastOrderIds');
      const savedNotifiedOrderIds = await AsyncStorage.getItem('notifiedOrderIds');
      

      
      if (savedNotifications) {
        const notifications = JSON.parse(savedNotifications);
        setNotifications(notifications);

      }
      
      if (savedProductCount) {
        const count = parseInt(savedProductCount);
        setLastProductCount(count);
        console.log(`✅ Loaded last product count: ${count}`);
      }

      if (savedProductIds) {
        const ids = JSON.parse(savedProductIds);
        setLastProductIds(ids);

      }

      if (savedNotifiedIds) {
        const notifiedIds = JSON.parse(savedNotifiedIds);
        setNotifiedProductIds(notifiedIds);

      }

      if (savedOrderIds) {
        const orderIds = JSON.parse(savedOrderIds);
        setLastOrderIds(orderIds);

      }

      if (savedNotifiedOrderIds) {
        const notifiedOrderIds = JSON.parse(savedNotifiedOrderIds);
        setNotifiedOrderIds(notifiedOrderIds);

      }
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    }
  };

  // Bắt đầu polling với notifications cho cả products và orders
  const startPolling = () => {

    // Gọi ngay lần đầu
    checkForNewProducts();
    checkForNewOrders();
    
    // Setup interval 90 giây cho products
    intervalRef.current = setInterval(() => {

      checkForNewProducts();
    }, 90000); // 90 giây
    
    // Setup interval 60 giây cho orders (frequent hơn vì order updates quan trọng)
    orderIntervalRef.current = setInterval(() => {

      checkForNewOrders();
    }, 60000); // 60 giây
    

  };

  // Check sản phẩm mới với ENHANCED anti-spam
  const checkForNewProducts = async (forceNotification = true) => {
    // ENHANCED Debounce - chỉ check nếu không đang check và đã qua 30s từ lần check trước  
    const now = Date.now();
    if (isCheckingRef.current || (now - lastCheckRef.current) < 30000) {
      return;
    }

    if (showPopup) {
      return;
    }

    try {
      isCheckingRef.current = true;
      lastCheckRef.current = now;
      
      const response = await axios.get(API_ENDPOINTS.PRODUCTS.GET_ALL, {
        headers: API_HEADERS,
      });

      if (response.data && response.data.length > 0) {
        const currentProducts = response.data;
        const currentProductCount = currentProducts.length;
        const currentProductIds = currentProducts.map(p => p._id || p.id);
        

        
        // Detect new products bằng cách so sánh IDs
        if (lastProductIds.length > 0) {
          const newProductIds = currentProductIds.filter(id => !lastProductIds.includes(id));
          // Filter out những sản phẩm đã thông báo rồi
          const unnotifiedProductIds = newProductIds.filter(id => !notifiedProductIds.includes(id));
          

          
          if (unnotifiedProductIds.length > 0) {

            
            // Tìm sản phẩm mới chưa thông báo để hiển thị
            const unnotifiedProducts = currentProducts.filter(p => 
              unnotifiedProductIds.includes(p._id || p.id)
            );
            
                       // Tạo notification cho từng sản phẩm mới chưa thông báo (hoặc gộp lại)
           if (unnotifiedProducts.length === 1) {
             const newProduct = unnotifiedProducts[0];

             const notification = {
               id: Date.now(),
               type: 'new_product',
               title: 'Sản Phẩm Mới',
               message: `${newProduct.product_name || 'Sản phẩm mới'} vừa được thêm vào cửa hàng`,
               productId: newProduct._id,
               productName: newProduct.product_name,
               productImage: newProduct.product_image ? `https://bdb6e8717f1f.ngrok-free.app${newProduct.product_image}` : null,
               productPrice: newProduct.product_price || 0,
               timestamp: new Date().toLocaleTimeString('vi-VN'),
               isRead: false,
               createdAt: Date.now()
             };
             
                           
             await addNotification(notification);
             
             // Thêm vào danh sách đã thông báo TRƯỚC khi show popup
             await addToNotifiedList(newProduct._id);
             
             // ENHANCED: Check thời gian trước khi show popup
             const now = Date.now();
             if (now - lastNotificationRef.current < 10000) {
               console.log(`⏸️ Too soon since last notification (${now - lastNotificationRef.current}ms), skipping popup`);
             } else {
               lastNotificationRef.current = now;
               showNotificationPopup(notification);
               console.log(`✅ Notification created and popup shown`);
             }
           } else {
             // Nhiều sản phẩm mới
             const firstProduct = newProducts[0];
                            console.log(`🔔 Creating notification for multiple products:`, newProducts.length, 'products');
                            const notification = {
               id: Date.now(),
               type: 'new_product',
               title: 'Nhiều Sản Phẩm Mới',
               message: `${unnotifiedProducts.length} sản phẩm mới được thêm: ${firstProduct.product_name}...`,
               productId: firstProduct._id,
               productName: firstProduct.product_name,
               productImage: firstProduct.product_image ? `https://bdb6e8717f1f.ngrok-free.app${firstProduct.product_image}` : null,
               productPrice: firstProduct.product_price || 0,
               additionalCount: unnotifiedProducts.length - 1,
               timestamp: new Date().toLocaleTimeString('vi-VN'),
               isRead: false,
               createdAt: Date.now()
             };
               
               
             await addNotification(notification);
             
             // Thêm tất cả vào danh sách đã thông báo TRƯỚC khi show popup
             for (const product of unnotifiedProducts) {
               await addToNotifiedList(product._id);
             }
             
             // ENHANCED: Check thời gian trước khi show popup  
             const now = Date.now();
             if (now - lastNotificationRef.current < 10000) {
               console.log(`⏸️ Too soon since last notification (${now - lastNotificationRef.current}ms), skipping popup`);
             } else {
               lastNotificationRef.current = now;
               showNotificationPopup(notification);
               console.log(`✅ Multiple products notification created and all IDs marked as notified`);
             }
           }
          }
          // Lần đầu tiên, chỉ khởi tạo, không tạo notification
        }
        
        // Update cả count và IDs
        setLastProductCount(currentProductCount);
        setLastProductIds(currentProductIds);
        await AsyncStorage.setItem('lastProductCount', currentProductCount.toString());
        await AsyncStorage.setItem('lastProductIds', JSON.stringify(currentProductIds));
      }
    } catch (error) {
      console.error('❌ Error checking for new products:', error);
    } finally {
      isCheckingRef.current = false; // Reset checking flag
    }
  };

  // Thêm notification
  const addNotification = async (notification) => {
    try {
          const updatedNotifications = [notification, ...notifications];
    setNotifications(updatedNotifications);
    await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  // Hiển thị popup với enhanced anti-spam
  const showNotificationPopup = (notification) => {
    if (showPopup) {
      return;
    }

    if (currentNotification && currentNotification.productId === notification.productId) {
      return;
    }
    setCurrentNotification(notification);
    setShowPopup(true);
    
    setTimeout(() => {
      setShowPopup(false);
      setCurrentNotification(null);
    }, 5000);
  };

  const hidePopup = () => {
    setShowPopup(false);
    setCurrentNotification(null);
  };

  // Đánh dấu đã đọc
  const markAsRead = async (notificationId) => {
    try {
      const updatedNotifications = notifications.map(notif =>
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      );
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Đánh dấu tất cả đã đọc
  const markAllAsRead = async () => {
    try {
      const updatedNotifications = notifications.map(notif => ({ ...notif, isRead: true }));
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  // Đếm thông báo chưa đọc
  const getUnreadCount = () => {
    const unreadCount = notifications.filter(notif => !notif.isRead).length;
    console.log(`🔢 Badge Count - Total notifications: ${notifications.length}, Unread: ${unreadCount}`);
    console.log(`🔢 Notifications details:`, notifications.map(n => ({ 
      id: n.id, 
      title: n.title, 
      isRead: n.isRead,
      createdAt: new Date(n.createdAt).toLocaleTimeString()
    })));
    return unreadCount;
  };

  // Xóa notification
  const deleteNotification = async (notificationId) => {
    try {
      const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      console.log('🗑️ Deleted notification:', notificationId);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  // Xóa tất cả notifications
  const deleteAllNotifications = async () => {
    try {
      setNotifications([]);
      await AsyncStorage.setItem('notifications', JSON.stringify([]));
      console.log('🗑️ Deleted all notifications');
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  // Thêm product ID vào danh sách đã thông báo với duplicate check
  const addToNotifiedList = async (productId) => {
    try {
      // ENHANCED: Check duplicate trước khi thêm
      if (notifiedProductIds.includes(productId)) {
        return;
      }
      
      const updatedNotifiedIds = [...notifiedProductIds, productId];
      setNotifiedProductIds(updatedNotifiedIds);
      await AsyncStorage.setItem('notifiedProductIds', JSON.stringify(updatedNotifiedIds));
    } catch (error) {
      console.error('Error saving notified product ID:', error);
    }
  };

  // Check for new orders
  const checkForNewOrders = async () => {
    // Debounce - chỉ check nếu không đang check và đã qua 30s từ lần check trước  
    const now = Date.now();
    if (isCheckingOrdersRef.current || (now - lastOrderCheckRef.current) < 30000) {
      return;
    }

    if (showPopup) {
      return;
    }

    try {
      isCheckingOrdersRef.current = true;
      lastOrderCheckRef.current = now;
      
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (!userInfoString) {
        return;
      }
      
      const userInfo = JSON.parse(userInfoString);
      const userId = userInfo._id;
      
      if (!userId) {
        return;
      }

      const response = await axios.get(API_ENDPOINTS.ORDERS.GET_BY_USER_ID, {
        headers: { ...API_HEADERS, 'userId': userId },
      });

      if (response.data && response.data.length > 0) {
        const currentOrders = response.data;
        const currentOrderIds = currentOrders.map(o => o._id);
        

        
        // Detect new orders bằng cách so sánh IDs
        if (lastOrderIds.length > 0) {
          const newOrderIds = currentOrderIds.filter(id => !lastOrderIds.includes(id));
          const unnotifiedOrderIds = newOrderIds.filter(id => !notifiedOrderIds.includes(id));
          

          
          if (unnotifiedOrderIds.length > 0) {
            
            // Tìm order mới chưa thông báo
            const unnotifiedOrders = currentOrders.filter(o => 
              unnotifiedOrderIds.includes(o._id)
            );
            
            // Tạo notification cho từng order mới
            for (const newOrder of unnotifiedOrders) {
              const notification = {
                id: Date.now() + Math.random(),
                type: 'new_order',
                title: 'Đơn Hàng Mới',
                message: `Đơn hàng ${newOrder._id.slice(-8)} - ${newOrder.status}`,
                orderId: newOrder._id,
                orderStatus: newOrder.status,
                orderTotal: newOrder.total_amount,
                orderItems: newOrder.orderItems?.length || 0,
                timestamp: new Date().toLocaleTimeString('vi-VN'),
                isRead: false,
                createdAt: Date.now()
              };
              

              await addNotification(notification);
              await addToNotifiedOrderList(newOrder._id);
              
              const now = Date.now();
              if (now - lastNotificationRef.current >= 10000) {
                lastNotificationRef.current = now;
                showNotificationPopup(notification);
              }
            }
          }
        }
        
        setLastOrderIds(currentOrderIds);
        await AsyncStorage.setItem('lastOrderIds', JSON.stringify(currentOrderIds));
      }
    } catch (error) {
      console.error('❌ Error checking for new orders:', error);
    } finally {
      isCheckingOrdersRef.current = false;
    }
  };

  // Thêm order ID vào danh sách đã thông báo
  const addToNotifiedOrderList = async (orderId) => {
    try {
      if (notifiedOrderIds.includes(orderId)) {
        return;
      }
      
      const updatedNotifiedOrderIds = [...notifiedOrderIds, orderId];
      setNotifiedOrderIds(updatedNotifiedOrderIds);
      await AsyncStorage.setItem('notifiedOrderIds', JSON.stringify(updatedNotifiedOrderIds));
    } catch (error) {
      console.error('Error saving notified order ID:', error);
    }
  };

  // Clear danh sách đã thông báo (for testing)
  const clearNotifiedList = async () => {
    try {
      setNotifiedProductIds([]);
      setNotifiedOrderIds([]);
      await AsyncStorage.removeItem('notifiedProductIds');
      await AsyncStorage.removeItem('notifiedOrderIds');
    } catch (error) {
      console.error('Error clearing notified list:', error);
    }
  };

  // Test method - Tạo notification giả để test
  const createTestNotification = async () => {
    const testNotification = {
      id: Date.now(),
      type: 'new_product',
      title: 'Sản Phẩm Mới',
      message: `Đồ bộ Pijjama vừa được thêm vào cửa hàng`,
      productId: 'test_' + Date.now(),
      productName: 'Đồ bộ Pijjama (Test)',
      productImage: 'https://via.placeholder.com/100x100?text=Pijjama', // Test image
      productPrice: 120000,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      isRead: false,
      createdAt: Date.now()
    };
    
    console.log('🧪 Creating test notification:', testNotification);
    await addNotification(testNotification);
    showNotificationPopup(testNotification);
  };

  const value = {
    notifications,
    showPopup,
    currentNotification,
    hidePopup,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
    checkForNewProducts,
    checkForNewOrders,

  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}; 