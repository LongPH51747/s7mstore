import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ENDPOINTS, API_HEADERS, API_BASE_URL } from '../config/api';
import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid, AppState } from 'react-native';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [lastProductIds, setLastProductIds] = useState([]);
  const [notifiedProductIds, setNotifiedProductIds] = useState([]);
  const [appState, setAppState] = useState(AppState.currentState);

  // Refs for control
  const isCheckingRef = useRef(false);
  const isCheckingOrdersRef = useRef(false);
  const lastCheckRef = useRef(0);
  const lastOrderCheckRef = useRef(0);
  const lastNotificationRef = useRef(0);
  const intervalRef = useRef(null);
  const orderIntervalRef = useRef(null);
  const backgroundIntervalRef = useRef(null);
  const lastBackgroundCheckRef = useRef(0);

  // Constants
  const NOTIFICATION_STATUSES = [2, 6, 7]; // 2: Đã xác nhận, 6: Đang giao, 7: Giao thành công
  const PRODUCT_CHECK_INTERVAL = 60000; // 60s
  const ORDER_CHECK_INTERVAL = 30000; // 30s
  const BACKGROUND_CHECK_INTERVAL = 120000; // 2 minutes
  const DEBOUNCE_DELAY = 20000; // 20s
  const ORDER_DEBOUNCE_DELAY = 30000; // 30s

  useEffect(() => {
    const initializeApp = async () => {
      await configurePushNotifications();
      await initializeNotifications();
      startPolling();
      setupBackgroundMonitoring();
    };
    
    initializeApp();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (orderIntervalRef.current) {
        clearInterval(orderIntervalRef.current);
      }
      cleanupBackgroundMonitoring();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Request notification permissions
  const requestNotificationPermissions = async () => {
    try {
      if (Platform.OS === 'android' && Platform.constants.Release >= 13) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: 'S7M Store Thông Báo',
            message: 'App cần quyền thông báo để gửi thông báo về sản phẩm mới và đơn hàng.',
            buttonNeutral: 'Hỏi Sau',
            buttonNegative: 'Từ Chối',
            buttonPositive: 'Đồng ý',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      }
      return true;
    } catch (error) {
      console.error('❌ Error in requestNotificationPermissions:', error);
      return false;
    }
  };

  // Configure push notifications
  const configurePushNotifications = async () => {
    const hasPermission = await requestNotificationPermissions();
    
    PushNotification.createChannel(
      {
        channelId: "s7mstore-notifications",
        channelName: "S7M Store Notifications",
        channelDescription: "Thông báo từ S7M Store về sản phẩm mới và đơn hàng",
        playSound: true,
        soundName: "default",
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`🔧 Push notification channel created: ${created}`)
    );

    PushNotification.configure({
      onRegister: function (token) {
        console.log("📱 Push Notification TOKEN:", token);
      },
      onNotification: function (notification) {
        if (notification.userInteraction) {
          global.pendingNotificationNavigation = {
            screen: notification.userInfo?.screen || 'NotificationScreen',
            action: notification.userInfo?.action || 'open_notifications',
            timestamp: Date.now()
          };
        }
      },
      onAction: function (notification) {
        console.log("🎬 Push Notification action:", notification.action);
      },
      onRegistrationError: function(err) {
        console.error("❌ Push Notification registration error:", err.message);
      },
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      popInitialNotification: true,
      requestPermissions: Platform.OS === 'ios',
    });
  };

  // Initialize notifications from AsyncStorage
  const initializeNotifications = async () => {
    try {
      const [savedNotifications, savedProductIds, savedNotifiedIds] = 
        await Promise.all([
          AsyncStorage.getItem('notifications'),
          AsyncStorage.getItem('lastProductIds'),
          AsyncStorage.getItem('notifiedProductIds')
        ]);

      if (savedNotifications) {
        const notifications = JSON.parse(savedNotifications);
        const cleanedNotifications = removeDuplicateNotifications(notifications);
        
        if (cleanedNotifications.length !== notifications.length) {
          await AsyncStorage.setItem('notifications', JSON.stringify(cleanedNotifications));
        }
        
        setNotifications(cleanedNotifications);
      }

      if (savedProductIds) setLastProductIds(JSON.parse(savedProductIds));
      if (savedNotifiedIds) setNotifiedProductIds(JSON.parse(savedNotifiedIds));
    } catch (error) {
      console.error('❌ Error loading notifications:', error);
    }
  };

  // Remove duplicate notifications
  const removeDuplicateNotifications = (notifications) => {
    const cleanedNotifications = [];
    const seenOrderIds = new Set();
    const seenProductIds = new Set();
    
    notifications.forEach(notification => {
      let isDuplicate = false;
      
      if (notification.type === 'new_order' && notification.orderId) {
        if (seenOrderIds.has(notification.orderId)) {
          isDuplicate = true;
        } else {
          seenOrderIds.add(notification.orderId);
        }
      } else if (notification.type === 'new_product' && notification.productId) {
        if (seenProductIds.has(notification.productId)) {
          isDuplicate = true;
        } else {
          seenProductIds.add(notification.productId);
        }
      }
      
      if (!isDuplicate) {
        cleanedNotifications.push(notification);
      }
    });
    
    return cleanedNotifications;
  };

  // Start polling
  const startPolling = () => {
    checkForNewProducts();
    checkForOrderStatusChanges();
    
    intervalRef.current = setInterval(() => {
      checkForNewProducts();
    }, PRODUCT_CHECK_INTERVAL);
    
    orderIntervalRef.current = setInterval(() => {
      checkForOrderStatusChanges();
    }, ORDER_CHECK_INTERVAL);
  };

  // Setup background monitoring
  const setupBackgroundMonitoring = () => {
    const handleAppStateChange = (nextAppState) => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        if (global.pendingNotificationNavigation) {
          const pendingNav = global.pendingNotificationNavigation;
          global.pendingNotificationNavigation = null;
          
          setTimeout(() => {
            try {
              if (global.navigationService) {
                global.navigationService.navigate(pendingNav.screen);
              } else if (global._navigator) {
                global._navigator.navigate(pendingNav.screen);
              }
            } catch (error) {
              console.error('❌ Error navigating from notification:', error);
            }
          }, 500);
        }
        
        checkForNewProducts();
        checkForOrderStatusChanges();
        stopBackgroundTasks();
      } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        startBackgroundTasks();
      }
      
      setAppState(nextAppState);
    };

    AppState.addEventListener('change', handleAppStateChange);
  };

  // Background tasks management
  const startBackgroundTasks = () => {
    if (backgroundIntervalRef.current) clearInterval(backgroundIntervalRef.current);
    
    backgroundIntervalRef.current = setInterval(() => {
      const now = Date.now();
      if (now - lastBackgroundCheckRef.current < BACKGROUND_CHECK_INTERVAL) {
        if (appState !== 'active') {
          checkForNewProducts();
          checkForOrderStatusChanges();
        }
        lastBackgroundCheckRef.current = now;
      } else {
        stopBackgroundTasks();
      }
    }, BACKGROUND_CHECK_INTERVAL);
    
    lastBackgroundCheckRef.current = Date.now();
  };

  const stopBackgroundTasks = () => {
    if (backgroundIntervalRef.current) {
      clearInterval(backgroundIntervalRef.current);
      backgroundIntervalRef.current = null;
    }
  };

  const cleanupBackgroundMonitoring = () => {
    stopBackgroundTasks();
  };

  // Check for new products
  const checkForNewProducts = async () => {
    const now = Date.now();
    if (isCheckingRef.current || (now - lastCheckRef.current) < DEBOUNCE_DELAY) {
      console.log('🔄 Product check skipped - debounce active or already checking');
      return;
    }

    try {
      isCheckingRef.current = true;
      lastCheckRef.current = now;
      
      console.log('🔍 Checking for new products...');
      console.log('📦 Current notified products:', notifiedProductIds.length);
      console.log('📦 Last known product IDs:', lastProductIds.length);
      
      const response = await axios.get(API_ENDPOINTS.PRODUCTS.GET_ALL, {
        headers: API_HEADERS,
        timeout: 15000,
      });

      if (response.data && response.data.length > 0) {
        const currentProducts = response.data;
        const currentProductIds = currentProducts.map(p => p._id || p.id);
        
        console.log('📦 Total products from API:', currentProductIds.length);
        
        if (lastProductIds.length > 0) {
          // Chỉ xử lý những sản phẩm thực sự mới (chưa từng thấy)
          const newProductIds = currentProductIds.filter(id => !lastProductIds.includes(id));
          console.log('🆕 New product IDs found:', newProductIds.length);
          
          if (newProductIds.length > 0) {
            // Lọc ra những sản phẩm chưa được thông báo
            const unnotifiedProductIds = newProductIds.filter(id => !notifiedProductIds.includes(id));
            console.log('🔔 Unnotified product IDs:', unnotifiedProductIds.length);
            
            if (unnotifiedProductIds.length > 0) {
              const unnotifiedProducts = currentProducts.filter(p => 
                unnotifiedProductIds.includes(p._id || p.id)
              );
              
              // Group by name để tránh duplicate variants
              const groupedProducts = groupProductsByName(unnotifiedProducts);
              const uniqueProducts = Object.values(groupedProducts);
              
              console.log('🎯 Processing unique products:', uniqueProducts.length);
              
              for (const product of uniqueProducts) {
                console.log('🔔 Processing product:', product.name);
                
                // Double check - đảm bảo chưa được thông báo
                if (!notifiedProductIds.includes(product.id)) {
                  await processNewProductNotification(product);
                  await addToNotifiedList(product.id);
                  
                  // Đợi 2 giây trước khi xử lý sản phẩm tiếp theo
                  await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                  console.log('⚠️ Product already notified, skipping:', product.name);
                }
              }
            } else {
              console.log('📝 All new products already notified');
            }
          } else {
            console.log('📝 No new products found');
          }
        } else {
          // Lần đầu check - chỉ xử lý sản phẩm rất mới (5 phút gần đây)
          console.log('📝 First time checking - looking for very recent products');
          const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
          const recentProducts = currentProducts.filter(product => {
            const createdAt = new Date(product.createdAt || product.created_at).getTime();
            return createdAt > fiveMinutesAgo;
          });

          console.log('🆕 Recent products (last 5 min):', recentProducts.length);

          if (recentProducts.length > 0) {
            for (const recentProduct of recentProducts) {
              console.log('🔔 Processing first-time product:', recentProduct.product_name);
              
              await processNewProductNotification({
                id: recentProduct._id,
                name: recentProduct.product_name,
                price: recentProduct.product_price || 0,
                image: recentProduct.product_image
              });
              
              await addToNotifiedList(recentProduct._id);
              await new Promise(resolve => setTimeout(resolve, 2000));
            }
          } else {
            console.log('📝 No recent products found in last 5 minutes');
          }
        }

        // Cập nhật danh sách sản phẩm đã biết
        setLastProductIds(currentProductIds);
        await AsyncStorage.setItem('lastProductIds', JSON.stringify(currentProductIds));
        console.log('💾 Updated lastProductIds:', currentProductIds.length, 'products');
      }
    } catch (error) {
      console.error('❌ Error checking for new products:', error);
    } finally {
      isCheckingRef.current = false;
    }
  };



  // Group products by name to avoid duplicates
  const groupProductsByName = (products) => {
    return products.reduce((acc, product) => {
      const productName = (product.product_name || product.productName || '').trim().toLowerCase();
      const baseId = product.base_product_id || productName || product._id;
      
      if (!acc[baseId]) {
        acc[baseId] = {
          id: product._id,
          name: product.product_name || product.productName,
          price: product.product_price || 0,
          image: product.product_image,
          variants: 1,
          baseId: baseId
        };
      } else {
        acc[baseId].variants++;
      }
      return acc;
    }, {});
  };

  // Process new product notification
  const processNewProductNotification = async (newProduct) => {
    const productId = newProduct.id;
    
    if (notifiedProductIds.includes(productId)) {
      return;
    }

    try {
      const notification = {
        id: Date.now() + Math.random(),
        type: 'new_product',
        title: 'Sản Phẩm Mới',
        message: `${newProduct.name} vừa được thêm vào cửa hàng`,
        productId: productId,
        productName: newProduct.name,
        productImage: newProduct.image ? `${API_BASE_URL}${newProduct.image}` : null,
        productPrice: newProduct.price,
        timestamp: new Date().toLocaleTimeString('vi-VN'),
        isRead: false,
        createdAt: Date.now()
      };

      await addNotification(notification);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await showNotificationPopup(notification);
      await addToNotifiedList(productId);
      
    } catch (error) {
      console.error('❌ Error processing product notification:', error);
    }
  };

  // Check for order status changes
  const checkForOrderStatusChanges = async () => {
    const now = Date.now();
    if (isCheckingOrdersRef.current || (now - lastOrderCheckRef.current) < ORDER_DEBOUNCE_DELAY) {
      return;
    }

    try {
      isCheckingOrdersRef.current = true;
      lastOrderCheckRef.current = now;
      
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (!userInfoString) return;
      
      const userInfo = JSON.parse(userInfoString);
      const userId = userInfo._id;
      if (!userId) return;

      const orderApiUrl = `${API_BASE_URL}/api/order/getByUserId/${userId}`;
      const response = await axios.get(orderApiUrl, { headers: API_HEADERS });

      if (response.data && response.data.length > 0) {
        const currentOrders = response.data;
        const ordersForNotification = currentOrders.filter(order => 
          NOTIFICATION_STATUSES.includes(order.status)
        );
        
        const savedOrderStatusesStr = await AsyncStorage.getItem('orderStatuses');
        const savedOrderStatuses = savedOrderStatusesStr ? JSON.parse(savedOrderStatusesStr) : {};
        
        const statusChanges = [];
        
        for (const order of ordersForNotification) {
          const orderId = order._id;
          const currentStatus = order.status;
          const savedStatus = savedOrderStatuses[orderId];
          
          if (savedStatus && savedStatus !== currentStatus) {
            statusChanges.push({
              orderId,
              oldStatus: savedStatus,
              newStatus: currentStatus,
              order: order
            });
          } else if (!savedStatus) {
            statusChanges.push({
              orderId,
              oldStatus: null,
              newStatus: currentStatus,
              order: order
            });
          }
          
          savedOrderStatuses[orderId] = currentStatus;
        }

        for (const change of statusChanges) {
          const { orderId, oldStatus, newStatus, order } = change;
          
          const notification = createOrderStatusNotification(orderId, oldStatus, newStatus, order);
          
          const currentNotificationsStr = await AsyncStorage.getItem('notifications');
          const currentNotifications = currentNotificationsStr ? JSON.parse(currentNotificationsStr) : [];
          
          const isDuplicate = currentNotifications.some(n => 
            n.orderId === orderId && n.orderStatus === newStatus
          );
          
          if (!isDuplicate) {
            await addNotification(notification);
            await new Promise(resolve => setTimeout(resolve, 1000));
            await showNotificationPopup(notification);
            lastNotificationRef.current = Date.now();
          }
        }
        
        await AsyncStorage.setItem('orderStatuses', JSON.stringify(savedOrderStatuses));
      }
    } catch (error) {
      console.error('❌ Error checking for new orders:', error);
    } finally {
      isCheckingOrdersRef.current = false;
    }
  };



  // Create order status notification
  const createOrderStatusNotification = (orderId, oldStatus, newStatus, order) => {
    let title, message;
    switch (newStatus) {
      case 2:
        title = 'Đơn Hàng Đã Xác Nhận';
        message = `Đơn hàng ****${orderId.slice(-4)} đã được xác nhận`;
        break;
      case 6:
        title = 'Đơn Hàng Đang Giao';
        message = `Đơn hàng ****${orderId.slice(-4)} đang được giao`;
        break;
      case 7:
        title = 'Đơn Hàng Giao Thành Công';
        message = `Đơn hàng ****${orderId.slice(-4)} đã giao thành công`;
        break;
      default:
        title = 'Cập Nhật Đơn Hàng';
        message = `Đơn hàng ****${orderId.slice(-4)} - Trạng thái: ${newStatus}`;
    }
    
    return {
      id: Date.now() + Math.random(),
      type: 'order_status_change',
      title: title,
      message: message,
      orderId: orderId,
      orderStatus: newStatus,
      oldStatus: oldStatus,
      orderTotal: order.total_amount,
      orderItems: order.orderItems?.length || 0,
      timestamp: new Date().toLocaleTimeString('vi-VN'),
      isRead: false,
      createdAt: Date.now()
    };
  };



  // Add notification
  const addNotification = async (notification) => {
    try {
      const currentNotificationsStr = await AsyncStorage.getItem('notifications');
      const currentNotifications = currentNotificationsStr ? JSON.parse(currentNotificationsStr) : [];
      
      let isDuplicate = false;
      
      if (notification.type === 'new_order' && notification.orderId) {
        isDuplicate = currentNotifications.some(n => 
          n.type === 'new_order' && n.orderId === notification.orderId
        );
      } else if (notification.type === 'new_product' && notification.productId) {
        isDuplicate = currentNotifications.some(n => 
          n.type === 'new_product' && n.productId === notification.productId
        );
      }
      
      if (isDuplicate) return;
      
      const updatedNotifications = [notification, ...currentNotifications];
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  // Show notification popup
  const showNotificationPopup = async (notification) => {
    try {
      let simpleTitle = "📱 S7M Store";
      let simpleMessage = "Có sản phẩm mới! Bấm để xem chi tiết";
      
      if (notification.type === 'new_product') {
        simpleMessage = "🛍️ Có 1 sản phẩm mới! Bấm để xem";
      } else if (notification.type === 'order_status_change') {
        switch (notification.orderStatus) {
          case 2:
            simpleMessage = "✅ Đơn hàng đã xác nhận! Bấm để xem";
            break;
          case 6:
            simpleMessage = "🚚 Đơn hàng đang giao! Bấm để xem";
            break;
          case 7:
            simpleMessage = "🎉 Đơn hàng giao thành công! Bấm để xem";
            break;
          default:
            simpleMessage = "📦 Đơn hàng có cập nhật! Bấm để xem";
        }
      }
      
      PushNotification.localNotification({
        title: simpleTitle,
        message: simpleMessage,
        channelId: "s7mstore-notifications",
        userInfo: {
          screen: 'NotificationScreen',
          action: 'open_notifications'
        },
        playSound: true,
        vibrate: true,
        autoCancel: true,
        largeIcon: "ic_launcher",
        id: Math.floor(Date.now() / 1000),
      });
    } catch (error) {
      console.error('❌ Error in notification:', error);
    }
  };

  // Utility functions
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

  const markAllAsRead = async () => {
    try {
      const updatedNotifications = notifications.map(notif => ({ ...notif, isRead: true }));
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const getUnreadCount = () => {
    return notifications.filter(notif => !notif.isRead).length;
  };

  const deleteNotification = async (notificationId) => {
    try {
      const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const deleteAllNotifications = async () => {
    try {
      setNotifications([]);
      await AsyncStorage.setItem('notifications', JSON.stringify([]));
    } catch (error) {
      console.error('Error deleting all notifications:', error);
    }
  };

  const cleanDuplicateNotifications = async () => {
    try {
      const cleanedNotifications = removeDuplicateNotifications(notifications);
      setNotifications(cleanedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(cleanedNotifications));
      
      return {
        original: notifications.length,
        cleaned: cleanedNotifications.length,
        removed: notifications.length - cleanedNotifications.length
      };
    } catch (error) {
      console.error('Error cleaning notifications:', error);
      return null;
    }
  };

  const addToNotifiedList = async (productId) => {
    try {
      if (notifiedProductIds.includes(productId)) {
        console.log('⚠️ Product already in notified list:', productId);
        return;
      }
      
      const updatedNotifiedIds = [...notifiedProductIds, productId];
      setNotifiedProductIds(updatedNotifiedIds);
      await AsyncStorage.setItem('notifiedProductIds', JSON.stringify(updatedNotifiedIds));
      
      console.log('✅ Added product to notified list:', productId);
      console.log('📊 Total notified products:', updatedNotifiedIds.length);
    } catch (error) {
      console.error('❌ Error saving notified product ID:', error);
    }
  };

  const clearNotifiedList = async () => {
    try {
      setNotifiedProductIds([]);
      await AsyncStorage.removeItem('notifiedProductIds');
    } catch (error) {
      console.error('Error clearing notified list:', error);
    }
  };

  const resetNotificationSystem = async () => {
    try {
      setNotifications([]);
      setNotifiedProductIds([]);
      setLastProductIds([]);
      
      await Promise.all([
        AsyncStorage.setItem('notifications', JSON.stringify([])),
        AsyncStorage.setItem('notifiedProductIds', JSON.stringify([])),
        AsyncStorage.setItem('lastProductIds', JSON.stringify([]))
      ]);
      
      console.log('🔄 RESET: Complete notification system reset');
    } catch (error) {
      console.error('Error resetting notification system:', error);
    }
  };

  // Debug function để kiểm tra trạng thái notification system
  const debugNotificationSystem = () => {
    console.log('🔍 === NOTIFICATION SYSTEM DEBUG ===');
    console.log('📦 Total notifications:', notifications.length);
    console.log('📦 Last product IDs:', lastProductIds.length);
    console.log('📦 Notified product IDs:', notifiedProductIds.length);
    console.log('📦 Is checking products:', isCheckingRef.current);
    console.log('📦 Last check time:', new Date(lastCheckRef.current).toLocaleTimeString());
    console.log('📦 App state:', appState);
    
    if (notifiedProductIds.length > 0) {
      console.log('📦 First 5 notified product IDs:', notifiedProductIds.slice(0, 5));
    }
    
    if (lastProductIds.length > 0) {
      console.log('📦 First 5 last product IDs:', lastProductIds.slice(0, 5));
    }
    
    console.log('🔍 === END DEBUG ===');
  };

  // Force check for new products (bypass debounce for testing)
  const forceCheckNewProducts = async () => {
    console.log('🚀 Force checking for new products...');
    lastCheckRef.current = 0; // Reset debounce
    isCheckingRef.current = false; // Reset checking state
    await checkForNewProducts();
  };

  const value = {
    notifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    getUnreadCount,
    checkForNewProducts,
    checkForOrderStatusChanges,
    clearNotifiedList,
    resetNotificationSystem,
    requestNotificationPermissions,
    cleanDuplicateNotifications,
    debugNotificationSystem,
    forceCheckNewProducts
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