import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';

const OrdersScreen = () => {
  const navigation = useNavigation();

  const [idUser, setIdUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState('Chờ xác nhận');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});

  const tabs = ['Chờ xác nhận', 'Đã xác nhận', 'Chờ giao hàng', 'Giao thành công', 'Trả hàng', 'Đã hủy'];

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
        
        // Debug logs for image data
        data.forEach(order => {
          console.log('Order ID:', order._id);
          order.orderItems.forEach((item, index) => {
            console.log(`Item ${index + 1} image data:`, {
              hasImage: !!item.image,
              imageType: item.image ? item.image.substring(0, 50) + '...' : 'no image',
              imageLength: item.image ? item.image.length : 0
            });
          });
        });

        setOrders(data);
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

  const filteredOrders = orders ? orders.filter(o => o.status === selectedTab) : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Image 
            source={require('../assets/back.png')} 
            style={styles.headerIcon} 
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của bạn</Text>
        <View style={{ width: 24, height: 24 }} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity key={index} onPress={() => setSelectedTab(tab)} style={styles.tabItem}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTab]} numberOfLines={1}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <ActivityIndicator size={"large"} color={'black'} />
          <Text>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView}>
          {filteredOrders.length === 0 ? (
            <Text style={styles.noOrdersText}>Không có đơn hàng nào trong trạng thái này.</Text>
          ) : (
            filteredOrders.map((order) => {
              const isExpanded = expandedOrders[order._id];

              return (
                <View key={order._id} style={styles.cardWrapper}>
                  <View style={styles.statusRow}>
                    <Text style={[styles.statusBadge, getStatusBadgeStyle(order.status)]}>{order.status}</Text>
                  </View>
                  {order.orderItems.length > 0 && (
                    <View style={styles.card}>
                      <Image
                        source={(() => {
                          const item = order.orderItems[0];
                          console.log('OrderScreen - item.image:', item.image);
                          if (item.image && item.image.startsWith('/uploads_product/')) {
                            const src = { uri: `${API_BASE_URL}${item.image}` };
                            console.log('OrderScreen - image source:', src);
                            return src;
                          }
                          if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))) {
                            const src = { uri: item.image };
                            console.log('OrderScreen - image source:', src);
                            return src;
                          }
                          console.log('OrderScreen - image source: default');
                          return require('../assets/LogoGG.png');
                        })()}
                        style={styles.productImageInOrder}
                        resizeMode="cover"
                      />
                      <View style={styles.productInfoInOrder}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {order.orderItems[0].name_product || 'Không rõ tên sản phẩm'}
                        </Text>
                        <Text style={styles.quantity}>x{order.orderItems[0].quantity}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.price}>{order.orderItems[0].unit_price_item?.toLocaleString('vi-VN')}đ</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {isExpanded && order.orderItems.slice(1).map((orderItem, index) => (
                    <View key={orderItem.id_variant || `item-${index}`} style={styles.card}>
                      <Image
                        source={(() => {
                          console.log('OrderScreen - item.image:', orderItem.image);
                          if (orderItem.image && orderItem.image.startsWith('/uploads_product/')) {
                            const src = { uri: `${API_BASE_URL}${orderItem.image}` };
                            console.log('OrderScreen - image source:', src);
                            return src;
                          }
                          if (orderItem.image && (orderItem.image.startsWith('http://') || orderItem.image.startsWith('https://') || orderItem.image.startsWith('data:image'))) {
                            const src = { uri: orderItem.image };
                            console.log('OrderScreen - image source:', src);
                            return src;
                          }
                          console.log('OrderScreen - image source: default');
                          return require('../assets/LogoGG.png');
                        })()}
                        style={styles.productImageInOrder}
                        resizeMode="cover"
                      />
                      <View style={styles.productInfoInOrder}>
                        <Text style={styles.productTitle} numberOfLines={2}>
                          {orderItem.name_product || 'Không rõ tên sản phẩm'}
                        </Text>
                        <Text style={styles.quantity}>x{orderItem.quantity}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.price}>{orderItem.unit_price_item?.toLocaleString('vi-VN')}đ</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {order.orderItems.length > 1 && (
                    <TouchableOpacity onPress={() => toggleExpanded(order._id)}>
                      <Text style={styles.toggleBtn}>
                        {isExpanded ? 'Ẩn bớt ▲' : 'Hiện thêm ▼'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tổng ({order.orderItems.length} sản phẩm):</Text>
                    <Text style={styles.totalValue}>{order.total_amount?.toLocaleString('vi-VN')}đ</Text>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.buttonPrimary}
                      onPress={() => navigation.navigate('OrderDetail', { order: order, onOrderUpdate: getOrders })}
                    >
                      <Text style={styles.buttonPrimaryText}>Xem chi tiết</Text>
                    </TouchableOpacity>
                    {order.status === 'Giao thành công' && (
                      <>
                        <TouchableOpacity style={styles.buttonSecondary} onPress={() => navigation.navigate('Checkout', { cartItems: order.orderItems })}>
                          <Text style={styles.buttonSecondaryText}>Mua lại</Text>
                        </TouchableOpacity>
                      </>
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
      return { backgroundColor: '#E0E0E0', color: '#222' };
    case 'Đã xác nhận':
      return { backgroundColor: '#BDBDBD', color: '#222' };
    case 'Chờ giao hàng':
      return { backgroundColor: '#9E9E9E', color: '#fff' };
    case 'Giao thành công':
      return { backgroundColor: '#616161', color: '#fff' };
    case 'Trả hàng':
      return { backgroundColor: '#757575', color: '#fff' };
    case 'Đã hủy':
      return { backgroundColor: '#424242', color: '#fff' };
    default:
      return { backgroundColor: '#BDBDBD', color: '#222' };
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
  },
  headerIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  tabsContainer: {
    height: 40,
    marginBottom: 12,
    position: 'relative',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 5,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  activeTab: {
    color: '#000',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  cardWrapper: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 5,
    margin: 5,
    elevation: 1,
    shadowColor: '#999',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 'bold',
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FEFEFE',
    padding: 5,
    marginBottom: 2,
    elevation: 1,
    shadowColor: '#999',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  productImageInOrder: {
    width: 54,
    height: 54,
    borderRadius: 8,
    marginRight: 6,
    backgroundColor: '#fff',
  },
  productInfoInOrder: {
    flex: 1,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 0,
  },
  quantity: {
    fontSize: 12,
    color: '#888',
    marginBottom: 0,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 0,
  },
  price: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#222',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 1,
  },
  totalLabel: {
    fontSize: 13,
    color: '#444',
    fontWeight: '500',
  },
  totalValue: {
    fontSize: 14,
    color: '#000',
    fontWeight: 'bold',
  },
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
    fontWeight: 'bold',
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
  toggleBtn: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  noOrdersText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
});

export default OrdersScreen;
