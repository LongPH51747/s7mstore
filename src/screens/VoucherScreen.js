import { StyleSheet, Text, View, FlatList, SafeAreaView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';
import LogoS7MStore from '../assets/LogoS7MStore.png';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const VoucherScreen = ({ onSelectVoucher, currentSubtotal }) => {
  const [allVouchers, setAllVouchers] = useState([]);
  const [filteredVouchers, setFilteredVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [userId, setUserId] = useState(null);
  const navigation = useNavigation();

  // Hàm để lấy userId từ AsyncStorage
  const fetchUser = async () => {
    try {
      const storedUserData = await AsyncStorage.getItem('userInfo');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        console.log("Fetched user data:", userData);
        setUserId(userData._id);
        console.log("User ID:", userData._id);
        return userData._id;
      }
      console.log("No user data found in AsyncStorage.");
    } catch (e) {
      console.error('Failed to fetch user from AsyncStorage:', e);
    }
    return null;
  };

  // Hàm để gọi API lấy danh sách voucher
  const fetchVouchers = async (currentUserId) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching vouchers for userId:", currentUserId);

      if (!currentUserId) {
        setError('Không tìm thấy ID người dùng. Vui lòng đăng nhập.');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(API_ENDPOINTS.VOUCHER.GET_ALL(currentUserId), {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      
      console.log("API response status:", response.status);
      console.log("API response data:", response.data);

      if (response.status !== 200) {
        throw new Error('Không thể tải dữ liệu voucher.');
      }
      
      // Sửa đổi ở đây: Gộp hai mảng public và private thành một mảng duy nhất
      const allFetchedVouchers = [...(response.data.public || []), ...(response.data.private || [])];

      console.log("Combined and prepared vouchers:", allFetchedVouchers);

      setAllVouchers(allFetchedVouchers);
      setFilteredVouchers(allFetchedVouchers);
      
    } catch (err) {
      console.error("Lỗi khi lấy dữ liệu voucher:", err.response?.data || err.message);
      setError(`Không thể tải voucher. Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const currentUserId = await fetchUser();
      await fetchVouchers(currentUserId);
    };
    initialize();
  }, []);
  
  // Logic lọc voucher mỗi khi filterType hoặc allVouchers thay đổi
  useEffect(() => {
    console.log("Filtering vouchers. Filter type:", filterType);
    console.log("Initial vouchers for filtering:", allVouchers);

    if (filterType === 'all') {
      setFilteredVouchers(allVouchers);
    } else {
      const newFilteredVouchers = allVouchers.filter(voucher => {
        if (filterType === 'public' && voucher.isPublic) {
          return true;
        }
        if (filterType === 'private' && !voucher.isPublic) {
          return true;
        }
        return false;
      });
      setFilteredVouchers(newFilteredVouchers);
    }
    console.log("Filtered vouchers:", filteredVouchers);
  }, [filterType, allVouchers]);
  
  const renderVoucherItem = ({ item }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN');
    };

    const isPercentage = item.type === 'percentage';
    const valueText = isPercentage ? `${item.value}%` : `${item.value.toLocaleString('vi-VN')}đ`;
    const isApplicable = currentSubtotal >= item.minOrderValue;

    return (
      <View style={styles.card}>
        <Image 
          source={LogoS7MStore}
          style={styles.logoBackground}
          resizeMode="contain"
        />
        <View style={styles.cardHeader}>
          <Text style={styles.voucherCode}>{item.code}</Text>
          <Text style={styles.voucherType}>{isPercentage ? 'Giảm %' : 'Giảm tiền'}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.voucherValue}>Giảm: {valueText}</Text>
          {item.minOrderValue > 0 && (
            <Text style={styles.voucherCondition}>
              Đơn hàng tối thiểu: {item.minOrderValue.toLocaleString('vi-VN')}đ
            </Text>
          )}
          <Text style={styles.voucherDate}>
            Hết hạn: {formatDate(item.endDate)}
          </Text>
        </View>
        <TouchableOpacity 
          style={[styles.applyButton]}
          onPress={() => navigation.navigate('HomeScreen')}
        >
          <Text style={styles.applyButtonText}>
            Dùng ngay
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#4B5563" />
        <Text style={styles.loadingText}>Đang tải voucher...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity onPress={() => fetchVouchers(userId)} style={styles.reloadButton}>
          <Text style={styles.reloadButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.header}>Voucher dành cho bạn</Text>
        <TouchableOpacity style={styles.closeButton} onPress={() => onSelectVoucher(null)}>
          <Text style={styles.closeButtonText}>X</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, filterType === 'all' && styles.activeTab]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.tabText, filterType === 'all' && styles.activeTabText]}>Tất cả</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filterType === 'public' && styles.activeTab]}
          onPress={() => setFilterType('public')}
        >
          <Text style={[styles.tabText, filterType === 'public' && styles.activeTabText]}>Công khai</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, filterType === 'private' && styles.activeTab]}
          onPress={() => setFilterType('private')}
        >
          <Text style={[styles.tabText, filterType === 'private' && styles.activeTabText]}>Danh cho bạn</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredVouchers}
        renderItem={renderVoucherItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>Hiện chưa có voucher nào.</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    position: 'relative',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 15,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative', 
    overflow: 'hidden', 
  },
  logoBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.1, 
    zIndex: -1, 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 8,
    marginBottom: 8,
  },
  voucherCode: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  voucherType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  cardBody: {
    marginBottom: 8,
  },
  voucherValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#10B981',
  },
  voucherCondition: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  voucherDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  applyButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#4B5563',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    marginBottom: 10,
  },
  reloadButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  reloadButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  activeTabText: {
    color: '#1F2937',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 20,
  }
});

export default VoucherScreen;
