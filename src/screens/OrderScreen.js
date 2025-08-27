import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert, Dimensions } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import { convertNumberToStatus, getStatusNumbers } from '../utils/orderStatusUtils';

const { width, height } = Dimensions.get('window');

const OrdersScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [idUser, setIdUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState('Chờ xác nhận');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});

  const tabs = ['Chờ xác nhận', 'Đã xác nhận', 'Chờ giao hàng', 'Giao thành công', 'Trả hàng', 'Đã hủy'];

  useEffect(() => {
        // Cập nhật tab khi màn hình được focus hoặc khi params thay đổi
        const initialTab = route.params?.selectedTab || 'Chờ xác nhận';
        setSelectedTab(initialTab);
        console.log(`Initial tab set to: ${initialTab}`);
    }, [route.params]);

  const getUserInfo = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString !== null) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo._id) {
          setIdUser(userInfo._id);
          console.log('User ID from AsyncStorage on focus (MongoDB _id) in OrdersScreen:', userInfo._id);
        } else {
          console.log('userInfo found but _id is missing on focus in OrdersScreen:', userInfo);
          Alert.alert('Lỗi', 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
          navigation.replace('Login');
        }
      } else {
        console.log('No userInfo found in AsyncStorage on focus in OrdersScreen.');
        Alert.alert('Lỗi', 'Chưa đăng nhập. Vui lòng đăng nhập để xem đơn hàng.');
        navigation.replace('Login');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin người dùng từ AsyncStorage on focus in OrdersScreen:', error);
      Alert.alert('Lỗi', 'Không thể lấy thông tin người dùng. Vui lòng thử lại.');
    }
  }, [navigation]);

  useEffect(() => {
    getUserInfo();

    const unsubscribe = navigation.addListener('focus', () => {
      getUserInfo();
    });

    return unsubscribe;
  }, [getUserInfo, navigation]);

  const getOrders = useCallback(async () => {
    if (idUser) {
      setLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

        const response = await fetch(`${API_ENDPOINTS.ORDERS.GET_BY_USER_ID}/${idUser}`, {
          headers: API_HEADERS,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        console.log(`${API_ENDPOINTS.ORDERS.GET_BY_USER_ID}`)

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch orders: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Convert status numbers to text for display
        const processedData = data.map(order => ({
          ...order,
          status: convertNumberToStatus(order.status)
        }));
        
        // Debug logs for image data
        processedData.forEach(order => {
          console.log('Order ID:', order._id);
          order.orderItems.forEach((item, index) => {
            console.log(`Item ${index + 1} image data:`, {
              hasImage: !!item.image,
              imageType: item.image ? item.image.substring(0, 50) + '...' : 'no image',
              imageLength: item.image ? item.image.length : 0
            });
          });
        });

        setOrders(processedData);
      } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn hàng:', error);
        if (error.name === 'AbortError') {
          Alert.alert('Lỗi', 'Thời gian yêu cầu danh sách đơn hàng đã hết. Vui lòng thử lại.');
        } else {
          Alert.alert('Lỗi', `Không thể tải danh sách đơn hàng: ${error.message}`);
        }
        setOrders([]); // Clear orders on error
      } finally {
        setLoading(false);
      }
    } else {
      console.log("User ID not available, cannot fetch orders.");
      setOrders([]); // Clear orders if user ID is not available
      setLoading(false);
    }
  }, [idUser]);

  useEffect(() => {
    getOrders();
  }, [getOrders]);

  const toggleExpanded = (orderId) => {
    setExpandedOrders(prevState => ({
      ...prevState,
      [orderId]: !prevState[orderId]
    }));
  };

  const filteredOrders = orders ? orders.filter(o => {
    // Nếu status là số, chuyển đổi sang text trước khi so sánh
    const orderStatus = typeof o.status === 'number' ? convertNumberToStatus(o.status) : o.status;
    return orderStatus === selectedTab;
  }) : [];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Chờ xác nhận':
        return '⏳';
      case 'Đã xác nhận':
        return '✅';
      case 'Chờ giao hàng':
        return '🚚';
      case 'Giao thành công':
        return '🎉';
      case 'Trả hàng':
        return '↩️';
      case 'Đã hủy':
        return '❌';
      default:
        return '📦';
    }
  };

  return (
    <View style={styles.container}>
      {/* Modern Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/back.png')} 
            style={styles.backIcon} 
          />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Đơn hàng của bạn</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerActionButton}>
            <Text style={styles.headerActionText}>📋</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={() => setSelectedTab(tab)} 
              style={[
                styles.tabItem, 
                selectedTab === tab && styles.activeTabItem
              ]}
            >
              <Text style={[
                styles.tabText, 
                selectedTab === tab && styles.activeTabText
              ]} numberOfLines={1}>
                {getStatusIcon(tab)} {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loadingText}>Đang tải đơn hàng...</Text>
            <Text style={styles.loadingSubtext}>Vui lòng chờ trong giây lát</Text>
          </View>
        </View>
      ) : (
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {filteredOrders.length === 0 ? (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateIcon}>📦</Text>
              <Text style={styles.emptyStateTitle}>Không có đơn hàng nào</Text>
              <Text style={styles.emptyStateSubtitle}>
                Bạn chưa có đơn hàng nào trong trạng thái "{selectedTab}"
              </Text>
            </View>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrders[order._id];

              return (
                <View key={order._id} style={styles.orderCard}>
                  {/* Order Header */}
                  <View style={styles.orderHeader}>
                    <View style={styles.orderInfo}>
                      <Text style={styles.orderId}>#{order._id.slice(-8)}</Text>
                      <Text style={styles.orderDate}>
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>
                    <View style={[
                      styles.statusBadge, 
                      getStatusBadgeStyle(order.status)
                    ]}>
                      <Text style={styles.statusText}>{order.status}</Text>
                    </View>
                  </View>

                  {/* Products List */}
                  <View style={styles.productsContainer}>
                    {order.orderItems.length > 0 && (
                      <View style={styles.productCard}>
                        <Image
                          source={(() => {
                            const item = order.orderItems[0];
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
                            {order.orderItems[0].name_product || 'Không rõ tên sản phẩm'}
                          </Text>
                          <View style={styles.productMeta}>
                            <Text style={styles.productQuantity}>
                              Số lượng: {order.orderItems[0].quantity}
                            </Text>
                            <Text style={styles.productPrice}>
                              {order.orderItems[0].unit_price_item?.toLocaleString('vi-VN')}đ
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {/* Additional Products */}
                    {isExpanded && order.orderItems.slice(1).map((orderItem, index) => (
                      <View key={orderItem.id_variant || `item-${index}`} style={styles.productCard}>
                        <Image
                          source={(() => {
                            if (orderItem.image && orderItem.image.startsWith('/uploads_product/')) {
                              return { uri: `${API_BASE_URL}${orderItem.image}` };
                            }
                            if (orderItem.image && (orderItem.image.startsWith('http://') || orderItem.image.startsWith('https://') || orderItem.image.startsWith('data:image'))) {
                              return { uri: orderItem.image };
                            }
                            return require('../assets/errorimg.webp');
                          })()}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                        <View style={styles.productInfo}>
                          <Text style={styles.productName} numberOfLines={2}>
                            {orderItem.name_product || 'Không rõ tên sản phẩm'}
                          </Text>
                          <View style={styles.productMeta}>
                            <Text style={styles.productQuantity}>
                              Số lượng: {orderItem.quantity}
                            </Text>
                            <Text style={styles.productPrice}>
                              {orderItem.unit_price_item?.toLocaleString('vi-VN')}đ
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}

                    {/* Expand/Collapse Button */}
                    {order.orderItems.length > 1 && (
                      <TouchableOpacity 
                        style={styles.expandButton}
                        onPress={() => toggleExpanded(order._id)}
                      >
                        <Text style={styles.expandButtonText}>
                          {isExpanded ? 'Ẩn bớt ▲' : `Hiện thêm ${order.orderItems.length - 1} sản phẩm ▼`}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Order Summary */}
                  <View style={styles.orderSummary}>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Tổng cộng ({order.orderItems.length} sản phẩm):</Text>
                      <Text style={styles.summaryValue}>
                        {order.total_amount?.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.buttonPrimary}
                      onPress={() => navigation.navigate('OrderDetailScreen', { order: order })}
                    >
                      <Text style={styles.buttonPrimaryText}>Xem chi tiết</Text>
                    </TouchableOpacity>
                    
                    {order.status === 'Giao thành công' && order.orderItems.some(item => !item.is_review) && (
                      <TouchableOpacity 
                        style={styles.buttonSecondary} 
                        onPress={() => navigation.navigate('Rating', { order })}
                      >
                        <Text style={styles.buttonSecondaryText}>Đánh giá</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
};

function getStatusBadgeStyle(status) {
  switch (status) {
    case 'Chờ xác nhận':
      return { backgroundColor: '#FEF3C7', color: '#92400E' };
    case 'Đã xác nhận':
      return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
    case 'Chờ giao hàng':
      return { backgroundColor: '#FCE7F3', color: '#BE185D' };
    case 'Giao thành công':
      return { backgroundColor: '#D1FAE5', color: '#065F46' };
    case 'Trả hàng':
      return { backgroundColor: '#FEE2E2', color: '#991B1B' };
    case 'Đã hủy':
      return { backgroundColor: '#F3F4F6', color: '#374151' };
    default:
      return { backgroundColor: '#E5E7EB', color: '#374151' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    width: 20,
    height: 20,
    tintColor: '#475569',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 2,
  },
  headerRight: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActionText: {
    fontSize: 18,
  },

  // Tabs Styles
  tabsContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTabItem: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // Loading Styles
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loadingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Nunito-Medium',
  },

  // Scroll Styles
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 12,
  },

  // Empty State Styles
  emptyStateContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
  },

  // Order Card Styles
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Products Styles
  productsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    marginBottom: 4,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
    lineHeight: 16,
  },
  productMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productQuantity: {
    fontSize: 11,
    color: '#64748B',
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },

  // Expand Button
  expandButton: {
    alignItems: 'center',
    paddingVertical: 6,
    marginTop: 2,
  },
  expandButtonText: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '500',
  },

  // Order Summary
  orderSummary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  // Action Buttons
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 3,
  },
  buttonPrimary: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 4,
  },
  buttonPrimaryText: {
    color: '#fff',
    fontFamily:'Nunito-Black',
    fontSize: 13,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#888',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginLeft: 4,
  },
  buttonSecondaryText: {
    color: '#222',
    fontWeight: 'bold',
    fontSize: 13,
  },
});

export default OrdersScreen;
