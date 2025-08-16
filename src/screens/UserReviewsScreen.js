import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image, StyleSheet, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { API_ENDPOINTS, API_HEADERS, API_BASE_URL } from '../config/api';
import { convertNumberToStatus } from '../utils/orderStatusUtils';

const TABS = ['Chưa đánh giá', 'Đã đánh giá'];

const UserReviewsScreen = () => {
  const navigation = useNavigation();
  const [selectedTab, setSelectedTab] = useState(TABS[0]);
  const [userId, setUserId] = useState(null);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [errorOrders, setErrorOrders] = useState(null);
  const [errorReviews, setErrorReviews] = useState(null);

  // Lấy userId từ AsyncStorage
  useEffect(() => {
    const fetchUserId = async () => {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userInfo = JSON.parse(userInfoString);
        setUserId(userInfo._id);
      }
    };
    fetchUserId();
  }, []);

  // Lấy danh sách đơn hàng
  const fetchOrders = useCallback(async () => {
    if (!userId) return;
    setLoadingOrders(true);
    setErrorOrders(null);
    try {
      const response = await fetch(`${API_ENDPOINTS.ORDERS.GET_BY_USER_ID}/${userId}`, {
        headers: API_HEADERS,
      });
      if (!response.ok) throw new Error('Không thể lấy danh sách đơn hàng');
      const data = await response.json();
      
      // Convert status numbers to text for display
      const processedData = data.map(order => ({
        ...order,
        status: convertNumberToStatus(order.status)
      }));
      
      setOrders(processedData);
    } catch (err) {
      setErrorOrders(err.message);
      setOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  }, [userId]);

  // Lấy danh sách đánh giá
  const fetchReviews = useCallback(async () => {
    if (!userId) {
      console.log('[UserReviewsScreen] Không có userId, không gọi API review');
      setReviews([]);
      setErrorReviews('Không tìm thấy userId');
      return;
    }
    setLoadingReviews(true);
    setErrorReviews(null);
    try {
      const url = typeof API_ENDPOINTS.RATINGS.GET_BY_USER === 'function'
        ? API_ENDPOINTS.RATINGS.GET_BY_USER(userId)
        : `${API_ENDPOINTS.RATINGS.GET_BY_USER}/${userId}`;
      console.log('[UserReviewsScreen] Gọi API lấy review:', url);
      console.log('[UserReviewsScreen] Headers:', API_HEADERS);
      const response = await fetch(url, {
        headers: API_HEADERS,
      });
      console.log('[UserReviewsScreen] Response status:', response.status);
      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = '[Không đọc được body lỗi]';
        }
        console.log('[UserReviewsScreen] Response không ok:', errorText);
        throw new Error('Không thể lấy danh sách đánh giá: ' + errorText);
      }
      let data;
      try {
        data = await response.json();
        console.log('[UserReviewsScreen] Dữ liệu trả về:', data);
      } catch (e) {
        console.log('[UserReviewsScreen] Lỗi parse JSON:', e);
        throw new Error('Lỗi parse JSON: ' + e.message);
      }
      setReviews(data);
    } catch (err) {
      console.log('[UserReviewsScreen] Lỗi fetch review:', err);
      setErrorReviews(err.message);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [userId]);

  useEffect(() => {
    if (selectedTab === 'Chưa đánh giá') fetchOrders();
    if (selectedTab === 'Đã đánh giá') fetchReviews();
  }, [selectedTab, fetchOrders, fetchReviews]);

  // Lọc các sản phẩm chưa đánh giá
  const unratedItems = [];
  orders.forEach(order => {
    if (order.orderItems && Array.isArray(order.orderItems)) {
      order.orderItems.forEach(item => {
        if (!item.is_review) {
          unratedItems.push({
            ...item,
            orderId: order._id,
            orderDate: order.createdAt,
            order,
          });
        }
      });
    }
  });

  // Render từng sản phẩm chưa đánh giá
  const renderUnratedItem = ({ item }) => (
    <View style={styles.card}>
      <Image
        source={item.image && item.image.startsWith('/uploads_product/')
          ? { uri: `${API_BASE_URL}${item.image}` }
          : item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))
            ? { uri: item.image }
            : require('../assets/errorimg.webp')
        }
        style={styles.productImage}
        resizeMode="cover"
      />
      <View style={styles.info}>
        <Text style={styles.productName}>{item.name_product || 'Không rõ tên sản phẩm'}</Text>
        <Text style={styles.productDetail}>Ngày mua: {item.orderDate ? new Date(item.orderDate).toLocaleDateString('vi-VN') : ''}</Text>
        <TouchableOpacity
          style={styles.rateButton}
          onPress={() => navigation.navigate('Rating', { order: item.order })}
        >
          <Text style={styles.rateButtonText}>Đánh giá</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render từng đánh giá đã thực hiện
  const renderReviewItem = ({ item }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'column' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
          <Text style={{ color: '#FFD700', fontSize: 16, fontWeight: 'bold', marginRight: 4 }}>{item.review_rate || 0}</Text>
          <Text style={{ color: '#FFD700', fontSize: 16 }}>{'★'.repeat(item.review_rate || 0)}</Text>
        </View>
        <Text style={styles.productDetail}>{item.review_comment || ''}</Text>
        {Array.isArray(item.review_image) && item.review_image.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.reviewImagesRow}>
            {item.review_image.map((img, idx) => (
              <Image
                key={idx}
                source={{ uri: `${API_BASE_URL}${img}` }}
                style={styles.reviewImage}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        )}
        {item.createdAt && (
          <Text style={[styles.productDetail, { fontSize: 12, color: '#aaa', marginTop: 8 }]}> 
            {new Date(item.createdAt).toLocaleDateString('vi-VN')}
          </Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>{'<'} Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá của tôi</Text>
        <View style={{ width: 60 }} />
      </View>
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, selectedTab === tab && styles.activeTab]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {selectedTab === 'Chưa đánh giá' && (
        <View style={{ flex: 1 }}>
          {loadingOrders ? (
            <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#000" />
          ) : errorOrders ? (
            <Text style={styles.errorText}>{errorOrders}</Text>
          ) : unratedItems.length === 0 ? (
            <Text style={styles.emptyText}>Bạn đã đánh giá hết các sản phẩm.</Text>
          ) : (
            <FlatList
              data={unratedItems}
              keyExtractor={(item, idx) => item._id + '_' + idx}
              renderItem={renderUnratedItem}
              contentContainerStyle={{ padding: 16 }}
            />
          )}
        </View>
      )}
      {selectedTab === 'Đã đánh giá' && (
        <View style={{ flex: 1 }}>
          {loadingReviews ? (
            <ActivityIndicator style={{ marginTop: 32 }} size="large" color="#000" />
          ) : errorReviews ? (
            <Text style={styles.errorText}>{errorReviews}</Text>
          ) : reviews.length === 0 ? (
            <Text style={styles.emptyText}>Bạn chưa có đánh giá nào.</Text>
          ) : (
            <FlatList
              data={reviews}
              keyExtractor={(item, idx) => item._id + '_' + idx}
              renderItem={renderReviewItem}
              contentContainerStyle={{ padding: 16 }}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    backgroundColor: '#fff',
  },
  backText: {
    fontSize: 15,
    color: '#007AFF',
    width: 60,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    backgroundColor: '#F9F9F9',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 15,
    color: '#888',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#000',
    fontWeight: 'bold',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#999',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  productImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F9F9F9',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 2,
  },
  productDetail: {
    fontSize: 13,
    color: '#888',
    marginBottom: 2,
  },
  rateButton: {
    marginTop: 8,
    backgroundColor: '#000',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
  },
  rateButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 32,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  reviewImagesRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 2,
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 8,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
});

export default UserReviewsScreen; 