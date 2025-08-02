import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_ENDPOINTS, API_HEADERS, API_BASE_URL } from '../config/api';
import PushNotification from 'react-native-push-notification';
import { Platform, PermissionsAndroid, AppState } from 'react-native';

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
  
  // ✅ NEW: Single notification processing tracker
  const [processingNotifications, setProcessingNotifications] = useState(new Set());
  const processingRef = useRef(new Set());

  // Refs for debouncing and control
  const isCheckingRef = useRef(false);
  const isCheckingOrdersRef = useRef(false); // Prevent multiple order checks
  const lastCheckRef = useRef(0); // Debounce check calls
  const lastOrderCheckRef = useRef(0); // Debounce order checks
  const lastNotificationRef = useRef(0); // Track last notification time
  
  // ✅ FIX: Missing interval refs
  const intervalRef = useRef(null);
  const orderIntervalRef = useRef(null);

  // ✅ NEW: Background monitoring state
  const [appState, setAppState] = useState(AppState.currentState);
  const backgroundTaskRef = useRef(null);
  const backgroundIntervalRef = useRef(null);
  const lastBackgroundCheckRef = useRef(0);

  // Khởi tạo khi app start
  useEffect(() => {
    const initializeApp = async () => {
      // Setup push notifications with permissions
      await configurePushNotifications();
      
      await initializeNotifications();
      startPolling();
      
      // ✅ NEW: Setup background monitoring
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
      
      // ✅ NEW: Cleanup background monitoring
      cleanupBackgroundMonitoring();
    };
  }, []);

  // ✅ REQUEST NOTIFICATION PERMISSIONS
  const requestNotificationPermissions = async () => {
    try {
      console.log('🔐 Requesting notification permissions...');
      
      if (Platform.OS === 'android') {
        const SDK_INT = Platform.constants.Release;
        console.log('📱 Android SDK version:', SDK_INT);
        
        if (SDK_INT >= 13) { // Android 13+
          console.log('📱 Android 13+ detected, requesting POST_NOTIFICATIONS permission...');
          try {
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
              {
                title: 'S7M Store Thông Báo',
                message: 'App cần quyền thông báo để gửi thông báo về sản phẩm mới và đơn hàng.',
                buttonNeutral: 'Hỏi Sau',
                buttonNegative: 'Từ Chối',
                buttonPositive: 'Đồng Ý',
              }
            );
            
            if (granted === PermissionsAndroid.RESULTS.GRANTED) {
              console.log('✅ Notification permission granted');
              return true;
            } else {
              console.warn('⚠️ Notification permission denied');
              return false;
            }
          } catch (err) {
            console.error('❌ Error requesting notification permission:', err);
            return false;
          }
        } else {
          console.log('📱 Android < 13, permissions handled automatically via manifest');
          return true;
        }
      } else if (Platform.OS === 'ios') {
        console.log('📱 iOS detected, permissions will be requested via PushNotification.configure');
        return true;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error in requestNotificationPermissions:', error);
      return false;
    }
  };

  // Configure push notification settings
  const configurePushNotifications = async () => {
    console.log('🔧 Configuring push notifications...');
    
    // Request permissions first
    const hasPermission = await requestNotificationPermissions();
    console.log('🔐 Permission result:', hasPermission);
    
    if (!hasPermission) {
      console.warn('⚠️ Notification permissions not granted, notifications may not work');
    }
    
    // Create notification channel for Android
    PushNotification.createChannel(
      {
        channelId: "s7mstore-notifications", // (required)
        channelName: "S7M Store Notifications", // (required)
        channelDescription: "Thông báo từ S7M Store về sản phẩm mới và đơn hàng", // (optional) default: undefined.
        playSound: true, // (optional) default: true
        soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
        importance: 4, // (optional) default: 4. Int value of the Android notification importance
        vibrate: true, // (optional) default: true. Creates the default vibration patten if true.
      },
      (created) => console.log(`🔧 Push notification channel created: ${created}`) // (optional) callback returns whether the channel was created, false means it already existed.
    );

          // ENHANCED: Check if we can create channel
      console.log('🔧 Attempting to create notification channel...');
      
      // Configure push notification
      PushNotification.configure({
      // (optional) Called when Token is generated (iOS and Android)
      onRegister: function (token) {
        console.log("📱 Push Notification TOKEN:", token);
      },

      // (required) Called when a remote is received or opened, or local notification is opened
      onNotification: function (notification) {
        console.log("📲 Push Notification received:", notification);
        
        // Handle notification tap - Deep linking to notification screen
        if (notification.userInteraction) {
          console.log("👆 User tapped notification");
          console.log("📋 Notification data:", notification);
          
          // Get target screen from userInfo
          const targetScreen = notification.userInfo?.screen || 'NotificationScreen';
          const action = notification.userInfo?.action || 'open_notifications';
          
          console.log("🎯 Target screen:", targetScreen, "Action:", action);
          
          // Store notification data for navigation when app becomes active
          global.pendingNotificationNavigation = {
            screen: targetScreen,
            action: action,
            timestamp: Date.now()
          };
          
          console.log("✅ Notification navigation queued for when app becomes active");
        }
      },

      // (optional) Called when Registered Action is pressed and invokeApp is false, if true onNotification will be called (Android)
      onAction: function (notification) {
        console.log("🎬 Push Notification action:", notification.action);
      },

      // (optional) Called when the user fails to register for remote notifications. Typically occurs when APNS is having issues, or the device is a simulator. (iOS)
      onRegistrationError: function(err) {
        console.error("❌ Push Notification registration error:", err.message, err);
      },

      // IOS ONLY (optional): default: all - Permissions to register.
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },

      // Should the initial notification be popped automatically
      // default: true
      popInitialNotification: true,

      /**
       * (optional) default: true
       * - Specified if permissions (ios) and token (android and ios) will requested or not,
       * - if not, you must call PushNotification.requestPermissions() later
       * - if you are not using remote notification or do not have Firebase installed, use this:
       *     requestPermissions: Platform.OS === 'ios'
       */
      requestPermissions: Platform.OS === 'ios',
    });

    console.log('✅ Push notifications configured successfully');
  };

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
          console.log('💾 Loading saved notifications:', notifications.length, 'notifications found');
          
          // CLEANUP: Remove duplicates from existing data
          const cleanedNotifications = [];
          const seenOrderIds = new Set();
          const seenProductIds = new Set();
          
          notifications.forEach(notification => {
            let isDuplicate = false;
            
            if (notification.type === 'new_order' && notification.orderId) {
              if (seenOrderIds.has(notification.orderId)) {
                isDuplicate = true;
                console.log('🧹 Removing duplicate order notification:', notification.orderId.slice(-4));
              } else {
                seenOrderIds.add(notification.orderId);
              }
            } else if (notification.type === 'new_product' && notification.productId) {
              if (seenProductIds.has(notification.productId)) {
                isDuplicate = true;
                console.log('🧹 Removing duplicate product notification:', notification.productName);
              } else {
                seenProductIds.add(notification.productId);
              }
            }
            
            if (!isDuplicate) {
              cleanedNotifications.push(notification);
            }
          });
          
          console.log('🧹 Cleaned notifications:', cleanedNotifications.length, 'remaining from', notifications.length, 'original');
          
          // Save cleaned data back to AsyncStorage
          if (cleanedNotifications.length !== notifications.length) {
            await AsyncStorage.setItem('notifications', JSON.stringify(cleanedNotifications));
            console.log('🧹 ✅ Saved cleaned notifications to AsyncStorage');
          }
          
          setNotifications(cleanedNotifications);
          console.log('💾 ✅ Set notifications state with', cleanedNotifications.length, 'items');
        } else {
          console.log('💾 No saved notifications found - starting fresh');
          setNotifications([]);
        }
      
      if (savedProductCount) {
        const count = parseInt(savedProductCount);
        setLastProductCount(count);
        console.log(`✅ Loaded last product count: ${count}`);
      }

      if (savedProductIds) {
        const ids = JSON.parse(savedProductIds);
        console.log('💾 Loading lastProductIds from AsyncStorage:', ids.length, 'items');
        console.log('💾 First 3 lastProductIds:', ids.slice(0, 3));
        setLastProductIds(ids);
      } else {
        console.log('💾 No lastProductIds found in AsyncStorage - starting fresh');
        setLastProductIds([]);
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
    checkForOrderStatusChanges();
    
    // Setup interval 60 giây cho products (same as orders for faster response)
    intervalRef.current = setInterval(() => {
      console.log('⏰ Product interval triggered');
      checkForNewProducts();
    }, 60000); // 60 giây (reduced from 90s)
    
    // Setup interval 30 giây cho orders (faster để catch status changes)
    orderIntervalRef.current = setInterval(() => {
      console.log('⏰ Order interval triggered');
      checkForOrderStatusChanges();
    }, 30000); // 30 giây
    

  };

  // ✅ NEW: Setup background monitoring cho notifications 
  const setupBackgroundMonitoring = () => {
    console.log('🔄 [BACKGROUND] Setting up background monitoring...');
    
    // Listen to AppState changes
    const handleAppStateChange = (nextAppState) => {
      console.log(`🔄 [BACKGROUND] App state changed: ${appState} → ${nextAppState}`);
      
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        console.log('🔄 [BACKGROUND] App came to foreground - checking for updates');
        
        // Check for pending notification navigation
        if (global.pendingNotificationNavigation) {
          console.log('🔄 [BACKGROUND] Processing pending notification navigation');
          const pendingNav = global.pendingNotificationNavigation;
          
          // Clear the pending navigation
          global.pendingNotificationNavigation = null;
          
          // Navigate to target screen after a short delay
          setTimeout(() => {
            try {
              const targetScreen = pendingNav.screen;
              console.log('🎯 Navigating to:', targetScreen);
              
              // Use navigation service if available
              if (global.navigationService) {
                global.navigationService.navigate(targetScreen);
                console.log(`✅ Successfully navigated to ${targetScreen} from notification tap`);
              } else if (global._navigator) {
                global._navigator.navigate(targetScreen);
                console.log(`✅ Successfully navigated to ${targetScreen} from notification tap`);
              } else {
                console.log('⚠️ Navigation service not available, notification navigation skipped');
              }
            } catch (error) {
              console.error('❌ Error navigating from notification:', error);
            }
          }, 500);
        }
        
        // App came to foreground - check immediately
        checkForNewProducts();
        checkForOrderStatusChanges();
        
        // Stop background tasks
        stopBackgroundTasks();
        
      } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
        console.log('🔄 [BACKGROUND] App went to background - starting background tasks');
        // App went to background - start background checking
        startBackgroundTasks();
      }
      
      setAppState(nextAppState);
    };

    // Add event listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    
    console.log('✅ [BACKGROUND] Background monitoring setup completed');
    
    return subscription;
  };

  // ✅ NEW: Start background tasks khi app ở background
  const startBackgroundTasks = () => {
    console.log('🕐 [BACKGROUND] Starting background notification checks...');
    
    // Clear any existing background interval
    if (backgroundIntervalRef.current) {
      clearInterval(backgroundIntervalRef.current);
    }
    
    // ✅ BACKGROUND CHECK: Every 2 minutes (limited background time)
    backgroundIntervalRef.current = setInterval(() => {
      const now = Date.now();
      
      // Check if we've been in background too long (iOS limits to ~30 seconds, Android varies)
      if (now - lastBackgroundCheckRef.current < 120000) { // 2 minutes limit
        console.log('🕐 [BACKGROUND] Background check triggered');
        
        // Quick background check - only new products
        checkForNewProductsBackground();
        checkForOrderStatusChangesBackground();
        
        lastBackgroundCheckRef.current = now;
      } else {
        console.log('⏸️ [BACKGROUND] Background time limit reached, stopping checks');
        stopBackgroundTasks();
      }
    }, 120000); // 2 minutes interval for background
    
    // Set initial background check time
    lastBackgroundCheckRef.current = Date.now();
    
    console.log('✅ [BACKGROUND] Background tasks started');
  };

  // ✅ NEW: Stop background tasks
  const stopBackgroundTasks = () => {
    if (backgroundIntervalRef.current) {
      clearInterval(backgroundIntervalRef.current);
      backgroundIntervalRef.current = null;
      console.log('⏹️ [BACKGROUND] Background tasks stopped');
    }
  };

  // ✅ NEW: Cleanup background monitoring
  const cleanupBackgroundMonitoring = () => {
    stopBackgroundTasks();
    // AppState listener will be cleaned up automatically by React
    console.log('🧹 [BACKGROUND] Background monitoring cleaned up');
  };

  // ✅ ENHANCED: Check for new products với improved error handling
  const checkForNewProducts = async () => {
    // ENHANCED Debounce - chỉ check nếu không đang check và đã qua 20s từ lần check trước
    const now = Date.now();
    if (isCheckingRef.current || (now - lastCheckRef.current) < 20000) {
      console.log('🔄 Product check skipped - debounce active (last check:', new Date(lastCheckRef.current).toLocaleTimeString(), ')');
      return;
    }

    console.log('🔍 Checking for new products...');
    console.log('🔍 [FOREGROUND] Foreground product check initiated');

    try {
      isCheckingRef.current = true;
      lastCheckRef.current = now;
      
      console.log('🌐 Calling products API:', API_ENDPOINTS.PRODUCTS.GET_ALL);
      
      // ✅ SIMPLIFIED: Remove AbortController to eliminate AbortError
      const response = await axios.get(API_ENDPOINTS.PRODUCTS.GET_ALL, {
        headers: API_HEADERS,
        timeout: 15000, // 15s simple timeout
      });

      console.log('✅ Products API response:', response.data ? response.data.length : 0, 'products found');

      if (response.data && response.data.length > 0) {
        const currentProducts = response.data;
        const currentProductCount = currentProducts.length;
        const currentProductIds = currentProducts.map(p => p._id || p.id);
        
        console.log('📦 Current Products:', currentProductCount, 'products found');
        console.log('📦 Last Product IDs:', lastProductIds.length, 'saved products');
        console.log('📦 Notified Product IDs:', notifiedProductIds.length, 'already notified');

        // Detect new products bằng cách so sánh IDs
        if (lastProductIds.length > 0) {
          const newProductIds = currentProductIds.filter(id => !lastProductIds.includes(id));
          // ✅ CRITICAL: Filter out những sản phẩm đã thông báo rồi
          const unnotifiedProductIds = newProductIds.filter(id => !notifiedProductIds.includes(id));
          
          console.log('🆕 New Product IDs found:', newProductIds.length);
    
          console.log('🔍 Actual unnotified Product IDs:', unnotifiedProductIds);

          if (unnotifiedProductIds.length > 0) {
            console.log('🎯 Processing unnotified products:', unnotifiedProductIds);
            
            // ✅ PROCESS ONLY NEW & UNNOTIFIED PRODUCTS
            const unnotifiedProducts = currentProducts.filter(p => 
              unnotifiedProductIds.includes(p._id || p.id)
            );
            
            console.log('🎯 Filtered unnotified products:', unnotifiedProducts.length, 'items');
            console.log('🎯 Unnotified product names:', unnotifiedProducts.map(p => p.product_name).slice(0, 5));

            // ✅ ENHANCED: Group by product name to avoid duplicate variants and similar products
            const groupedProducts = unnotifiedProducts.reduce((acc, product) => {
              // Use product name as primary grouping key (more reliable than base_product_id)
              const productName = (product.product_name || product.productName || '').trim().toLowerCase();
              const baseId = product.base_product_id || productName || product._id;
              
              console.log(`🔍 Grouping product: ${product.product_name} | Base ID: ${baseId}`);
              
              if (!acc[baseId]) {
                acc[baseId] = {
                  id: product._id,
                  name: product.product_name || product.productName,
                  price: product.product_price || 0,
                  image: product.product_image,
                  variants: 1,
                  baseId: baseId
                };
                console.log(`✅ Created new group for: ${product.product_name}`);
              } else {
                acc[baseId].variants++;
                console.log(`📦 Added to existing group: ${product.product_name} (${acc[baseId].variants} variants)`);
              }
              return acc;
            }, {});

            const uniqueProducts = Object.values(groupedProducts);
            console.log('📦 Grouped products:', uniqueProducts.length, 'unique products from', unnotifiedProducts.length, 'items');
            console.log('📦 Unique product details:', uniqueProducts.map(p => `${p.name} (${p.variants} variants)`));

            // ✅ LIMIT: Maximum 1 notification per unique product name per session
            const sessionNotifiedNames = new Set();
            const validProducts = uniqueProducts.filter(product => {
              const normalizedName = (product.name || '').trim().toLowerCase();
              if (sessionNotifiedNames.has(normalizedName)) {
                console.log(`⚠️ Already notified for product name this session: ${product.name}`);
                return false;
              }
              sessionNotifiedNames.add(normalizedName);
              return true;
            });

            console.log('🎯 Final valid products after session dedup:', validProducts.length);
            console.log('🎯 Will create notifications for:', validProducts.map(p => p.name));

            if (validProducts.length === 0) {
              console.log('📝 No valid products to notify after deduplication');
              return;
            }

            // ✅ SEQUENTIAL PROCESSING - ONE AT A TIME AS REQUESTED
            for (const product of validProducts) {
        
              
              // ✅ CHECK: Skip if already notified (double check)
              if (notifiedProductIds.includes(product.id)) {
                console.log('⚠️ Product already notified, skipping:', product.name);
                continue;
              }

              await processNewProductNotification(product);
              
              // ✅ IMMEDIATE: Mark as notified to prevent duplicates
              await addToNotifiedList(product.id);
              
              // ✅ AS REQUESTED: Wait before next notification
              console.log('⏸️ Waiting before next notification...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
            }
          } else {
            console.log('📝 All new products already notified');
          }
        } else {
          // First time checking products - check for very recent products only
          console.log('📝 First time checking products - checking for very recent products');
          const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
          const recentProducts = currentProducts.filter(product => {
            const createdAt = new Date(product.createdAt || product.created_at).getTime();
            return createdAt > tenMinutesAgo;
          });

          console.log('🆕 Recent products (last 10 min):', recentProducts.length);

          if (recentProducts.length === 0) {
            console.log('📝 No recent products found in last 10 minutes');
          } else {
            // Process recent products same as new products
            for (const recentProduct of recentProducts) {
              console.log('🔔 Creating first-time product notification:', recentProduct.product_name);
              
              await processNewProductNotification({
                id: recentProduct._id,
                name: recentProduct.product_name,
                price: recentProduct.product_price || 0,
                image: recentProduct.product_image
              });
              
              await addToNotifiedList(recentProduct._id);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
            }
          }
        }

        // Save current state
        setLastProductIds(currentProductIds);
        await AsyncStorage.setItem('lastProductIds', JSON.stringify(currentProductIds));
        
        console.log('💾 SAVED to AsyncStorage - Count:', currentProductCount, ', ProductIDs:', currentProductIds.length, 'items');
        console.log('💾 SAVED First 3 ProductIDs:', currentProductIds.slice(0, 3));
      }

      console.log('🔚 Product check completed');
    } catch (error) {
      // ✅ BETTER ERROR HANDLING
      if (error.name === 'AbortError') {
        console.warn('⚠️ Product API request was aborted (timeout)');
      } else if (error.code === 'ECONNABORTED') {
        console.warn('⚠️ Product API request timed out');
      } else {
        console.error('❌ Error checking for new products:', error.message);
      }
    } finally {
      isCheckingRef.current = false;
    }
  };

  // ✅ NEW: Check for new products với improved error handling (background)
  const checkForNewProductsBackground = async () => {
    // ENHANCED Debounce - chỉ check nếu không đang check và đã qua 20s từ lần check trước
    const now = Date.now();
    if (isCheckingRef.current || (now - lastCheckRef.current) < 20000) {
      console.log('🔄 Background Product check skipped - debounce active (last check:', new Date(lastCheckRef.current).toLocaleTimeString(), ')');
      return;
    }

    console.log('🔍 Background checking for new products...');
    console.log('🔍 [BACKGROUND] Background product check initiated');

    // ✅ PREVENT BACKGROUND + FOREGROUND CONFLICT
    if (appState === 'active') {
      console.log('⚠️ [BACKGROUND] App is active, skipping background check');
      return;
    }

    try {
      isCheckingRef.current = true;
      lastCheckRef.current = now;
      
      console.log('🌐 Background calling products API:', API_ENDPOINTS.PRODUCTS.GET_ALL);
      
      // ✅ SIMPLIFIED: Remove AbortController to eliminate AbortError
      const response = await axios.get(API_ENDPOINTS.PRODUCTS.GET_ALL, {
        headers: API_HEADERS,
        timeout: 15000, // 15s simple timeout
      });

      console.log('✅ Background Products API response:', response.data ? response.data.length : 0, 'products found');

      if (response.data && response.data.length > 0) {
        const currentProducts = response.data;
        const currentProductCount = currentProducts.length;
        const currentProductIds = currentProducts.map(p => p._id || p.id);
        
        console.log('📦 Background Current Products:', currentProductCount, 'products found');
        console.log('📦 Background Last Product IDs:', lastProductIds.length, 'saved products');
        console.log('📦 Background Notified Product IDs:', notifiedProductIds.length, 'already notified');

        // Detect new products bằng cách so sánh IDs
        if (lastProductIds.length > 0) {
          const newProductIds = currentProductIds.filter(id => !lastProductIds.includes(id));
          // ✅ CRITICAL: Filter out những sản phẩm đã thông báo rồi
          const unnotifiedProductIds = newProductIds.filter(id => !notifiedProductIds.includes(id));
          
          console.log('🆕 Background New Product IDs found:', newProductIds.length);
          console.log('🔔 Background Unnotified Product IDs:', unnotifiedProductIds.length);
          console.log('🔍 Background Actual unnotified Product IDs:', unnotifiedProductIds);

          if (unnotifiedProductIds.length > 0) {
            console.log('🎯 Background Processing unnotified products:', unnotifiedProductIds);
            
            // ✅ PROCESS ONLY NEW & UNNOTIFIED PRODUCTS
            const unnotifiedProducts = currentProducts.filter(p => 
              unnotifiedProductIds.includes(p._id || p.id)
            );
            
            console.log('🎯 Background Filtered unnotified products:', unnotifiedProducts.length, 'items');

            // ✅ ENHANCED: Group by base_product_id to avoid duplicate variants
            const groupedProducts = unnotifiedProducts.reduce((acc, product) => {
              const baseId = product.base_product_id || product._id;
              if (!acc[baseId]) {
                acc[baseId] = {
                  id: product._id,
                  name: product.product_name || product.productName,
                  price: product.product_price || 0,
                  image: product.product_image,
                  variants: 1
                };
              } else {
                acc[baseId].variants++;
              }
              return acc;
            }, {});

            const uniqueProducts = Object.values(groupedProducts);
            console.log('📦 Background Grouped products:', uniqueProducts.length, 'unique products from', unnotifiedProducts.length, 'items');

            // ✅ SEQUENTIAL PROCESSING - ONE AT A TIME AS REQUESTED
            for (const product of uniqueProducts) {
              console.log('🔔 Background PROCESSING SINGLE PRODUCT NOTIFICATION');
              
              // ✅ CHECK: Skip if already notified (double check)
              if (notifiedProductIds.includes(product.id)) {
                console.log('⚠️ Background Product already notified, skipping:', product.name);
                continue;
              }

              await processNewProductNotification(product);
              
              // ✅ IMMEDIATE: Mark as notified to prevent duplicates
              await addToNotifiedList(product.id);
              
              // ✅ AS REQUESTED: Wait before next notification
              console.log('⏸️ Background Waiting before next notification...');
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
            }
          } else {
            console.log('📝 Background All new products already notified');
          }
        } else {
          // First time checking products - check for very recent products only
          console.log('📝 Background First time checking products - checking for very recent products');
          const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
          const recentProducts = currentProducts.filter(product => {
            const createdAt = new Date(product.createdAt || product.created_at).getTime();
            return createdAt > tenMinutesAgo;
          });

          console.log('🆕 Background Recent products (last 10 min):', recentProducts.length);

          if (recentProducts.length === 0) {
            console.log('📝 Background No recent products found in last 10 minutes');
          } else {
            // Process recent products same as new products
            for (const recentProduct of recentProducts) {
              console.log('🔔 Background Creating first-time product notification:', recentProduct.product_name);
              
              await processNewProductNotification({
                id: recentProduct._id,
                name: recentProduct.product_name,
                price: recentProduct.product_price || 0,
                image: recentProduct.product_image
              });
              
              await addToNotifiedList(recentProduct._id);
              await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay
            }
          }
        }

        // Save current state
        setLastProductIds(currentProductIds);
        await AsyncStorage.setItem('lastProductIds', JSON.stringify(currentProductIds));
        
        console.log('💾 Background SAVED to AsyncStorage - Count:', currentProductCount, ', ProductIDs:', currentProductIds.length, 'items');
        console.log('💾 Background SAVED First 3 ProductIDs:', currentProductIds.slice(0, 3));
      }

      console.log('🔚 Background Product check completed');
    } catch (error) {
      // ✅ BETTER ERROR HANDLING
      if (error.name === 'AbortError') {
        console.warn('⚠️ Background Product API request was aborted (timeout)');
      } else if (error.code === 'ECONNABORTED') {
        console.warn('⚠️ Background Product API request timed out');
      } else {
        console.error('❌ Error checking for new products:', error.message);
      }
    } finally {
      isCheckingRef.current = false;
    }
  };

  // ✅ NEW: Check if notification is already being processed (ONE-TIME PROCESSING)
  const isNotificationProcessing = (id, type) => {
    const key = `${type}_${id}`;
    return processingRef.current.has(key);
  };

  // ✅ NEW: Mark notification as being processed
  const markNotificationProcessing = (id, type) => {
    const key = `${type}_${id}`;
    processingRef.current.add(key);
    setProcessingNotifications(new Set(processingRef.current));
    console.log(`🔒 [LOCK] Marking ${key} as processing`);
  };

  // ✅ NEW: Mark notification as completed
  const markNotificationCompleted = (id, type) => {
    const key = `${type}_${id}`;
    processingRef.current.delete(key);
    setProcessingNotifications(new Set(processingRef.current));
    console.log(`🔓 [UNLOCK] Marking ${key} as completed`);
  };

  // ✅ NEW: Process single product notification with one-time guarantee
  const processNewProductNotification = async (newProduct) => {
    const productId = newProduct.id;
    
    // ✅ CRITICAL: Check if already processing
    if (isNotificationProcessing(productId, 'product')) {
      console.log(`⚠️ [SKIP] Product ${productId} already being processed`);
      return;
    }

    // ✅ CRITICAL: Check if already notified
    if (notifiedProductIds.includes(productId)) {
      console.log(`⚠️ [SKIP] Product ${productId} already notified`);
      return;
    }

    try {
      // ✅ LOCK: Mark as processing to prevent duplicates
      markNotificationProcessing(productId, 'product');
      
      console.log(`📝 [ONCE] Processing notification for: ${newProduct.name}`);
      
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

      // ✅ THEO YÊU CẦU: Thông báo trong app TRƯỚC
      console.log('📱 [STEP 1] Adding internal notification first...');
      await addNotification(notification);
      
      // ✅ THEO YÊU CẦU: Đợi 1 chút rồi gửi system notification
      console.log('⏸️ [WAIT] Waiting before system notification...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📱 [STEP 2] Now sending system notification...');
      await showNotificationPopup(notification);
      
      // ✅ MARK as notified immediately
      await addToNotifiedList(productId);
      
      console.log('✅ [COMPLETE] Product notification process finished - ONE TIME ONLY');
      
    } catch (error) {
      console.error('❌ Error processing product notification:', error);
    } finally {
      // ✅ UNLOCK: Always unlock even if error
      markNotificationCompleted(productId, 'product');
    }
  };

  // Thêm notification with duplicate check
  const addNotification = async (notification) => {
    try {
      console.log('💾 Adding notification:', notification.title, 'Type:', notification.type);
      console.log('🔍 Call stack trace: addNotification called for', notification.type, 'with ID:', notification.orderId || notification.productId);
      
      // CRITICAL: Load current notifications từ AsyncStorage để tránh race condition
      const currentNotificationsStr = await AsyncStorage.getItem('notifications');
      const currentNotifications = currentNotificationsStr ? JSON.parse(currentNotificationsStr) : [];
      
      console.log('💾 Current notifications in storage:', currentNotifications.length);
      
      // ENHANCED: Check for duplicates
      let isDuplicate = false;
      
      if (notification.type === 'new_order' && notification.orderId) {
        // Check duplicate order by orderId
        isDuplicate = currentNotifications.some(n => 
          n.type === 'new_order' && n.orderId === notification.orderId
        );
        console.log('🔍 Order duplicate check:', isDuplicate ? 'FOUND' : 'NONE');
      } else if (notification.type === 'new_product' && notification.productId) {
        // Check duplicate product by productId (not variant!)
        isDuplicate = currentNotifications.some(n => 
          n.type === 'new_product' && n.productId === notification.productId
        );
        console.log('🔍 Product duplicate check:', isDuplicate ? 'FOUND' : 'NONE');
      }
      
      if (isDuplicate) {
        console.log('⚠️ Duplicate notification detected - skipping add');
        console.log('🚫 CRITICAL: This should not happen if new logic is working correctly!');
        console.log('🔍 Existing notification with same ID:', 
          currentNotifications.find(n => 
            (notification.type === 'new_order' && n.orderId === notification.orderId) ||
            (notification.type === 'new_product' && n.productId === notification.productId)
          )
        );
        return; // Don't add duplicate
      }
      
      // Merge với notifications từ AsyncStorage (reliable hơn state)
      const updatedNotifications = [notification, ...currentNotifications];
      console.log('💾 Total notifications after add:', updatedNotifications.length);
      
      setNotifications(updatedNotifications);
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      console.log('💾 Successfully saved to AsyncStorage');
    } catch (error) {
      console.error('Error saving notification:', error);
    }
  };

  // ✅ SYSTEM PUSH NOTIFICATION - SIMPLIFIED VERSION
  const showNotificationPopup = async (notification) => {
    console.log('🚀 [SIMPLE] Starting simplified notification...');
    console.log('🚀 [SIMPLE] Notification type:', notification.type);
    
    try {
      // ✅ ULTRA SIMPLE MESSAGE - Just like you suggested
      let simpleTitle = "📱 S7M Store";
      let simpleMessage = "Có sản phẩm mới! Bấm để xem chi tiết";
      
      if (notification.type === 'new_product') {
        simpleMessage = "🛍️ Có 1 sản phẩm mới! Bấm để xem";
      } else if (notification.type === 'order_status_change') {
        simpleMessage = "📦 Đơn hàng có cập nhật! Bấm để xem";
      }
      
      console.log('📱 [SIMPLE] About to send basic notification:', simpleTitle, simpleMessage);
      
      // ✅ BASIC SYSTEM NOTIFICATION - NO COMPLEX SETTINGS
      PushNotification.localNotification({
        title: simpleTitle,
        message: simpleMessage,
        channelId: "s7mstore-notifications",
        
        // ✅ NAVIGATION: Open app at notification screen when tapped
        userInfo: {
          screen: 'NotificationScreen',
          action: 'open_notifications'
        },
        
        // Basic settings only
        playSound: true,
        vibrate: true,
        autoCancel: true,
        largeIcon: "ic_launcher",
        
        // Simple ID
        id: Math.floor(Date.now() / 1000),
      });

      console.log('📱 ✅ [SIMPLE] Basic notification sent successfully!');
      console.log('📱 🎯 [SIMPLE] When tapped → Opens app at Profile screen');
      
      // Internal tracking
      setCurrentNotification(notification);
      setTimeout(() => {
        setCurrentNotification(null);
        console.log('⏰ [SIMPLE] Notification tracking cleared');
      }, 5000);
      
    } catch (error) {
      console.error('❌ [SIMPLE] Error in basic notification:', error);
    }
  };

  // ✅ DEPRECATED: hidePopup not needed for system notifications, kept for compatibility
  const hidePopup = () => {
    console.log('⚠️ hidePopup called but system notifications handle this automatically');
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

  // Clean duplicate notifications manually
  const cleanDuplicateNotifications = async () => {
    try {
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
      
      console.log('🧹 Manual cleanup:', cleanedNotifications.length, 'remaining from', notifications.length);
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

  // Enhanced order checking - TRACK STATUS CHANGES cho 3 trạng thái: đã xác nhận, đang giao, giao thành công
  const checkForOrderStatusChanges = async (forceNotification = true) => {
    // Debounce - chỉ check nếu không đang check và đã qua 30s từ lần check trước  
    const now = Date.now();
    if (isCheckingOrdersRef.current || (now - lastOrderCheckRef.current) < 30000) {
      return;
    }

    // ✅ REMOVED: No need to check showPopup for system notifications
    // if (showPopup) {
    //   return;
    // }

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

      // Construct correct API URL with userId in path  
      const orderApiUrl = `${API_BASE_URL}/api/order/getByUserId/${userId}`;
      console.log('🔍 Checking orders at URL:', orderApiUrl);
      console.log('🔍 User ID being used:', userId);
      
      const response = await axios.get(orderApiUrl, {
        headers: API_HEADERS,
      });

      console.log('✅ Orders API response:', response.data.length, 'orders found');

      if (response.data && response.data.length > 0) {
        const currentOrders = response.data;
        
        // FILTER: Chỉ quan tâm 3 trạng thái cần thông báo
        const NOTIFICATION_STATUSES = ['đã xác nhận', 'đang giao', 'giao thành công'];
        const ordersForNotification = currentOrders.filter(order => 
          NOTIFICATION_STATUSES.includes(order.status?.toLowerCase())
        );
        
        console.log('📦 Total Orders:', currentOrders.length);
        console.log('🎯 Orders with notification statuses:', ordersForNotification.length);
        console.log('🎯 Notification statuses found:', ordersForNotification.map(o => o.status));
        
        // Load saved order statuses để compare changes
        const savedOrderStatusesStr = await AsyncStorage.getItem('orderStatuses');
        const savedOrderStatuses = savedOrderStatusesStr ? JSON.parse(savedOrderStatusesStr) : {};
        
        console.log('💾 Saved order statuses:', Object.keys(savedOrderStatuses).length, 'orders tracked');
        
        // Check for status changes
        const statusChanges = [];
        
        for (const order of ordersForNotification) {
          const orderId = order._id;
          const currentStatus = order.status;
          const savedStatus = savedOrderStatuses[orderId];
          
          // Nếu status thay đổi hoặc order mới với status notification
          if (savedStatus && savedStatus !== currentStatus) {
            console.log(`🔄 Status changed for order ${orderId.slice(-4)}: ${savedStatus} → ${currentStatus}`);
            statusChanges.push({
              orderId,
              oldStatus: savedStatus,
              newStatus: currentStatus,
              order: order
            });
          } else if (!savedStatus) {
            console.log(`🆕 New order with notification status ${orderId.slice(-4)}: ${currentStatus}`);
            statusChanges.push({
              orderId,
              oldStatus: null,
              newStatus: currentStatus,
              order: order
            });
          }
          
          // Update saved status
          savedOrderStatuses[orderId] = currentStatus;
        }
        
        console.log('🔔 Status changes detected:', statusChanges.length);

        // Process status changes
        for (const change of statusChanges) {
          const { orderId, oldStatus, newStatus, order } = change;
          
          console.log('🔔 Creating status change notification for order:', orderId.slice(-4));
          
          // Determine notification title based on status
          let title, message;
          switch (newStatus.toLowerCase()) {
            case 'đã xác nhận':
              title = 'Đơn Hàng Đã Xác Nhận';
              message = `Đơn hàng ****${orderId.slice(-4)} đã được xác nhận`;
              break;
            case 'đang giao':
              title = 'Đơn Hàng Đang Giao';
              message = `Đơn hàng ****${orderId.slice(-4)} đang được giao`;
              break;
            case 'giao thành công':
              title = 'Đơn Hàng Giao Thành Công';
              message = `Đơn hàng ****${orderId.slice(-4)} đã giao thành công`;
              break;
            default:
              title = 'Cập Nhật Đơn Hàng';
              message = `Đơn hàng ****${orderId.slice(-4)} - ${newStatus}`;
          }
          
          const notification = {
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
          
          // Check for duplicate notification
          const currentNotificationsStr = await AsyncStorage.getItem('notifications');
          const currentNotifications = currentNotificationsStr ? JSON.parse(currentNotificationsStr) : [];
          
          const isDuplicate = currentNotifications.some(n => 
            n.orderId === orderId && n.orderStatus === newStatus
          );
          
          if (isDuplicate) {
            console.log('⚠️ Status change notification already exists, skipping');
          } else {
            console.log('✅ Creating status change notification');
            
            // ALWAYS show SYSTEM notification for order status changes  
            const now = Date.now();
            console.log(`🕒 [AUTO-ORDER] Time check: Current=${now}, Last=${lastNotificationRef.current}, Diff=${now - lastNotificationRef.current}ms`);
            
            console.log(`🔔 [AUTO-ORDER] Showing SYSTEM notification for status change: ${title}`);
            console.log(`🔔 [AUTO-ORDER] About to call showNotificationPopup with notification:`, notification.title);
            console.log(`🔔 [AUTO-ORDER] Complete notification object:`, JSON.stringify(notification, null, 2));
            
            // ✅ THEO YÊU CẦU: Internal notification TRƯỚC
            console.log(`📱 [STEP 1] Adding internal order notification first...`);
            await addNotification(notification);
            
            // ✅ THEO YÊU CẦU: Đợi 1 chút rồi gửi system notification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
              console.log(`📱 [STEP 2] Now sending order system notification...`);
              await showNotificationPopup(notification);
              console.log(`✅ [AUTO-ORDER] showNotificationPopup completed successfully`);
            } catch (error) {
              console.error(`❌ [AUTO-ORDER] showNotificationPopup failed:`, error);
            }
            
            console.log(`✅ [COMPLETE] Order notification process finished`);
            
            // Update last notification time
            lastNotificationRef.current = now;
          }
        }
        
        // Save updated order statuses
        await AsyncStorage.setItem('orderStatuses', JSON.stringify(savedOrderStatuses));
        console.log('💾 Updated order statuses saved to AsyncStorage');
        
        // If no saved statuses existed before (first time), just initialize tracking
        if (Object.keys(savedOrderStatuses).length === statusChanges.length && statusChanges.every(c => c.oldStatus === null)) {
          console.log('📝 First time checking orders - initialized status tracking for', Object.keys(savedOrderStatuses).length, 'orders');
        }
      }
    } catch (error) {
      console.error('❌ Error checking for new orders:', error);
      if (error.response) {
        console.error('📝 Error details - Status:', error.response.status);
        console.error('📝 Error details - Data:', error.response.data);
        console.error('📝 Error details - URL:', error.config?.url);
      }
    } finally {
      isCheckingOrdersRef.current = false;
    }
  };

  // ✅ NEW: Enhanced order checking - TRACK STATUS CHANGES cho 3 trạng thái: đã xác nhận, đang giao, giao thành công (background)
  const checkForOrderStatusChangesBackground = async () => {
    // Debounce - chỉ check nếu không đang check và đã qua 30s từ lần check trước  
    const now = Date.now();
    if (isCheckingOrdersRef.current || (now - lastOrderCheckRef.current) < 30000) {
      return;
    }

    // ✅ REMOVED: No need to check showPopup for system notifications
    // if (showPopup) {
    //   return;
    // }

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

      // Construct correct API URL with userId in path  
      const orderApiUrl = `${API_BASE_URL}/api/order/getByUserId/${userId}`;
      console.log('🔍 Background checking orders at URL:', orderApiUrl);
      console.log('🔍 Background User ID being used:', userId);
      
      const response = await axios.get(orderApiUrl, {
        headers: API_HEADERS,
      });

      console.log('✅ Background Orders API response:', response.data.length, 'orders found');

      if (response.data && response.data.length > 0) {
        const currentOrders = response.data;
        
        // FILTER: Chỉ quan tâm 3 trạng thái cần thông báo
        const NOTIFICATION_STATUSES = ['đã xác nhận', 'đang giao', 'giao thành công'];
        const ordersForNotification = currentOrders.filter(order => 
          NOTIFICATION_STATUSES.includes(order.status?.toLowerCase())
        );
        
        console.log('📦 Background Total Orders:', currentOrders.length);
        console.log('🎯 Background Orders with notification statuses:', ordersForNotification.length);
        console.log('🎯 Background Notification statuses found:', ordersForNotification.map(o => o.status));
        
        // Load saved order statuses để compare changes
        const savedOrderStatusesStr = await AsyncStorage.getItem('orderStatuses');
        const savedOrderStatuses = savedOrderStatusesStr ? JSON.parse(savedOrderStatusesStr) : {};
        
        console.log('💾 Background Saved order statuses:', Object.keys(savedOrderStatuses).length, 'orders tracked');
        
        // Check for status changes
        const statusChanges = [];
        
        for (const order of ordersForNotification) {
          const orderId = order._id;
          const currentStatus = order.status;
          const savedStatus = savedOrderStatuses[orderId];
          
          // Nếu status thay đổi hoặc order mới với status notification
          if (savedStatus && savedStatus !== currentStatus) {
            console.log(`🔄 Background Status changed for order ${orderId.slice(-4)}: ${savedStatus} → ${currentStatus}`);
            statusChanges.push({
              orderId,
              oldStatus: savedStatus,
              newStatus: currentStatus,
              order: order
            });
          } else if (!savedStatus) {
            console.log(`🆕 Background New order with notification status ${orderId.slice(-4)}: ${currentStatus}`);
            statusChanges.push({
              orderId,
              oldStatus: null,
              newStatus: currentStatus,
              order: order
            });
          }
          
          // Update saved status
          savedOrderStatuses[orderId] = currentStatus;
        }
        
        console.log('🔔 Background Status changes detected:', statusChanges.length);

        // Process status changes
        for (const change of statusChanges) {
          const { orderId, oldStatus, newStatus, order } = change;
          
          console.log('🔔 Background Creating status change notification for order:', orderId.slice(-4));
          
          // Determine notification title based on status
          let title, message;
          switch (newStatus.toLowerCase()) {
            case 'đã xác nhận':
              title = 'Đơn Hàng Đã Xác Nhận';
              message = `Đơn hàng ****${orderId.slice(-4)} đã được xác nhận`;
              break;
            case 'đang giao':
              title = 'Đơn Hàng Đang Giao';
              message = `Đơn hàng ****${orderId.slice(-4)} đang được giao`;
              break;
            case 'giao thành công':
              title = 'Đơn Hàng Giao Thành Công';
              message = `Đơn hàng ****${orderId.slice(-4)} đã giao thành công`;
              break;
            default:
              title = 'Cập Nhật Đơn Hàng';
              message = `Đơn hàng ****${orderId.slice(-4)} - ${newStatus}`;
          }
          
          const notification = {
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
          
          // Check for duplicate notification
          const currentNotificationsStr = await AsyncStorage.getItem('notifications');
          const currentNotifications = currentNotificationsStr ? JSON.parse(currentNotificationsStr) : [];
          
          const isDuplicate = currentNotifications.some(n => 
            n.orderId === orderId && n.orderStatus === newStatus
          );
          
          if (isDuplicate) {
            console.log('⚠️ Background Status change notification already exists, skipping');
          } else {
            console.log('✅ Background Creating status change notification');
            
            // ALWAYS show SYSTEM notification for order status changes  
            const now = Date.now();
            console.log(`🕒 [AUTO-ORDER] Background Time check: Current=${now}, Last=${lastNotificationRef.current}, Diff=${now - lastNotificationRef.current}ms`);
            
            console.log(`🔔 [AUTO-ORDER] Background Showing SYSTEM notification for status change: ${title}`);
            console.log(`🔔 [AUTO-ORDER] Background About to call showNotificationPopup with notification:`, notification.title);
            console.log(`🔔 [AUTO-ORDER] Background Complete notification object:`, JSON.stringify(notification, null, 2));
            
            // ✅ THEO YÊU CẦU: Internal notification TRƯỚC
            console.log(`📱 [STEP 1] Background Adding internal order notification first...`);
            await addNotification(notification);
            
            // ✅ THEO YÊU CẦU: Đợi 1 chút rồi gửi system notification
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
              console.log(`📱 [STEP 2] Background Now sending order system notification...`);
              await showNotificationPopup(notification);
              console.log(`✅ [AUTO-ORDER] Background showNotificationPopup completed successfully`);
            } catch (error) {
              console.error(`❌ [AUTO-ORDER] Background showNotificationPopup failed:`, error);
            }
            
            console.log(`✅ [COMPLETE] Background Order notification process finished`);
            
            // Update last notification time
            lastNotificationRef.current = now;
          }
        }
        
        // Save updated order statuses
        await AsyncStorage.setItem('orderStatuses', JSON.stringify(savedOrderStatuses));
        console.log('💾 Background Updated order statuses saved to AsyncStorage');
        
        // If no saved statuses existed before (first time), just initialize tracking
        if (Object.keys(savedOrderStatuses).length === statusChanges.length && statusChanges.every(c => c.oldStatus === null)) {
          console.log('📝 Background First time checking orders - initialized status tracking for', Object.keys(savedOrderStatuses).length, 'orders');
        }
      }
    } catch (error) {
      console.error('❌ Error checking for new orders:', error);
      if (error.response) {
        console.error('📝 Error details - Status:', error.response.status);
        console.error('📝 Error details - Data:', error.response.data);
        console.error('📝 Error details - URL:', error.config?.url);
      }
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

  // RESET everything for clean testing
  const resetNotificationSystem = async () => {
    try {
      // Clear all notifications
      setNotifications([]);
      await AsyncStorage.setItem('notifications', JSON.stringify([]));
      
      // Clear notified lists
      setNotifiedProductIds([]);
      setNotifiedOrderIds([]);
      await AsyncStorage.setItem('notifiedProductIds', JSON.stringify([]));
      await AsyncStorage.setItem('notifiedOrderIds', JSON.stringify([]));
      
      // Reset last seen data
      setLastProductCount(0);
      setLastProductIds([]);
      setLastOrderIds([]);
      await AsyncStorage.setItem('lastProductCount', '0');
      await AsyncStorage.setItem('lastProductIds', JSON.stringify([]));
      await AsyncStorage.setItem('lastOrderIds', JSON.stringify([]));
      
      console.log('🔄 RESET: Complete notification system reset - ready for fresh testing');
    } catch (error) {
      console.error('Error resetting notification system:', error);
    }
  };







  // ✅ CHECK PERMISSION STATUS
  const checkNotificationPermission = async () => {
    try {
      console.log('🔐 === PERMISSION CHECK ===');
      
      if (Platform.OS === 'android') {
        const SDK_INT = Platform.constants.Release;
        console.log('📱 Android SDK version:', SDK_INT);
        
        if (SDK_INT >= 13) {
          const status = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
          console.log('🔐 POST_NOTIFICATIONS permission status:', status);
          return status;
        } else {
          console.log('📱 Android < 13, permissions automatic');
          return true;
        }
      } else {
        console.log('📱 iOS permission check not implemented');
        return true;
      }
    } catch (error) {
      console.error('❌ Permission check failed:', error);
      return false;
    }
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
    checkForOrderStatusChanges,
    clearNotifiedList,
    resetNotificationSystem,

    checkNotificationPermission,
    requestNotificationPermissions,

    cleanDuplicateNotifications

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