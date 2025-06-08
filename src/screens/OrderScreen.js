import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';

// const orders = [
//   {
//     id: "order123456789",
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
  const url = "https://0185-2405-4802-21f-72d0-c451-84e5-9b5b-457a.ngrok-free.app/api/order/getByUserId/";
  const userId = '68386c1824d040c9bd6bd868';

  const [selectedTab, setSelectedTab] = useState('Đang xử lý');
  const [order, setOrder] = useState();
  const [oderItem, setOrderItem] = useState();
  const [expanded, setExpanded] = useState(false); //sự kiện ẩn hiện orderitem

  const tabs = ['Đang xử lý', 'Chờ lấy hàng', 'Chờ giao hàng', 'Đã giao', 'Trả hàng'];

  //Lay danh sach don hang
  useEffect(() => {
    const getOrder = async () => {
      const rs = await fetch(url + userId);
      const data = await rs.json();
      setOrder(data);
    }
    getOrder()
  }, []);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  }

  //Lay danh sach item trong tung don hang
  // useEffect(()=>{
  //   const getOrderItem
  // })

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Đơn hàng của bạn</Text>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab, index) => (
          <TouchableOpacity key={index} onPress={() => setSelectedTab(tab)}>
            <Text style={[styles.tabText, selectedTab === tab && styles.activeTab]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!order ? (
        <View style={{ flex: 1, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
          <ActivityIndicator size={"large"} color={'black'} />
          <Text>Đang tải dữ liệu...</Text>
        </View>
      ) : (
        // Danh sách đơn hàng
        <ScrollView style={styles.scrollView}>
          {order.map((order) => {
            const orderItems = order.orderItems;

            return (
              <View key={order.id} style={styles.cardWrapper}>
                <Text style={styles.status}>Hoàn thành</Text>
                <View style={styles.card}>
                  <Text style={styles.productTitle}>{orderItems[0].name_product}</Text>
                  <Text style={styles.quantity}>x{orderItems[0].quantity}</Text>

                  <View style={styles.priceRow}>
                    <Text style={styles.oldPrice}>Giá cũ</Text>
                    <Text style={styles.price}>{orderItems[0].unit_price_item}</Text>
                  </View>
                </View>
                {expanded && orderItems.slice(1).map((orderItem, index) => (
                  <View key={index + 1} style={styles.card}>
                    <Text style={styles.productTitle}>{orderItem.name_product}</Text>
                    <Text style={styles.quantity}>x{orderItem.quantity}</Text>
                    <View style={styles.priceRow}>
                      <Text style={styles.oldPrice}>Giá cũ</Text>
                      <Text style={styles.price}>{orderItem.unit_price_item}</Text>
                    </View>
                  </View>
                ))}

                {orderItems.length > 1 && (
                  <TouchableOpacity onPress={toggleExpanded}>
                    <Text style={styles.toggleBtn}>
                      {expanded ? 'Ẩn bớt ▲' : 'Hiện thêm ▼'}
                    </Text>
                  </TouchableOpacity>
                )}

                <Text style={styles.total}>
                  Tổng số tiền ({orderItems.length} sản phẩm): {order.total_amount}
                </Text>

                <View style={styles.buttonRow}>
                  <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Xem chi tiết đơn hàng</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.button}>
                    <Text style={styles.buttonText}>Mua lại</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
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
    color:'black'
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    color:'black'
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
  card: {
    borderRadius: 8,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  status: {
    textAlign: 'right',
    fontWeight: '600',
    marginBottom: 4,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color:'black'
  },
  quantity: {
    fontSize: 14,
    marginTop: 4,
    color:'black'
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
  },
  total: {
    fontSize: 14,
    marginVertical: 6,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
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
  },
  toggleBtn: {
    color: 'black',
    fontWeight: 'bold',
    textAlign: 'center',
  }
});

export default OrdersScreen;
