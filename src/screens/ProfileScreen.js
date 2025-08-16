import { useNavigation, useIsFocused } from '@react-navigation/native'; // Thêm useIsFocused
import React, { useState, useEffect, useCallback } from 'react'; // Thêm useCallback
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  ActivityIndicator,
  Alert,
  AppState,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Import AsyncStorage
import CustomNavBottom from '../components/CustomNavBottom';
import axios from 'axios';
import { API_ENDPOINTS, API_HEADERS,  API_BASE_URL  } from '../config/api';
import { useNotification } from '../contexts/NotificationContext';
import PushNotification from 'react-native-push-notification';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused(); // Hook để kiểm tra xem màn hình có đang focus không
  const [user, setUser] = useState(null); // State để lưu thông tin người dùng
  const [loading, setLoading] = useState(true); // State để quản lý loading
  const { getUnreadCount } = useNotification();


  


  // Hàm tải thông tin người dùng từ AsyncStorage
  const fetchUserInfo = useCallback(async () => {
    setLoading(true);
    try {
      // Kiểm tra testKey
      const testValue = await AsyncStorage.getItem('testKey');
      console.log('[PROFILE] testKey value after restart:', testValue);
      const userInfoString = await AsyncStorage.getItem('userInfo');
      console.log('[PROFILE] userInfoString lấy từ AsyncStorage:', userInfoString);
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUser(userInfo);
        const userId = userInfo._id;
        if (userId) {
          await fetchUserById(userId);
        }
      } else {
        console.log('[PROFILE] Không có userInfo trong AsyncStorage, thử lấy userToken...');
        const token = await AsyncStorage.getItem('userToken');
        console.log('[PROFILE] userToken lấy từ AsyncStorage:', token);
        if (token) {
          console.log('[PROFILE] Có userToken, gọi fetchUserFromToken...');
          await fetchUserFromToken(token); // Hàm này gọi API profile với Bearer token
        } else {
          console.log('[PROFILE] Không có userToken trong AsyncStorage.');
          setUser(null);
        }
      }
    } catch (error) {
      console.error('[PROFILE] Lỗi khi đọc thông tin người dùng từ AsyncStorage:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin người dùng.');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [fetchUserById, fetchUserFromToken]); // useCallback để tránh tạo lại hàm không cần thiết

  // 1. useEffect để fetch user info khi màn hình focus
  useEffect(() => {
    if (isFocused) {
      fetchUserInfo();
    }
  }, [isFocused, fetchUserInfo]);

  // 2. useEffect riêng để log user khi user thay đổi
  useEffect(() => {
    if (user) {
      console.log('[PROFILE] user state:', user);
    }
  }, [user]);

  // Hàm xử lý đăng xuất
  const handleLogout = async () => {
    Alert.alert(
      "Đăng xuất",
      "Bạn có chắc chắn muốn đăng xuất khỏi tài khoản?",
      [
        {
          text: "Hủy",
          style: "cancel"
        },
        {
          text: "Đăng xuất",
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userInfo');
              await AsyncStorage.removeItem('shouldAutoLogin'); // Nếu bạn có biến này
              setUser(null); // Xóa user khỏi state
              Alert.alert('Thành công', 'Bạn đã đăng xuất.');
              navigation.replace('LoginScreen'); // Điều hướng về màn hình đăng nhập
            } catch (error) {
              console.error("Lỗi khi đăng xuất:", error);
              Alert.alert("Lỗi", "Không thể đăng xuất. Vui lòng thử lại.");
            }
          }
        }
      ]
    );
  };

  // Hàm lấy thông tin user từ token
  const fetchUserFromToken = useCallback(async (token) => {
    try {
      const response = await axios.get(API_ENDPOINTS.USERS.GET_PROFILE, {
        headers: {
          ...API_HEADERS,
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (response.data && response.data.user) {
        const userInfo = response.data.user;
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
        setUser(userInfo);
        console.log('[PROFILE] userInfo lấy từ API bằng token:', userInfo);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Lỗi khi lấy user từ token:', error);
      setUser(null);
      // Nếu token hết hạn, xóa token và userInfo
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userInfo');
    }
  }, []);

  // Hàm lấy thông tin user bằng _id
  const fetchUserById = useCallback(async (id) => {
    try {
      console.log('[PROFILE] Gọi API GET_BY_ID với id:', id);
      const response = await axios.get(API_ENDPOINTS.USERS.GET_BY_ID(id), {
        headers: API_HEADERS,
      });
      console.log('[PROFILE] Response từ API GET_BY_ID:', response.data);
      if (response.data && response.data._id) {
        const userInfo = response.data;
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
        setUser(userInfo);
        console.log('[PROFILE] userInfo sau khi lấy từ API bằng _id:', userInfo);
      } else {
        console.log('[PROFILE] Không tìm thấy user hợp lệ trong response:', response.data);
      }
    } catch (error) {
      console.error('[PROFILE] Lỗi khi lấy user bằng _id:', error, error?.response?.data);
      // Nếu lỗi, có thể giữ nguyên user cũ hoặc xử lý khác tùy ý bạn
    }
  }, []);

  // Hiển thị loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={{ marginTop: 10 }}>Đang tải thông tin người dùng...</Text>
      </View>
    );
  }

  // Nếu không có thông tin người dùng (chưa đăng nhập hoặc đã đăng xuất)
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Bạn chưa đăng nhập hoặc thông tin người dùng không hợp lệ.</Text>
        <TouchableOpacity style={styles.loginAgainButton} onPress={() => navigation.replace('LoginScreen')}>
          <Text style={styles.loginAgainButtonText}>Đăng nhập ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar backgroundColor='white' barStyle='dark-content' />
      <ScrollView style={styles.container}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
            <Ionicons name="chevron-back-outline" size={26} color="black" />
          </TouchableOpacity>
          <Text style={styles.title}>My account</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CartScreen')} style={styles.iconButton}>
            <Feather name="shopping-bag" size={24} color="black" />
          </TouchableOpacity>
        </View>

       
        <TouchableOpacity style={styles.profileInfo} onPress={() => navigation.navigate('EditProfileScreen', { user })}>
          <Image
  style={styles.avatar}
  source={{
    uri: user?.avatar
      ? user.avatar.startsWith('http')
        ? user.avatar
        : `${API_BASE_URL}/${user.avatar}`
      : 'https://via.placeholder.com/150',
  }}
  onError={(e) => {
    // Để gỡ lỗi, bạn có thể in ra URL bị lỗi
    console.error('Lỗi tải ảnh đại diện:', e.nativeEvent.error);
    console.log('URL bị lỗi:', e.target.source);
  }}
/>
          <View style={styles.profileTextContainer}>
         
            <Text style={styles.name}>{user.displayName || user.fullname || 'Tên người dùng'}</Text> 
            <Text style={{fontFamily: 'Nunito-VariableFont_wght'}}>{user.email || user.phoneNumber || 'Không có email/SĐT'}</Text> 
          </View>
          <Ionicons name="chevron-forward-outline" size={24} color="#555" />
        </TouchableOpacity>

        <View style={{ marginVertical: 12, paddingVertical: 5 }}>
          <TouchableOpacity style={styles.orderHistory} onPress={() => navigation.navigate('OrderScreen')}>
            <Text style={styles.orderHistoryTitle}>Đơn mua</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.orderHistoryLink}>Xem lịch sử mua hàng</Text>
              <Ionicons name="chevron-forward" size={24} color="black" />
            </View>
          </TouchableOpacity>

          <View style={styles.statusBarContainer}>
            <TouchableOpacity style={styles.status}>
              <Feather name="clock" size={24} color="black" />
              <Text style={styles.textStatus}>Chờ xác nhận</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.status}>
              <Feather name="package" size={24} color="black" />
              <Text style={styles.textStatus}>Chờ lấy hàng</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.status}>
              <Feather name="truck" size={24} color="black" />
              <Text style={styles.textStatus}>Chờ giao hàng</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.status}>
              <Feather name="check-circle" size={24} color="black" />
              <Text style={styles.textStatus}>Đã nhận</Text>
            </TouchableOpacity>
          </View>
        </View>

      
        <Text style={styles.sectionTitle}>Activity</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity
          onPress={() => navigation.navigate('VoucherScreen')}
          style={styles.activityButton}>
            <Feather name="gift" size={24} color="white" />
            <Text style={styles.activityText}>Voucher</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activityButton} onPress={() => navigation.navigate('OrderScreen')}>
            <Feather name="box" size={20} color="#fff" />
            <Text style={styles.activityText}>Đơn hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.activityButton}>
            <Feather name="star" size={20} color="#fff" />
            <Text style={styles.activityText}>Yêu thích</Text>
          </TouchableOpacity>
        </View>

      
        <Text style={styles.sectionTitle}>Địa chỉ</Text>
        <TouchableOpacity style={styles.itemRow} onPress={() => navigation.navigate('AddressScreen')}>
          <Feather name="map-pin" size={20} color="black" />
          <Text style={styles.itemText}>Chỉnh sửa địa chỉ giao hàng</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#aaa" style={styles.itemRowChevron} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Thông Báo</Text>
        <TouchableOpacity
        style={styles.itemRow}
        onPress={() => navigation.navigate('NotificationScreen')}
        >
          <View style={styles.notificationIconContainer}>
            <Feather name="bell" size={20} color="black" />
            {(() => {
              const unreadCount = getUnreadCount();
              console.log(`🎯 ProfileScreen badge render - Unread count: ${unreadCount}`);
              return unreadCount > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
          <Text style={styles.itemText}>Thông báo người dùng</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#aaa" style={styles.itemRowChevron} />
        </TouchableOpacity>
       
        <Text style={styles.sectionTitle}>Support</Text>
        <View style={styles.supportGrid}>
          <TouchableOpacity
          onPress={() => navigation.navigate('ChangePass')}
          style={styles.gridItem}>
            <Feather name="unlock" size={20} color="black" />
            <Text style={styles.gridText}>Đổi mật khẩu</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => navigation.navigate('ChatScreen')}
            style={styles.gridItem}>
            <Feather name="message-circle" size={20} color="black" />
            <Text style={styles.gridText}>Chat with us</Text>
          </TouchableOpacity>
        
          {user.phoneNumber && ( // Kiểm tra xem user có phoneNumber không
            <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('ChangePass')}>
              <Feather name="lock" size={20} color="black" />
              <Text style={styles.gridText}>Đổi mật khẩu</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.gridItem}>
            <Feather name="info" size={20} color="black" />
            <Text style={styles.gridText}>Thông tin cửa hàng</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.gridItem}>
            <Feather name="refresh-ccw" size={20} color="black" />
            <Text style={styles.gridText}>Đổi trả hàng</Text>
          </TouchableOpacity>
        </View>

        {/* SETTINGS */}
        <Text style={styles.sectionTitle}>Cài đặt</Text>
        {/* Nút "Quên mật khẩu" chỉ nên hiện nếu user có thông tin phoneNumber (đăng nhập SĐT) */}
        {user.phoneNumber && ( // Kiểm tra xem user có phoneNumber không
          <TouchableOpacity style={styles.itemRow} onPress={() => navigation.navigate('ForgotPasswordScreen')}>
            <Feather name="lock" size={20} color="black" />
            <Text style={styles.itemText}>Quên mật khẩu</Text>
            <Ionicons name="chevron-forward-outline" size={20} color="#aaa" style={styles.itemRowChevron} />
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.itemRow}>
          <Feather name="globe" size={20} color="black" />
          <Text style={styles.itemText}>Vị trí & Ngôn ngữ</Text>
          <Ionicons name="chevron-forward-outline" size={20} color="#aaa" style={styles.itemRowChevron} />
        </TouchableOpacity>

        {/* LOGOUT BUTTON */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Feather name="log-out" size={20} color="#EF5350" />
          <Text style={styles.logoutButtonText}>Đăng xuất</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
      <CustomNavBottom/>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 15,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loginAgainButton: {
    marginTop: 20,
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  loginAgainButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    
  },
  iconButton: {
    padding: 5,
  },
  title: {
    fontSize: 20,
    fontFamily: 'Nunito-Black',
    color: 'black',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#eee',
  },
  profileTextContainer: {
    flex: 1,
  },
  name: {
    fontSize: 18,
    fontFamily: 'Nunito-Medium',
    color: '#333',
  
  },
  orderHistory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginBottom: 10,
  },
  orderHistoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  orderHistoryLink: {
    fontSize: 14,
    color: '#666',
    marginRight: 5,
    fontFamily: 'Nunito-Black',
    fontStyle: 'normal',
    fontWeight: '600',
  },
  statusBarContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  status: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 5,
  },
  textStatus: {
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    color: '#555',
    fontFamily: 'Nunito-Medium',
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 17,
    marginTop: 25,
    marginBottom: 10,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  activityButton: {
    backgroundColor: '#1c2b38',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  activityText: {
    color: 'white',
    fontSize: 13,
    marginTop: 8,
    fontFamily: 'Nunito-Medium',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  itemText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontFamily: 'Nunito-Medium',
  },
  itemRowChevron: {
    marginLeft: 'auto',
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  gridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  gridText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#333',
    fontFamily: 'Nunito-Medium',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    backgroundColor: '#ffe0e0',
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'red',
    marginBottom: 20,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#EF5350',
    marginLeft: 10,
    fontFamily: 'Nunito-Black',
  },
  notificationIconContainer: {
    position: 'relative',
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ff4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  // ✅ DEBUG TEST BUTTON STYLES
  debugSection: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#f0f8ff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: '#333',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
  },
  testButton2: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  fireTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4500',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FF6B35',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  directTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8E24AA',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#9C27B0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  diagnosticsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#607D8B',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  simpleTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFA726',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  permissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#66BB6A',
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF7043',
  },
  navTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  onceTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B', // A different color for one-time test
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF8E8E',
  },
  intervalTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4136', // A different color for interval test
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF6347',
  },
  backgroundTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  statusTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#66BB6A',
  },
  abortTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B', // A different color for abort test
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF8E8E',
  },
  dedupTestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B', // A different color for dedup test
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF8E8E',
  },

});

export default ProfileScreen;