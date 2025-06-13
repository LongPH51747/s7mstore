import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';

// const orders = [
//   {
//     id: "order123456789",
//     userId: "68386c1824d040c9bd6bd868"
//     orderItems: [
//       {
//         id_variant: "variant001",
//         name_product: "Áo thun nam cổ tròn",
//         color: "Đen",
//         size: "L",
//         quantity: 2,
//         unit_price_item: 199000,
//         total_price_item: 398000,
//         image: "https://example.com/images/product-variant-1.png"
//       },
//       {
//         id_variant: "variant002",
//         name_product: "Quần short thể thao",
//         color: "Xám",
//         size: "M",
//         quantity: 1,
//         unit_price_item: 149000,
//         total_price_item: 149000,
//         image: "https://example.com/images/product-variant-2.png"
//       }
//     ],
//     shipping: {
//       address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
//       phone: "0987654321",
//       method: "Giao hàng tiết kiệm"
//     },
//     status: "Chờ xác nhận",
//     sub_total_amount: 547000,
//     total_amount: 577000,
//     createdAt: "2025-06-06T12:30:00Z",
//     updatedAt: "2025-06-06T12:30:00Z"
//   },
//   {
//     id: "order123456786",
//     userId: "68386c1824d040c9bd6bd868",
//     orderItems: [
//       {
//         id_variant: "variant001",
//         name_product: "Áo thun nam cổ tròn",
//         color: "Đen",
//         size: "L",
//         quantity: 2,
//         unit_price_item: 199000,
//         total_price_item: 398000,
//         image: "https://example.com/images/product-variant-1.png"
//       },
//       {
//         id_variant: "variant002",
//         name_product: "Quần short thể thao",
//         color: "Xám",
//         size: "M",
//         quantity: 1,
//         unit_price_item: 149000,
//         total_price_item: 149000,
//         image: "https://example.com/images/product-variant-2.png"
//       }
//     ],
//     shipping: {
//       address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
//       phone: "0987654321",
//       method: "Giao hàng tiết kiệm"
//     },
//     status: "Chờ xác nhận",
//     sub_total_amount: 547000,
//     total_amount: 577000,
//     createdAt: "2025-06-06T12:30:00Z",
//     updatedAt: "2025-06-06T12:30:00Z"
//   },
//   {
//     id: "order123486789",
//     userId: "68386c1824d040c9bd6bd868",
//     orderItems: [
//       {
//         id_variant: "variant001",
//         name_product: "Áo thun nam cổ tròn",
//         color: "Đen",
//         size: "L",
//         quantity: 2,
//         unit_price_item: 199000,
//         total_price_item: 398000,
//         image: "https://example.com/images/product-variant-1.png"
//       },
//       {
//         id_variant: "variant002",
//         name_product: "Quần short thể thao",
//         color: "Xám",
//         size: "M",
//         quantity: 1,
//         unit_price_item: 149000,
//         total_price_item: 149000,
//         image: "https://example.com/images/product-variant-2.png"
//       }
//     ],
//     shipping: {
//       address: "123 Nguyễn Trãi, Thanh Xuân, Hà Nội",
//       phone: "0987654321",
//       method: "Giao hàng tiết kiệm"
//     },
//     status: "Chờ xác nhận",
//     sub_total_amount: 547000,
//     total_amount: 577000,
//     createdAt: "2025-06-06T12:30:00Z",
//     updatedAt: "2025-06-06T12:30:00Z"
//   }
// ]

const OrdersScreen = () => {
  const navigation = useNavigation();

  const [idUser, setIdUser] = useState(null);
  const [selectedTab, setSelectedTab] = useState('Đang xử lý');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrders, setExpandedOrders] = useState({});

  const tabs = ['Đang xử lý', 'Chờ lấy hàng', 'Chờ giao hàng', 'Đã giao', 'Trả hàng'];

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

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to fetch orders: ${response.status} - ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        setOrders(data);
        console.log('Fetched orders:', data);
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

  const filteredOrders = orders ? orders.filter(o => o.order_status === selectedTab) : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn hàng của bạn</Text>

      <View style={styles.tabs}>
        {tabs.map((tab, index) => (
          <TouchableOpacity key={index} onPress={() => setSelectedTab(tab)} style={styles.tabItem}>
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTab]}>{tab}</Text>
          </TouchableOpacity>
        ))}
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
              const orderItems = order.order_items || [];
              const isExpanded = expandedOrders[order._id];

              return (
                <View key={order._id} style={styles.cardWrapper}>
                  <Text style={styles.status}>{order.order_status}</Text>
                  {orderItems.length > 0 && (
                    <View style={styles.card}>
                      <Image
                        source={(() => {
                          const imageUrl = orderItems[0].product_variant?.variant_image_url ||
                                           orderItems[0].product_variant?.variant_image_base64 ||
                                           orderItems[0].product?.product_image;
                          if (typeof imageUrl === 'string' &&
                            (imageUrl.startsWith('http://') ||
                              imageUrl.startsWith('https://') ||
                              imageUrl.startsWith('data:image'))
                          ) {
                            return { uri: imageUrl };
                          }
                          return require('../assets/LogoGG.png');
                        })()}
                        style={styles.productImageInOrder}
                        resizeMode="cover"
                        onError={(e) => {
                          console.error('Order item image loading error:', e.nativeEvent.error, 'for URL:', orderItems[0].product_variant?.variant_image_url || orderItems[0].product_variant?.variant_image_base64 || orderItems[0].product?.product_image);
                          e.target.setNativeProps({
                            source: require('../assets/LogoGG.png')
                          });
                        }}
                      />
                      <View style={styles.productInfoInOrder}>
                        <Text style={styles.productTitle} numberOfLines={2}>{orderItems[0].product?.product_name}</Text>
                        <Text style={styles.quantity}>x{orderItems[0].quantity}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.price}>{orderItems[0].unit_price_item?.toLocaleString('vi-VN')}đ</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {isExpanded && orderItems.slice(1).map((orderItem, index) => (
                    <View key={orderItem._id || `item-${index}`} style={styles.card}>
                      <Image
                        source={(() => {
                          const imageUrl = orderItem.product_variant?.variant_image_url ||
                                           orderItem.product_variant?.variant_image_base64 ||
                                           orderItem.product?.product_image;
                          if (typeof imageUrl === 'string' &&
                            (imageUrl.startsWith('http://') ||
                              imageUrl.startsWith('https://') ||
                              imageUrl.startsWith('data:image'))
                          ) {
                            return { uri: imageUrl };
                          }
                          return require('../assets/LogoGG.png');
                        })()}
                        style={styles.productImageInOrder}
                        resizeMode="cover"
                        onError={(e) => {
                          console.error('Order item image loading error:', e.nativeEvent.error, 'for URL:', orderItem.product_variant?.variant_image_url || orderItem.product_variant?.variant_image_base64 || orderItem.product?.product_image);
                          e.target.setNativeProps({
                            source: require('../assets/LogoGG.png')
                          });
                        }}
                      />
                      <View style={styles.productInfoInOrder}>
                        <Text style={styles.productTitle} numberOfLines={2}>{orderItem.product?.product_name}</Text>
                        <Text style={styles.quantity}>x{orderItem.quantity}</Text>
                        <View style={styles.priceRow}>
                          <Text style={styles.price}>{orderItem.unit_price_item?.toLocaleString('vi-VN')}đ</Text>
                        </View>
                      </View>
                    </View>
                  ))}

                  {orderItems.length > 1 && ( // Only show toggle if there's more than 1 item
                    <TouchableOpacity onPress={() => toggleExpanded(order._id)}>
                      <Text style={styles.toggleBtn}>
                        {isExpanded ? 'Ẩn bớt ▲' : 'Hiện thêm ▼'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <Text style={styles.total}>
                    Tổng số tiền ({orderItems.length} sản phẩm): {order.total_amount?.toLocaleString('vi-VN')}đ
                  </Text>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.button}
                      onPress={() => navigation.navigate('OrderDetail', { order: order })} // Pass the whole order object
                    >
                      <Text style={styles.buttonText}>Xem chi tiết đơn hàng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.button}>
                      <Text style={styles.buttonText}>Mua lại</Text>
                    </TouchableOpacity>
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
    paddingTop: 40,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    color: 'black'
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tabItem: { // Added for better touchable area
    paddingVertical: 5,
    paddingHorizontal: 10,
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
