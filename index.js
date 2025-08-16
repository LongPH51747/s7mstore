import { AppRegistry } from 'react-native';
import App from './App.tsx';
import { name as appName } from './app.json';
import { initializeSdks } from './src/utils/initializeSdks';
import PushNotification from 'react-native-push-notification';

// ✅ IMPORT NAVIGATION SERVICE
import { navigate } from './App.tsx';

// 🔥 EARLY PUSH NOTIFICATION SETUP
console.log('🔥 [INDEX.JS] Setting up push notifications EARLY...');
console.log('🔥 [INDEX.JS] PushNotification available:', !!PushNotification);

// ✅ PUSH NOTIFICATION SETUP WITH NAVIGATION
PushNotification.configure({
  onRegister: function (token) {
    console.log('🔥 [INDEX.JS] TOKEN:', token);
  },
  
  // ✅ HANDLE NOTIFICATION TAP - NAVIGATE TO PROFILE
  onNotification: function (notification) {
    console.log('🔥 [INDEX.JS] NOTIFICATION RECEIVED:', notification);
    console.log('🔥 [INDEX.JS] User tapped:', notification.userInteraction);
    console.log('🔥 [INDEX.JS] UserInfo:', notification.userInfo);
    
    // ✅ NAVIGATE TO PROFILE WHEN NOTIFICATION IS TAPPED
    if (notification.userInteraction === true) {
      console.log('🎯 [INDEX.JS] User tapped notification! Navigating to ProfileScreen...');
      
      // Add small delay to ensure app is ready
      setTimeout(() => {
        navigate('ProfileScreen');
        console.log('🎯 [INDEX.JS] Navigation to ProfileScreen initiated');
      }, 500);
    } else {
      console.log('📱 [INDEX.JS] Notification received but not tapped');
    }
  },
  
  permissions: {
    alert: true,
    badge: true,
    sound: true,
  },
  popInitialNotification: true,
  requestPermissions: true,
});

console.log('🔥 [INDEX.JS] Push notification setup completed with navigation');

// Khởi tạo SDK ngay khi ứng dụng bắt đầu
initializeSdks();

AppRegistry.registerComponent(appName, () => App);