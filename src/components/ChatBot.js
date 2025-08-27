import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  PanResponder,
  Animated,
  PermissionsAndroid,
  TouchableWithoutFeedback
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import { chatbotService } from '../services/chatbotService';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';


const { width, height } = Dimensions.get('window');

const ChatBot = () => {
  const navigation = useNavigation();
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef(null);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  const [fabPosition, setFabPosition] = useState({ 
    x: Dimensions.get('window').width - 76, 
    y: Dimensions.get('window').height - 86 
  });
  
  // Animation values for draggable button
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({
    x: Dimensions.get('window').width - 76,
    y: Dimensions.get('window').height - 86
  })).current;

  // Animation values for modal
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const backgroundOpacity = useRef(new Animated.Value(0)).current;
  const modalTranslateX = useRef(new Animated.Value(0)).current;
  const modalTranslateY = useRef(new Animated.Value(0)).current;
  
  // Animation values for FAB
  const fabOpacity = useRef(new Animated.Value(1)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  // PanResponder for draggable functionality
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
             onPanResponderGrant: () => {
         // Extract offset to prevent jumping
         pan.extractOffset();
         // Scale up slightly when pressed
         scale.setValue(1.1);
       },
             onPanResponderMove: Animated.event(
         [null, { dx: pan.x, dy: pan.y }],
         { useNativeDriver: false }
       ),
                    onPanResponderRelease: (evt, gestureState) => {
         // Flatten offset
         pan.flattenOffset();
         
         // Scale back to normal
         scale.setValue(1);
         
         // Get current position
         const currentX = pan.x._value;
         const currentY = pan.y._value;
         
         // Snap to edges if near screen boundaries
         const buttonSize = 56;
         const screenWidth = Dimensions.get('window').width;
         const screenHeight = Dimensions.get('window').height;
         
         let newX = currentX;
         let newY = currentY;
         
         // Snap to left or right edge with some margin
         const margin = 20;
         if (newX < screenWidth / 2) {
           newX = margin;
         } else {
           newX = screenWidth - buttonSize - margin;
         }
         
         // Keep within screen bounds with safe area consideration
         const safeTop = 50; // Account for status bar
         const safeBottom = 100; // Account for bottom navigation/gesture area
         
         if (newY < safeTop) newY = safeTop;
         if (newY > screenHeight - buttonSize - safeBottom) newY = screenHeight - buttonSize - safeBottom;
         
         // Update position
         pan.setValue({ x: newX, y: newY });
         
         // Save FAB position for modal animation
         setFabPosition({ x: newX, y: newY });
       },
    })
  ).current;

  // Monitor inputText changes
  useEffect(() => {
    console.log('[ChatBot] inputText changed:', inputText);
    console.log('[ChatBot] inputText type:', typeof inputText);
    console.log('[ChatBot] inputText length:', inputText.length);
    
    // Reset inputText if it's not a string
    if (typeof inputText !== 'string') {
      console.log('[ChatBot] WARNING: inputText is not a string, resetting to empty string');
      setInputText('');
    }
  }, [inputText]);

  // Ensure FAB is visible when component mounts
  useEffect(() => {
    console.log('[ChatBot] Component mounted, ensuring FAB is visible');
    fabOpacity.setValue(1);
    fabScale.setValue(1);
  }, []);

  useEffect(() => {
    console.log('🚀 [SETUP] Bắt đầu setup Voice Recognition');
    setMessages([
      {
        id: '1',
        text: 'Xin chào! Tôi là trợ lý AI của S7M Store. Bạn cần hỗ trợ gì?',
        isUser: false,
        timestamp: new Date(),
      },
    ]);
    
    const initializeVoice = async () => {
      try {
        console.log('🔍 [SETUP] Đang kiểm tra Voice availability...');
        
        // Kiểm tra xem Voice có khả dụng không
        const available = await Voice.isAvailable();
        console.log('🔍 [SETUP] Voice available:', available);
        setIsVoiceAvailable(available);
        
        if (!available) {
          console.error('❌ [SETUP] Voice không khả dụng trên thiết bị này');
          return;
        }

        // Kiểm tra quyền microphone trước
        if (Platform.OS === 'android') {
          const permission = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
          console.log('🔍 [SETUP] Microphone permission:', permission);
          if (!permission) {
            console.log('⚠️ [SETUP] Microphone permission not granted, will request later');
          }
        }
  
        // QUAN TRỌNG: Đăng ký các event listeners
        Voice.onSpeechStart = onSpeechStart;         // Khi bắt đầu nghe
        Voice.onSpeechEnd = onSpeechEnd;             // Khi kết thúc nghe  
        Voice.onSpeechResults = onSpeechResults;     // Khi có kết quả cuối cùng
        Voice.onSpeechPartialResults = onSpeechPartialResults; // Kết quả real-time
        Voice.onSpeechError = onSpeechError;         // Khi có lỗi
        
        console.log('✅ [SETUP] Voice listeners đã được đăng ký');
        
        // Test voice initialization
        try {
          await Voice.destroy();
          console.log('✅ [SETUP] Voice destroy test successful');
        } catch (testError) {
          console.log('⚠️ [SETUP] Voice destroy test failed (this is normal):', testError.message);
        }
        
      } catch (error) {
        console.error('❌ [SETUP] Lỗi khởi tạo Voice:', error);
        setIsVoiceAvailable(false);
        
        // Show user-friendly error
        if (error.message && error.message.includes('permission')) {
          Alert.alert(
            'Quyền truy cập', 
            'Cần quyền truy cập microphone để sử dụng tính năng nhận dạng giọng nói. Vui lòng cấp quyền trong cài đặt.',
            [
              { text: 'Cài đặt', onPress: () => {
                // Navigate to app settings
                if (Platform.OS === 'ios') {
                  // iOS doesn't have a direct way to open settings
                  Alert.alert('Hướng dẫn', 'Vui lòng vào Cài đặt > S7M Store > Microphone và bật quyền truy cập.');
                }
              }},
              { text: 'Đóng', style: 'cancel' }
            ]
          );
        }
      }
    };
  
    // Delay initialization to ensure component is fully mounted
    const initTimer = setTimeout(initializeVoice, 500);
  
    // Cleanup khi component bị hủy
    return () => {
      console.log('🧹 [CLEANUP] Dọn dẹp Voice listeners');
      clearTimeout(initTimer);
      try {
        Voice.destroy().then(() => {
          Voice.removeAllListeners();
          console.log('✅ [CLEANUP] Voice listeners removed successfully');
        });
      } catch (cleanupError) {
        console.log('⚠️ [CLEANUP] Error during cleanup:', cleanupError.message);
      }
    };
  }, []);
  // Voice recognition functions
  const onSpeechStart = () => {
    console.log('[Voice] Speech recognition started');
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    console.log('[Voice] Speech recognition ended');
    setIsListening(false);
  };

  const onSpeechError = (error) => {
    console.log('[Voice] Speech recognition error:', error);
    console.log('[Voice] Error details:', JSON.stringify(error, null, 2));
    setIsListening(false);
    
    let errorMessage = 'Không thể nhận dạng giọng nói. Vui lòng thử lại.';
    let shouldRetry = false;
    
    if (error.error) {
      switch (error.error.code) {
        case '13':
        case '11':
          errorMessage = 'Không hiểu được giọng nói. Vui lòng nói rõ ràng hơn.';
          shouldRetry = true;
          break;
        case '5':
          errorMessage = 'Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.';
          shouldRetry = true;
          break;
        case '7':
          errorMessage = 'Không có audio được phát hiện. Vui lòng:\n• Nói to hơn\n• Đảm bảo microphone không bị che\n• Kiểm tra âm lượng thiết bị';
          shouldRetry = true;
          break;
        case '9':
          errorMessage = 'Lỗi permission. Vui lòng cấp quyền microphone trong cài đặt.';
          break;
        case '1':
          errorMessage = 'Lỗi khởi tạo. Vui lòng thử lại sau.';
          shouldRetry = true;
          break;
        case '2':
          errorMessage = 'Lỗi audio. Vui lòng kiểm tra microphone.';
          shouldRetry = true;
          break;
        case '3':
          errorMessage = 'Lỗi server. Vui lòng thử lại sau.';
          shouldRetry = true;
          break;
        case '4':
          errorMessage = 'Lỗi network. Vui lòng kiểm tra kết nối.';
          shouldRetry = true;
          break;
        case '6':
          errorMessage = 'Lỗi timeout. Vui lòng thử lại.';
          shouldRetry = true;
          break;
        case '8':
          errorMessage = 'Lỗi recognition. Vui lòng thử lại.';
          shouldRetry = true;
          break;
        default:
          errorMessage = `Lỗi: ${error.error.message || 'Không xác định'}`;
          shouldRetry = true;
      }
    }
    
    if (shouldRetry) {
      Alert.alert(
        'Lỗi nhận dạng giọng nói', 
        errorMessage,
        [
          { text: 'Thử lại', onPress: () => {
            setTimeout(() => startListening(), 1000);
          }},
          { text: 'Đóng', style: 'cancel' }
        ]
      );
    } else {
      Alert.alert('Lỗi nhận dạng giọng nói', errorMessage);
    }
  };

  const onSpeechResults = (event) => {
    console.log('[Voice] Speech results received:', event);
    
    if (event.value && event.value.length > 0) {
      const text = event.value[0];
      console.log('[Voice] Extracted text:', text);
      console.log('[Voice] Type of text:', typeof text);
      
      // Đảm bảo text là string và có nội dung
      const safeText = typeof text === 'string' ? text.trim() : String(text || '').trim();
      console.log('[Voice] Safe text:', safeText);
      
      if (safeText && safeText.length > 0) {
        setInputText(safeText);
        
        // Auto-send after 2 seconds of silence (increased from 1.5s)
        setTimeout(() => {
          console.log('[Voice] Auto-sending message after silence');
          if (safeText.trim() && !isLoading) {
            sendMessage(safeText);
          }
        }, 2000);
      } else {
        console.log('[Voice] Empty text received, not setting input');
        // Show user feedback for empty results
        Alert.alert('Không nhận dạng được', 'Không thể nhận dạng giọng nói. Vui lòng thử lại và nói rõ ràng hơn.');
      }
    } else {
      console.log('[Voice] No speech results received');
      Alert.alert('Không có kết quả', 'Không nhận dạng được giọng nói. Vui lòng thử lại.');
    }
  };

  const onSpeechPartialResults = (event) => {
    console.log('[Voice] Partial speech results:', event);
    if (event.value && event.value.length > 0) {
      const text = event.value[0];
      const safeText = typeof text === 'string' ? text : String(text || '');
      setInputText(safeText);
    }
  };

  const requestMicrophonePermission = async () => {
    console.log('[Voice] Requesting microphone permission');
    
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Quyền truy cập microphone',
            message: 'Ứng dụng cần quyền truy cập microphone để nhận dạng giọng nói.',
            buttonNeutral: 'Hỏi lại sau',
            buttonNegative: 'Từ chối',
            buttonPositive: 'Đồng ý',
          }
        );
        
        const hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        console.log('[Voice] Permission result:', hasPermission);
        return hasPermission;
      } catch (err) {
        console.error('[Voice] Permission error:', err);
        return false;
      }
    }
    return true; // iOS handles permissions differently
  };

  const startListening = async () => {
    console.log('[Voice] Starting voice recognition');
    
    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        console.log('[Voice] Permission denied');
        Alert.alert('Quyền truy cập', 'Cần quyền truy cập microphone để sử dụng tính năng nhận dạng giọng nói.');
        return;
      }

      // Reset listening state
      setIsListening(false);
      
      // Stop any existing recognition first
      try {
        await Voice.stop();
        console.log('[Voice] Stopped any existing recognition');
        // Wait a bit before starting new recognition
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (stopError) {
        console.log('[Voice] No existing recognition to stop');
      }
      
      // Set listening state before starting
      setIsListening(true);
      
      // Start new recognition with Vietnamese language and better options
      const options = {
        language: 'vi-VN',
        prompt: 'Hãy nói rõ ràng vào microphone',
        partialResults: true,
        maxAlternatives: 1,
        continuous: false,
        interimResults: true
      };
      
      console.log('[Voice] Starting with options:', options);
      await Voice.start('vi-VN');
      console.log('[Voice] Voice recognition started successfully');
      
    } catch (error) {
      console.error('[Voice] Error starting voice recognition:', error);
      setIsListening(false);
      
      // Provide more specific error messages
      let errorMessage = 'Không thể khởi động nhận dạng giọng nói.';
      if (error.message) {
        if (error.message.includes('permission')) {
          errorMessage = 'Cần quyền truy cập microphone. Vui lòng cấp quyền trong cài đặt.';
        } else if (error.message.includes('audio')) {
          errorMessage = 'Không thể truy cập microphone. Vui lòng kiểm tra thiết bị.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra internet.';
        }
      }
      
      Alert.alert('Lỗi nhận dạng giọng nói', errorMessage);
    }
  };

  const stopListening = async () => {
    console.log('[Voice] Stopping voice recognition');
    try {
      setIsListening(false);
      await Voice.stop();
      console.log('[Voice] Voice recognition stopped successfully');
      
      // Reset input if no text was captured
      if (!inputText.trim()) {
        setInputText('');
        console.log('[Voice] Input reset after stopping');
      }
    } catch (error) {
      console.error('[Voice] Error stopping voice recognition:', error);
      // Force reset listening state even if stop fails
      setIsListening(false);
    }
  };



  const openModal = () => {
    // Calculate modal position based on FAB position
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const modalWidth = screenWidth * 0.85; // 85% of screen width
    const modalHeight = screenHeight * 0.75; // 75% of screen height
    
    // Calculate FAB center position
    const fabCenterX = fabPosition.x + 28; // FAB center (56/2)
    const fabCenterY = fabPosition.y + 28; // FAB center (56/2)
    
    // Calculate center position for modal (final position) - slightly offset towards FAB
    const baseCenterX = (screenWidth - modalWidth) / 2;
    const baseCenterY = (screenHeight - modalHeight) / 2;
    
    // Offset towards FAB side (20% of the distance from center to FAB)
    const offsetX = (fabCenterX - baseCenterX) * 0.2;
    const offsetY = (fabCenterY - baseCenterY) * 0.2;
    
    const modalCenterX = baseCenterX + offsetX;
    const modalCenterY = baseCenterY + offsetY;
    
    // Calculate initial position (start from FAB position)
    const initialX = fabCenterX - modalWidth / 2;
    const initialY = fabCenterY - modalHeight / 2;
    
    // Calculate translation to center
    const translateX = modalCenterX - initialX;
    const translateY = modalCenterY - initialY;
    
    // Set initial position (modal starts at FAB position)
    modalTranslateX.setValue(-translateX);
    modalTranslateY.setValue(-translateY);
    
    console.log('[ChatBot] FAB Position:', fabPosition);
    console.log('[ChatBot] FAB Center:', { x: fabCenterX, y: fabCenterY });
    console.log('[ChatBot] Modal Center:', { x: modalCenterX, y: modalCenterY });
    console.log('[ChatBot] Initial Position:', { x: initialX, y: initialY });
    console.log('[ChatBot] Translation:', { x: translateX, y: translateY });
    console.log('[ChatBot] Set Values:', { x: -translateX, y: -translateY });
    
    setIsVisible(true);
    Animated.parallel([
      Animated.timing(backgroundOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(modalTranslateX, {
        toValue: 0,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      Animated.spring(modalTranslateY, {
        toValue: 0,
        tension: 50,
        friction: 12,
        useNativeDriver: true,
      }),
      // Hide FAB at the same time
      Animated.timing(fabOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, {
        toValue: 0.8,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    console.log('[ChatBot] closeModal called');
    
    // Kiểm tra nếu modal đã đóng
    if (!isVisible) {
      console.log('[ChatBot] Modal already closed, ensuring FAB is visible');
      // Đảm bảo FAB hiển thị
      fabOpacity.setValue(1);
      fabScale.setValue(1);
      return;
    }
    
    // Calculate final position back to FAB
    const screenWidth = Dimensions.get('window').width;
    const screenHeight = Dimensions.get('window').height;
    const modalWidth = screenWidth * 0.85;
    const modalHeight = screenHeight * 0.75;
    
    // Calculate FAB center position
    const fabCenterX = fabPosition.x + 28;
    const fabCenterY = fabPosition.y + 28;
    
    // Calculate center position for modal (final position) - slightly offset towards FAB
    const baseCenterX = (screenWidth - modalWidth) / 2;
    const baseCenterY = (screenHeight - modalHeight) / 2;
    
    // Offset towards FAB side (20% of the distance from center to FAB)
    const offsetX = (fabCenterX - baseCenterX) * 0.2;
    const offsetY = (fabCenterY - baseCenterY) * 0.2;
    
    const modalCenterX = baseCenterX + offsetX;
    const modalCenterY = baseCenterY + offsetY;
    
    // Calculate initial position (start from FAB position)
    const initialX = fabCenterX - modalWidth / 2;
    const initialY = fabCenterY - modalHeight / 2;
    
    // Calculate translation to center
    const translateX = modalCenterX - initialX;
    const translateY = modalCenterY - initialY;
    
    try {
      Animated.parallel([
        Animated.timing(backgroundOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 0,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(modalTranslateX, {
          toValue: -translateX,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
        Animated.spring(modalTranslateY, {
          toValue: -translateY,
          tension: 50,
          friction: 12,
          useNativeDriver: true,
        }),
        // Show FAB at the same time
        Animated.timing(fabOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(fabScale, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsVisible(false);
        console.log('[ChatBot] Modal closed successfully');
      });
    } catch (error) {
      console.error('[ChatBot] Error in closeModal animation:', error);
      // Fallback: đóng modal ngay lập tức và hiển thị FAB
      setIsVisible(false);
      fabOpacity.setValue(1);
      fabScale.setValue(1);
    }
  };

  // Helper function để xử lý response từ API
  const processApiResponse = (response) => {
    console.log('[ChatBot] Processing API response:', response);
    console.log('[ChatBot] Response type:', typeof response);
    
    // Kiểm tra nếu response là số hoặc có thể convert thành số
    if (typeof response === 'number' || !isNaN(Number(response))) {
      console.log('[ChatBot] Response is numeric, executing action:', response);
      executeAction(Number(response));
      return 'Thực hiện yêu cầu';
    }
    
    // Kiểm tra nếu response là null/undefined
    if (response === null || response === undefined) {
      console.log('[ChatBot] Response is null/undefined, showing default message');
      return 'Thực hiện yêu cầu';
    }
    
    // Kiểm tra nếu response là object
    if (typeof response === 'object') {
      console.log('[ChatBot] Response is object, showing default message');
      return 'Thực hiện yêu cầu';
    }
    
    // Nếu là string, trả về nguyên bản
    if (typeof response === 'string') {
      console.log('[ChatBot] Response is string, returning as is');
      return response;
    }
    
    // Trường hợp khác, convert thành string
    console.log('[ChatBot] Response is other type, converting to string');
    return String(response || 'Lỗi: Không nhận được phản hồi');
  };

  // Function để thực hiện các action dựa trên số
  const executeAction = async (actionNumber) => {
    console.log('[ChatBot] Executing action:', actionNumber);
    
    try {
      switch (actionNumber) {
        case 1: // Đăng xuất
          await handleLogout();
          break;
        case 2: // Đổi mật khẩu
          handleChangePassword();
          break;
        case 3: // Xóa sản phẩm giỏ hàng
          await handleDeleteAllCartItems();
          break;
        case 4: // Đặt hàng
          await handlePlaceOrder();
          break;
        case 5: // Xem danh sách đơn hàng
          handleViewOrders();
          break;
        case 6: // Xem danh sách địa chỉ
          handleViewAddresses();
          break;
        default:
          console.log('[ChatBot] Unknown action number:', actionNumber);
      }
      
      // Đảm bảo modal luôn được đóng sau khi thực hiện action
      closeModal();
    } catch (error) {
      console.error('[ChatBot] Error executing action:', error);
      // Đảm bảo FAB hiển thị ngay cả khi có lỗi
      closeModal();
    }
  };

  // Function đăng xuất
  const handleLogout = async () => {
    try {
      console.log('[ChatBot] Logging out...');
      await AsyncStorage.clear();
      // Reset navigation stack và chuyển về LoginScreen
      navigation.reset({
        index: 0,
        routes: [{ name: 'LoginScreen' }],
      });
    } catch (error) {
      console.error('[ChatBot] Logout error:', error);
      // Không throw error để tránh ảnh hưởng đến việc đóng modal
    }
  };

  // Function đổi mật khẩu
  const handleChangePassword = () => {
    try {
      console.log('[ChatBot] Navigating to change password...');
      navigation.navigate('ChangePass');
    } catch (error) {
      console.error('[ChatBot] Navigation error:', error);
      // Không throw error để tránh ảnh hưởng đến việc đóng modal
    }
  };

  // Function xóa tất cả items trong cart
  const handleDeleteAllCartItems = async () => {
    try {
      console.log('[ChatBot] Deleting all cart items...');
      
      // Lấy user info
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (!userInfoString) {
        console.log('[ChatBot] No user info found');
        return;
      }
      
      const userInfo = JSON.parse(userInfoString);
      const userId = userInfo._id;
      
      // Lấy cart data
      const cartResponse = await fetch(`${API_ENDPOINTS.CART.GET_BY_USER_ID}/${userId}`, {
        headers: API_HEADERS,
      });
      
      if (!cartResponse.ok) {
        console.log('[ChatBot] Failed to fetch cart data');
        return;
      }
      
      const cartData = await cartResponse.json();
      const cartItems = cartData.cartItem || [];
      
      if (cartItems.length === 0) {
        console.log('[ChatBot] Cart is already empty');
        return;
      }
      
      // Lấy danh sách cart item IDs
      const cartItemIds = cartItems.map(item => item._id);
      
      // Xóa tất cả items
      const deleteResponse = await fetch(API_ENDPOINTS.CART.DELETE_ALL_ITEMS(userId), {
        method: 'DELETE',
        headers: API_HEADERS,
        body: JSON.stringify({
          listIdCartItem: cartItemIds
        }),
      });
      
      if (deleteResponse.ok) {
        console.log('[ChatBot] All cart items deleted successfully');
        // Navigate đến CartScreen để user thấy kết quả
        try {
          navigation.navigate('CartScreen');
        } catch (navError) {
          console.error('[ChatBot] Navigation error:', navError);
        }
      } else {
        console.log('[ChatBot] Failed to delete cart items');
      }
      
    } catch (error) {
      console.error('[ChatBot] Error deleting cart items:', error);
      // Không throw error để tránh ảnh hưởng đến việc đóng modal
    }
  };

  // Function đặt hàng
  const handlePlaceOrder = async () => {
    try {
      console.log('[ChatBot] Navigating to checkout...');
      
      // Lấy user info
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (!userInfoString) {
        console.log('[ChatBot] No user info found');
        return;
      }
      
      const userInfo = JSON.parse(userInfoString);
      const userId = userInfo._id;
      
      // Lấy cart data
      const cartResponse = await fetch(`${API_ENDPOINTS.CART.GET_BY_USER_ID}/${userId}`, {
        headers: API_HEADERS,
      });
      
      if (!cartResponse.ok) {
        console.log('[ChatBot] Failed to fetch cart data');
        return;
      }
      
      const cartData = await cartResponse.json();
      const cartItems = cartData.cartItem || [];
      
      if (cartItems.length === 0) {
        console.log('[ChatBot] Cart is empty, cannot place order');
        return;
      }
      
      // Navigate to checkout với cart items
      try {
        navigation.navigate('CheckoutScreen', { 
          cartItems: cartItems,
          cartId: cartData._id 
        });
      } catch (navError) {
        console.error('[ChatBot] Navigation error:', navError);
      }
      
    } catch (error) {
      console.error('[ChatBot] Error navigating to checkout:', error);
      // Không throw error để tránh ảnh hưởng đến việc đóng modal
    }
  };

  // Function xem danh sách đơn hàng
  const handleViewOrders = () => {
    try {
      console.log('[ChatBot] Navigating to orders...');
      navigation.navigate('OrderScreen');
    } catch (error) {
      console.error('[ChatBot] Navigation error:', error);
      // Không throw error để tránh ảnh hưởng đến việc đóng modal
    }
  };

  // Function xem danh sách địa chỉ
  const handleViewAddresses = () => {
    try {
      console.log('[ChatBot] Navigating to addresses...');
      navigation.navigate('AddressScreen');
    } catch (error) {
      console.error('[ChatBot] Navigation error:', error);
      // Không throw error để tránh ảnh hưởng đến việc đóng modal
    }
  };

  const sendMessage = async (customText = null) => {
    console.log('[ChatBot] sendMessage called');
    console.log('[ChatBot] customText:', customText);
    console.log('[ChatBot] inputText:', inputText);
    
    const messageText = customText || inputText.trim();
    console.log('[ChatBot] Final messageText:', messageText);
    
    if (!messageText) {
      console.log('[ChatBot] No message text, returning');
      return;
    }

    const safeMessageText = typeof messageText === 'string' ? messageText : String(messageText || '');
    console.log('[ChatBot] Safe messageText:', safeMessageText);

    const userMessage = {
      id: Date.now().toString(),
      text: safeMessageText,
      isUser: true,
      timestamp: new Date(),
    };

    console.log('[ChatBot] User message object:', userMessage);

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      console.log('[ChatBot] Calling chatbot service');
      const response = await chatbotService.sendMessage(safeMessageText);
      
      console.log('[ChatBot] API response received:', response);
      
      // Xử lý response bằng helper function
      const responseText = processApiResponse(response);
      console.log('[ChatBot] Final response text:', responseText);
      
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isUser: false,
        timestamp: new Date(),
      };

      console.log('[ChatBot] Bot message object:', botMessage);

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('[ChatBot] Error sending message:', error);
      Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }) => {
    console.log('[ChatBot] Rendering message:', item);
    console.log('[ChatBot] Message text:', item.text);
    console.log('[ChatBot] Message text type:', typeof item.text);
    const messageText = typeof item.text === 'string' ? item.text : String(item.text || '');
    console.log('[ChatBot] Final message text:', messageText);
    
    return (
      <View style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.botMessage
      ]}>
        <View style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.botBubble
        ]}>
          <Text style={[
            styles.messageText,
            item.isUser ? styles.userText : styles.botText
          ]}>
            {messageText}
          </Text>
          <Text style={styles.timestamp}>
            {item.timestamp.toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </View>
    );
  };

   return (
    <>
      {/* Floating Chat Button */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            opacity: fabOpacity,
            transform: [
              { translateX: pan.x },
              { translateY: pan.y },
              { scale: Animated.multiply(scale, fabScale) },
            ],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          onPress={openModal}
          activeOpacity={0.8}
          style={styles.buttonContent}
          disabled={isVisible}
        >
          <Image 
            source={require('../assets/chatbot.png')} 
            style={styles.chatbotIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal Overlay */}
      {isVisible && (
        <Animated.View style={[styles.modalOverlay, { opacity: backgroundOpacity }]}>
          <TouchableOpacity
            style={styles.backgroundTouchable}
            activeOpacity={1}
            onPress={closeModal}
          />
          <Animated.View
            style={[
              styles.modalContainer,
              {
                opacity: modalOpacity,
                transform: [
                  { scale: modalScale },
                  { translateX: modalTranslateX },
                  { translateY: modalTranslateY }
                ],
              },
            ]}
          >
              <View style={styles.modalContent}>
                {/* Header */}
                <View style={styles.header}>
                  <View style={styles.headerContent}>
                    <View style={styles.botInfo}>
                      <View style={styles.botAvatar}>
                        <Image 
                          source={require('../assets/chatbot.png')} 
                          style={styles.botAvatarIcon}
                          resizeMode="contain"
                        />
                      </View>
                      <View>
                        <Text style={styles.botName}>S7M AI Assistant</Text>
                        <Text style={styles.botStatus}>Đang hoạt động</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.closeButton}
                      onPress={closeModal}
                    >
                      <Icon name="close" size={24} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Messages */}
                <FlatList
                  ref={flatListRef}
                  data={messages}
                  renderItem={renderMessage}
                  keyExtractor={item => item.id}
                  style={styles.messagesList}
                  contentContainerStyle={styles.messagesContent}
                  showsVerticalScrollIndicator={false}
                  onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                  onLayout={() => flatListRef.current?.scrollToEnd()}
                />

                {/* Loading indicator */}
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#FF6B35" />
                    <Text style={styles.loadingText}>AI đang trả lời...</Text>
                  </View>
                )}

                {/* Voice listening indicator */}
                {isListening && (
                  <View style={styles.listeningContainer}>
                    <View style={styles.listeningIndicator}>
                      <ActivityIndicator size="small" color="white" />
                    </View>
                    <Text style={styles.listeningText}>Đang nghe... Hãy nói rõ ràng</Text>
                    <TouchableOpacity
                      style={styles.stopListeningButton}
                      onPress={stopListening}
                    >
                      <Icon name="stop" size={16} color="white" />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Input */}
                <View style={styles.inputContainer}>
                  {/* Voice Button */}
                  <TouchableOpacity
                    style={[
                      styles.voiceButton,
                      isListening && styles.voiceButtonListening
                    ]}
                    onPress={isListening ? stopListening : startListening}
                    disabled={isLoading}
                  >
                    <Icon 
                      name={isListening ? "mic" : "mic-none"} 
                      size={24} 
                      color={isListening ? "white" : "#FF6B35"} 
                    />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={(text) => {
                      console.log('[ChatBot] TextInput onChangeText:', text);
                      console.log('[ChatBot] TextInput type:', typeof text);
                      setInputText(text);
                    }}
                    placeholder="Nhập tin nhắn..."
                    placeholderTextColor="#999"
                    multiline
                    maxLength={500}
                    autoFocus={false}
                    blurOnSubmit={false}
                    returnKeyType="default"
                    keyboardType="default"
                    textAlignVertical="top"
                    onFocus={() => console.log('[ChatBot] TextInput focused')}
                    onBlur={() => console.log('[ChatBot] TextInput blurred')}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      !inputText.trim() && styles.sendButtonDisabled
                    ]}
                    onPress={() => sendMessage()}
                    disabled={!inputText.trim() || isLoading}
                  >
                    <Icon 
                      name="send" 
                      size={20} 
                      color={inputText.trim() ? "white" : "#ccc"} 
                    />
                  </TouchableOpacity>
                                 </View>
               </View>
             </Animated.View>
           </Animated.View>
         )}
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'transparent',
    zIndex: 1000,
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
    backgroundColor: 'transparent',
  },
  chatbotIcon: {
    width: 36,
    height: 36,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  backgroundTouchable: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  modalContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    position: 'absolute',
    maxHeight: '85%',
  },
  modalContent: {
    flex: 1,
  },
  header: {
    backgroundColor: '#F8FAFC',
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  botInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  botAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  botAvatarIcon: {
    width: 28,
    height: 28,
  },
  botName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  botStatus: {
    fontSize: 13,
    color: '#10B981',
    marginTop: 4,
    fontWeight: '500',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContent: {
    padding: 20,
  },
  messageContainer: {
    marginBottom: 16,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 16,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: '#6366F1',
    borderBottomRightRadius: 6,
  },
  botBubble: {
    backgroundColor: '#F8FAFC',
    borderBottomLeftRadius: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#1E293B',
  },
  timestamp: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 6,
    alignSelf: 'flex-end',
    fontWeight: '500',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginLeft: 10,
    fontWeight: '500',
  },
  listeningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#6366F1',
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 16,
  },
  listeningIndicator: {
    marginRight: 10,
  },
  listeningText: {
    fontSize: 13,
    color: 'white',
    fontWeight: '600',
    flex: 1,
  },
  stopListeningButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    minHeight: 70,
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceButtonListening: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxHeight: 100,
    fontSize: 15,
    color: '#1E293B',
    marginRight: 12,
    backgroundColor: 'white',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#6366F1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  sendButtonDisabled: {
    backgroundColor: '#CBD5E1',
    shadowOpacity: 0,
    elevation: 0,
  },
});

export default ChatBot;
