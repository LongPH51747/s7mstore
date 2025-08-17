import { AppRegistry } from 'react-native';
import App from './App.tsx';
import { name as appName } from './app.json';
import { initializeSdks } from './src/utils/initializeSdks';

// ✅ IMPORT NAVIGATION SERVICE
import { navigate } from './App.tsx';

// 🔥 EARLY PUSH NOTIFICATION SETUP
console.log('🔥 [INDEX.JS] Setting up push notifications EARLY...');

// ✅ PUSH NOTIFICATION SETUP WITH NAVIGATION
// Chỉ cấu hình PushNotification nếu nó có sẵn
try {
  const PushNotification = require('react-native-push-notification');
  
  if (PushNotification) {
    console.log('🔥 [INDEX.JS] PushNotification available: true');
    
    // Cấu hình push notification
    PushNotification.configure({
      onRegister: function (token) {
        console.log('🔥 [INDEX.JS] TOKEN:', token);
      },
      
      onNotification: function (notification) {
        console.log('🔥 [INDEX.JS] NOTIFICATION RECEIVED:', notification);
        
        // Chỉ xử lý khi user tap vào notification
        if (notification.userInteraction === true) {
          console.log('🎯 [INDEX.JS] User tapped notification! Navigating to ProfileScreen...');
          
          // Add small delay to ensure app is ready
          setTimeout(() => {
            navigate('ProfileScreen');
            console.log('🎯 [INDEX.JS] Navigation to ProfileScreen initiated');
          }, 500);
        }
      },
      
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      // Sử dụng cấu hình từ file config
      popInitialNotification: true,
      requestPermissions: true,
    });
    
    // Cấu hình channels cho Android
    PushNotification.createChannel(
      {
        channelId: 'default-channel-id',
        channelName: 'Default channel',
        channelDescription: 'A default channel',
        soundName: 'default',
        importance: 4,
        vibrate: true,
      },
      (created) => console.log(`Channel created: ${created}`)
    );
    
    console.log('🔥 [INDEX.JS] Push notification setup completed with navigation');
  } else {
    console.log('🔥 [INDEX.JS] PushNotification not available');
  }
} catch (error) {
  console.log('🔥 [INDEX.JS] PushNotification setup failed:', error.message);
}

// Khởi tạo SDK ngay khi ứng dụng bắt đầu
initializeSdks();

AppRegistry.registerComponent(appName, () => App);