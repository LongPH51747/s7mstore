import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Image, StyleSheet, ScrollView, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { API_ENDPOINTS, API_HEADERS, API_BASE_URL } from '../config/api';
import { convertNumberToStatus } from '../utils/orderStatusUtils';

const { width, height } = Dimensions.get('window');

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
      console.log('[UserReviewsScreen] Reviews data received:', JSON.stringify(data, null, 2));
      setReviews(data);
    } catch (err) {
      console.error('[UserReviewsScreen] Error fetching reviews:', err);
      setErrorReviews(err.message);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchOrders();
      fetchReviews();
    }
  }, [userId, fetchOrders, fetchReviews]);

  // Lọc các sản phẩm chưa đánh giá
  const unratedItems = orders
    .filter(order => order.status === 'Giao thành công')
    .flatMap(order => 
      order.orderItems
        .filter(item => !item.is_review)
        .map(item => ({
          ...item,
          orderId: order._id,
          orderDate: order.createdAt,
          orderStatus: order.status,
          totalAmount: order.total_amount
        }))
    );

  const renderUnratedItem = ({ item }) => (
    <View style={styles.orderCard}>
      {/* Order Header */}
      <View style={styles.orderHeader}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderId}>#{item.orderId.slice(-8)}</Text>
          <Text style={styles.orderDate}>
            {new Date(item.orderDate).toLocaleDateString('vi-VN')}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.orderStatus}</Text>
        </View>
      </View>

      {/* Product Card */}
      <View style={styles.productCard}>
        <Image
          source={(() => {
            if (item.image && item.image.startsWith('/uploads_product/')) {
              return { uri: `${API_BASE_URL}${item.image}` };
            }
            if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))) {
              return { uri: item.image };
            }
            return require('../assets/errorimg.webp');
          })()}
          style={styles.productImage}
          resizeMode="cover"
        />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name_product || 'Không rõ tên sản phẩm'}
          </Text>
          <View style={styles.productMeta}>
            <Text style={styles.productQuantity}>
              Số lượng: {item.quantity}
            </Text>
            <Text style={styles.productPrice}>
              {item.unit_price_item?.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </View>

      {/* Action Button */}
      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={() => navigation.navigate('RatingScreen', { 
            orderItem: item,
            orderId: item.orderId 
          })}
        >
          <Text style={styles.buttonPrimaryText}>Đánh giá ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderReviewItem = ({ item }) => {
    return (
      <View style={styles.reviewCard}>
        {/* Review Header */}
        <View style={styles.reviewHeader}>
          <View style={styles.reviewInfo}>
            <Text style={styles.reviewDate}>
              {new Date(item.createdAt).toLocaleDateString('vi-VN')}
            </Text>
            <View style={styles.ratingContainer}>
              <Text style={styles.ratingText}>
                {item.review_rate}/5
              </Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Icon
                    key={star}
                    name={star <= item.review_rate ? "star" : "star-border"}
                    size={16}
                    color={star <= item.review_rate ? "#F59E0B" : "#CBD5E1"}
                    style={styles.starIcon}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productCard}>
          <Image
            source={(() => {
              // Get product image from review_product_id
              const productImage = item.review_product_id?.product_image;
              
              if (productImage && productImage.startsWith('/uploads_product/')) {
                return { uri: `${API_BASE_URL}${productImage}` };
              }
              if (productImage && (productImage.startsWith('http://') || productImage.startsWith('https://') || productImage.startsWith('data:image'))) {
                return { uri: productImage };
              }
              return require('../assets/errorimg.webp');
            })()}
            style={styles.productImage}
            resizeMode="cover"
          />
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.review_product_id?.product_name || 'Không rõ tên sản phẩm'}
            </Text>
            <View style={styles.productMeta}>
              <Text style={styles.productQuantity}>
                Số lượng: 1
              </Text>
              <Text style={styles.productPrice}>
                Đã mua
              </Text>
            </View>
          </View>
        </View>

        {/* Review Comment */}
        {item.review_comment && (
          <View style={styles.commentContainer}>
            <Text style={styles.commentText}>
              {item.review_comment}
            </Text>
          </View>
        )}

        {/* Admin Reply */}
        {item.admin_reply && item.admin_reply.content && (
          <View style={styles.adminReplyContainer}>
            <View style={styles.adminReplyHeader}>
              <Icon name="admin-panel-settings" size={16} color="#6366F1" />
              <Text style={styles.adminReplyLabel}>Phản hồi từ shop</Text>
            </View>
            <Text style={styles.adminReplyText}>
              {item.admin_reply.content}
            </Text>
            {item.admin_reply.createdAt && (
              <Text style={styles.adminReplyDate}>
                {new Date(item.admin_reply.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            )}
          </View>
        )}

        {/* Review Images */}
        {item.review_image && item.review_image.length > 0 && (
          <View style={styles.reviewImagesRow}>
            {item.review_image.map((image, index) => (
              <Image
                key={index}
                source={{ uri: `${API_BASE_URL}${image}` }}
                style={styles.reviewImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="star-outline" size={64} color="#CBD5E1" />
      <Text style={styles.emptyStateTitle}>
        {selectedTab === 'Chưa đánh giá' 
          ? 'Bạn đã đánh giá hết các sản phẩm' 
          : 'Bạn chưa có đánh giá nào'
        }
      </Text>
      <Text style={styles.emptyStateSubtitle}>
        {selectedTab === 'Chưa đánh giá' 
          ? 'Hãy mua thêm sản phẩm để có thể đánh giá' 
          : 'Hãy đánh giá sản phẩm để chia sẻ trải nghiệm của bạn'
        }
      </Text>
    </View>
  );

  const renderErrorState = (error) => (
    <View style={styles.emptyState}>
      <Icon name="error-outline" size={64} color="#EF4444" />
      <Text style={styles.emptyStateTitle}>Có lỗi xảy ra</Text>
      <Text style={styles.emptyStateSubtitle}>{error}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#6366F1" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Đánh giá của tôi</Text>
            <Text style={styles.headerSubtitle}>Quản lý đánh giá sản phẩm</Text>
          </View>
          <View style={styles.headerRight} />
        </View>
        
        {/* Modern Tab Navigation */}
        <View style={styles.tabContainer}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
              onPress={() => setSelectedTab(tab)}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {selectedTab === 'Chưa đánh giá' && (
        <View style={styles.content}>
          {loadingOrders ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Đang tải danh sách sản phẩm...</Text>
                <Text style={styles.loadingSubtext}>Vui lòng chờ trong giây lát</Text>
              </View>
            </View>
          ) : errorOrders ? (
            renderErrorState(errorOrders)
          ) : unratedItems.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={unratedItems}
              keyExtractor={(item, idx) => item._id + '_' + idx}
              renderItem={renderUnratedItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
      
      {selectedTab === 'Đã đánh giá' && (
        <View style={styles.content}>
          {loadingReviews ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingCard}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Đang tải danh sách đánh giá...</Text>
                <Text style={styles.loadingSubtext}>Vui lòng chờ trong giây lát</Text>
              </View>
            </View>
          ) : errorReviews ? (
            renderErrorState(errorReviews)
          ) : reviews.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={reviews}
              keyExtractor={(item, idx) => item._id + '_' + idx}
              renderItem={renderReviewItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#6366F1',
    paddingTop: StatusBar.currentHeight,
    paddingBottom: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '400',
  },
  headerRight: {
    width: 40,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTabButton: {
    backgroundColor: 'white',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  activeTabText: {
    color: '#6366F1',
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  
  // Order Card Styles (similar to OrderScreen)
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    lineHeight: 20,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQuantity: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  buttonPrimary: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontFamily: 'Nunito-Black',
    fontSize: 14,
    fontWeight: '600',
  },

  // Review Card Styles
  reviewCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewInfo: {
    flex: 1,
  },
  reviewDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F59E0B',
    marginRight: 12,
  },
  starsContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginLeft: -2,
  },
  commentContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  commentText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  reviewImagesRow: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  reviewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#F1F5F9',
  },
  
  // Admin Reply Styles
  adminReplyContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  adminReplyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  adminReplyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
    marginLeft: 8,
  },
  adminReplyText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 8,
  },
  adminReplyDate: {
    fontSize: 12,
    color: '#64748B',
    fontStyle: 'italic',
    alignSelf: 'flex-end',
  },
  
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginTop: 20,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default UserReviewsScreen; 