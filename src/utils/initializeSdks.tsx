import { GoogleSignin } from '@react-native-google-signin/google-signin';
import firebase from '@react-native-firebase/app';

/**
 * Hàm khởi tạo các SDK cần thiết cho ứng dụng
 * Bao gồm Firebase và Google Sign-In
 */
export const initializeSdks = () => {
  // Khởi tạo Firebase
  try {
    // Kiểm tra xem Firebase đã được khởi tạo chưa
    if (!firebase.apps.length) {
      // Khởi tạo Firebase với cấu hình từ google-services.json
      firebase.initializeApp({
        projectId: 's7m-a48ec',                    // ID dự án Firebase
        appId: '1:649260662561:android:0b865aecaf4193329c4860', // ID ứng dụng Firebase
        databaseURL: 'https://s7m-a48ec-default-rtdb.asia-southeast1.firebasedatabase.app', // URL database
        storageBucket: 's7m-a48ec.firebasestorage.app', // Bucket lưu trữ
        apiKey: 'AIzaSyDJZ9wowQJAfYahOgoJvuMOEdxabgnty4w', // API key
        messagingSenderId: '649260662561'         // ID người gửi tin nhắn
      });
    }
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase:', error);
  }

  // Khởi tạo Google Sign-In
  try {
    // Cấu hình Google Sign-In với các thông tin cần thiết
    GoogleSignin.configure({
      webClientId: '649260662561-3l4i52uibivtvf20ioed5g6f98ps24o5.apps.googleusercontent.com', // Client ID cho web
      offlineAccess: true,  // Cho phép truy cập offline
      scopes: ['profile', 'email']  // Các quyền cần thiết: thông tin profile và email
    });
    console.log('GoogleSignin configured successfully');
  } catch (error) {
    console.error('Error configuring GoogleSignin:', error);
  }
};