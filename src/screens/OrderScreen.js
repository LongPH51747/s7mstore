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

  const tabs = ['Chờ xác nhận', 'Chờ lấy hàng', 'Chờ giao hàng', 'Đã giao', 'Trả hàng', 'Đã hủy'];

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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image 
            source={require('../assets/back.png')} 
            style={styles.backIcon}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đơn hàng của bạn</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.tabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {tabs.map((tab, index) => (
            <TouchableOpacity key={index} onPress={() => setSelectedTab(tab)} style={styles.tabItem}>
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTab]}>{tab}</Text>
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
                  <Text style={styles.status}>{order.status}</Text>
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
                        onError={(e) => {
                          console.log('Image loading error:', {
                            error: e.nativeEvent.error,
                            item: order.orderItems[0].name_product
                          });
                          e.target.setNativeProps({
                            source: require('../assets/LogoGG.png')
                          });
                        }}
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
                        onError={(e) => {
                          e.target.setNativeProps({
                            source: require('../assets/LogoGG.png')
                          });
                        }}
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

                  <Text style={styles.total}>
                    Tổng số tiền ({order.orderItems.length} sản phẩm): {order.total_amount?.toLocaleString('vi-VN')}đ
                  </Text>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => navigation.navigate('OrderDetail', { order: order })}
                    >
                      <Text style={styles.buttonText}>Xem chi tiết đơn hàng</Text>
                    </TouchableOpacity>
                    {order.status === 'Đã giao' && (
                      <TouchableOpacity style={styles.button}>
                        <Text style={styles.buttonText}>Mua lại</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
  headerRight: {
    width: 40,
  },
  tabsContainer: {
    height: 40,
    marginBottom: 12,
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginRight: 16,
  },
  tabText: {
    fontSize: 14,
    color: 'black',
  },
  activeTab: {
    color: 'red',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  cardWrapper: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  productImageInOrder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  productInfoInOrder: {
    flex: 1,
  },
  status: {
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'black'
  },
  quantity: {
    fontSize: 14,
    marginTop: 4,
    color: 'black'
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  oldPrice: {
    textDecorationLine: 'line-through',
    color: '#888',
    marginRight: 8,
  },
  price: {
    fontWeight: 'bold',
    fontSize: 15,
    color: '#2ecc71',
  },
  total: {
    fontSize: 14,
    marginVertical: 6,
    fontWeight: 'bold',
    textAlign: 'right',
    color: '#000',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 10,
  },
  button: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#000',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  toggleBtn: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  noOrdersText: {
    textAlign: 'center',
    marginTop: 50,
    fontSize: 16,
    color: '#888',
  },
});

export default OrdersScreen;
