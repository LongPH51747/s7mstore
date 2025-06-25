import React from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { API_BASE_URL } from '../config/api';

const OrderDetailScreen = ({ route }) => {
  const navigation = useNavigation();
  const { order } = route.params;

  return (
    <SafeAreaView style={styles.container}>
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
        <Text style={styles.headerTitle}>Chi tiết đơn hàng</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={true}
      >
        {/* Trạng thái đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trạng thái đơn hàng</Text>
          <Text style={styles.statusText}>{order.status}</Text>
        </View>

        {/* Thông tin đơn hàng */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng</Text>
          <Text style={styles.infoText}>Mã đơn hàng: {order._id}</Text>
          <Text style={styles.infoText}>Ngày đặt: {new Date(order.createdAt).toLocaleDateString('vi-VN')}</Text>
          <Text style={styles.infoText}>Phương thức thanh toán: {order.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Thanh toán qua Momo'}</Text>
          <Text style={styles.infoText}>Trạng thái thanh toán: {order.payment_status}</Text>
        </View>

        {/* Thông tin người nhận */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Thông tin người nhận</Text>
          <Text style={styles.infoText}>Họ tên: {order.id_address.fullName}</Text>
          <Text style={styles.infoText}>Số điện thoại: {order.id_address.phone_number}</Text>
          <Text style={styles.infoText}>Địa chỉ: {order.id_address.addressDetail}</Text>
        </View>

        {/* Sản phẩm */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sản phẩm</Text>
          {order.orderItems.map((item, index) => (
            <View key={item.id_variant || index} style={styles.productItem}>
              <Image
                source={(() => {
                  console.log('OrderDetailScreen - item.image:', item.image);
                  if (item.image && item.image.startsWith('/uploads_product/')) {
                    const src = { uri: `${API_BASE_URL}${item.image}` };
                    console.log('OrderDetailScreen - image source:', src);
                    return src;
                  }
                  if (item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:image'))) {
                    const src = { uri: item.image };
                    console.log('OrderDetailScreen - image source:', src);
                    return src;
                  }
                  console.log('OrderDetailScreen - image source: default');
                  return require('../assets/LogoGG.png');
                })()}
                style={styles.productImage}
                resizeMode="cover"
                onError={(e) => {
                  e.target.setNativeProps({
                    source: require('../assets/LogoGG.png')
                  });
                }}
              />
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.name_product}</Text>
                <Text style={styles.productDetail}>Màu: {item.color}</Text>
                <Text style={styles.productDetail}>Size: {item.size}</Text>
                <Text style={styles.productDetail}>Số lượng: {item.quantity}</Text>
                <Text style={styles.productPrice}>{item.unit_price_item?.toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Tổng tiền */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tổng tiền</Text>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tạm tính:</Text>
            <Text style={styles.totalValue}>{order.sub_total_amount?.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Phí vận chuyển:</Text>
            <Text style={styles.totalValue}>{order.shipping?.toLocaleString('vi-VN')}đ</Text>
          </View>
          <View style={[styles.totalRow, styles.finalTotal]}>
            <Text style={styles.totalLabel}>Tổng cộng:</Text>
            <Text style={styles.totalValue}>{order.total_amount?.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    zIndex: 1,
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
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 20,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  statusText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  productItem: {
    flexDirection: 'row',
    marginBottom: 16,
    backgroundColor: '#F6F8F9',
    padding: 12,
    borderRadius: 8,
  },
  productImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#D3180C',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalValue: {
    fontSize: 14,
    color: '#000',
  },
  finalTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E3E4E5',
  },
});

export default OrderDetailScreen;
