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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice from '@react-native-voice/voice';
import { chatbotService } from '../services/chatbotService';


const { width, height } = Dimensions.get('window');

const ChatBot = () => {
  // const navigation = useNavigation();
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const flatListRef = useRef(null);
  const [isVoiceAvailable, setIsVoiceAvailable] = useState(false);
  
  // Animation values for draggable button
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({
    x: Dimensions.get('window').width - 76,
    y: Dimensions.get('window').height - 86
  })).current;

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
        // Kiểm tra xem Voice có khả dụng không
        const available = await Voice.isAvailable();
        console.log('🔍 [SETUP] Voice available:', available);
        setIsVoiceAvailable(available);
        
        if (!available) {
          console.error('❌ [SETUP] Voice không khả dụng trên thiết bị này');
          return;
        }
  
        // QUAN TRỌNG: Đăng ký các event listeners
        Voice.onSpeechStart = onSpeechStart;         // Khi bắt đầu nghe
        Voice.onSpeechEnd = onSpeechEnd;             // Khi kết thúc nghe  
        Voice.onSpeechResults = onSpeechResults;     // Khi có kết quả cuối cùng
        Voice.onSpeechPartialResults = onSpeechPartialResults; // Kết quả real-time
        Voice.onSpeechError = onSpeechError;         // Khi có lỗi
        
        console.log('✅ [SETUP] Voice listeners đã được đăng ký');
        
      } catch (error) {
        console.error('❌ [SETUP] Lỗi khởi tạo Voice:', error);
        setIsVoiceAvailable(false);
      }
    };
  
    initializeVoice();
  
    // Cleanup khi component bị hủy
    return () => {
      console.log('🧹 [CLEANUP] Dọn dẹp Voice listeners');
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // Add welcome message when component mounts
  // useEffect(() => {
  //   console.log('[ChatBot] Component mounted, setting up voice recognition');
    
  //   setMessages([
  //     {
  //       id: '1',
  //       text: 'Xin chào! Tôi là trợ lý AI của S7M Store. Bạn cần hỗ trợ gì?',
  //       isUser: false,
  //       timestamp: new Date(),
  //     },
  //   ]);

  //   // Setup Voice event listeners
  //   Voice.onSpeechStart = onSpeechStart;
  //   Voice.onSpeechEnd = onSpeechEnd;
  //   Voice.onSpeechError = onSpeechError;
  //   Voice.onSpeechResults = onSpeechResults;
  //   Voice.onSpeechPartialResults = onSpeechPartialResults;

  //   console.log('[ChatBot] Voice event listeners set up');
    

  //   return () => {
  //     console.log('[ChatBot] Component unmounting, cleaning up voice listeners');
  //     Voice.destroy().then(Voice.removeAllListeners);
  //   };
  // }, []);

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
    setIsListening(false);
    
    let errorMessage = 'Không thể nhận dạng giọng nói. Vui lòng thử lại.';
    
    if (error.error) {
      switch (error.error.code) {
        case '13':
        case '11':
          errorMessage = 'Không hiểu được giọng nói. Vui lòng nói rõ ràng hơn.';
          break;
        case '5':
          errorMessage = 'Lỗi kết nối. Vui lòng kiểm tra internet và thử lại.';
          break;
        case '7':
          errorMessage = 'Không có audio được phát hiện. Vui lòng nói to hơn.';
          break;
        case '9':
          errorMessage = 'Lỗi permission. Vui lòng cấp quyền microphone.';
          break;
        default:
          errorMessage = `Lỗi: ${error.error.message || 'Không xác định'}`;
      }
    }
    
    Alert.alert('Lỗi nhận dạng giọng nói', errorMessage);
  };

  const onSpeechResults = (event) => {
    console.log('[Voice] Speech results received:', event);
    
    if (event.value && event.value.length > 0) {
      const text = event.value[0];
      console.log('[Voice] Extracted text:', text);
      console.log('[Voice] Type of text:', typeof text);
      
      // Đảm bảo text là string
      const safeText = typeof text === 'string' ? text : String(text || '');
      console.log('[Voice] Safe text:', safeText);
      
      setInputText(safeText);
      
      // Auto-send after 1.5 seconds of silence
      setTimeout(() => {
        console.log('[Voice] Auto-sending message after silence');
        if (safeText.trim()) {
          sendMessage(safeText);
        }
      }, 1500);
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
      setIsListening(true);
      // Stop any existing recognition first
      await Voice.stop();
      console.log('[Voice] Stopped any existing recognition');
      
      // Start new recognition with Vietnamese language
      await Voice.start('vi-VN');
      console.log('[Voice] Voice recognition started successfully');
      
    } catch (error) {
      console.error('[Voice] Error starting voice recognition:', error);
      Alert.alert('Lỗi', 'Không thể khởi động nhận dạng giọng nói.');
    }
  };

  const stopListening = async () => {
    console.log('[Voice] Stopping voice recognition');
    try {
      await Voice.stop();
      setIsListening(false);
      console.log('[Voice] Voice recognition stopped successfully');
    } catch (error) {
      console.error('[Voice] Error stopping voice recognition:', error);
    }
  };

  // Helper function để xử lý response từ API
  const processApiResponse = (response) => {
    console.log('[ChatBot] Processing API response:', response);
    console.log('[ChatBot] Response type:', typeof response);
    
    // Kiểm tra nếu response là số hoặc có thể convert thành số
    if (typeof response === 'number' || !isNaN(Number(response))) {
      console.log('[ChatBot] Response is numeric, showing default message');
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
             transform: [
               { translateX: pan.x },
               { translateY: pan.y },
               { scale: scale },
             ],
           },
         ]}
         {...panResponder.panHandlers}
       >
        <TouchableOpacity
          onPress={() => setIsVisible(true)}
          activeOpacity={0.8}
          style={styles.buttonContent}
        >
          <Image 
            source={require('../assets/chatbot.png')} 
            style={styles.chatbotIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Chat Modal */}
      <Modal
        visible={isVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
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
                onPress={() => setIsVisible(false)}
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
              <Text style={styles.listeningText}>Đang nghe...</Text>
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
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
    // Add border for better visibility
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 28,
  },
  chatbotIcon: {
    width: 28,
    height: 28,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  botAvatarIcon: {
    width: 24,
    height: 24,
  },
  botName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  botStatus: {
    fontSize: 12,
    color: '#4CAF50',
    marginTop: 2,
  },
  closeButton: {
    padding: 5,
  },
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 15,
  },
  messageContainer: {
    marginBottom: 15,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  botMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    padding: 12,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#FF6B35',
    borderBottomRightRadius: 4,
  },
  botBubble: {
    backgroundColor: 'white',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: 'white',
  },
  botText: {
    color: '#333',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  listeningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FF6B35',
  },
  listeningIndicator: {
    marginRight: 8,
  },
  listeningText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 15,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  voiceButtonListening: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
});

export default ChatBot; 