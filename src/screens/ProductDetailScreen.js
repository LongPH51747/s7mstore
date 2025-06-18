import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';

const { width } = Dimensions.get('window');

const ProductDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const [product, setProduct] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [currentDisplayImage, setCurrentDisplayImage] = useState(null);
  const [userId, setUserId] = useState(null);

  // Function to get user info from AsyncStorage
  const getUserInfo = useCallback(async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString !== null) {
        const userInfo = JSON.parse(userInfoString);
        if (userInfo && userInfo._id) {
          setUserId(userInfo._id);
          console.log('User ID from AsyncStorage on ProductDetailScreen focus (MongoDB _id):', userInfo._id);
        } else {
          console.warn('userInfo found but _id is missing on ProductDetailScreen focus:', userInfo);
          Alert.alert('Thông báo', 'Không tìm thấy ID người dùng. Vui lòng đăng nhập lại.');
          navigation.replace('Login');
        }
      } else {
        console.warn('No userInfo found in AsyncStorage on ProductDetailScreen focus.');
      }
    } catch (error) {
      console.error('Failed to get user info from AsyncStorage on ProductDetailScreen focus:', error);
    }
  }, [navigation]);

  useEffect(() => {
    getUserInfo();
    const unsubscribe = navigation.addListener('focus', () => {
      getUserInfo();
    });
    return unsubscribe;
  }, [getUserInfo, navigation]);

  useEffect(() => {
    if (route.params?.product) {
      const fetchedProduct = route.params.product;
      setProduct(fetchedProduct);
      
      if (fetchedProduct.product_variant && fetchedProduct.product_variant.length > 0) {
        setSelectedVariant(fetchedProduct.product_variant[0]);
      }
      if (fetchedProduct.product_image) {
        setCurrentDisplayImage(fetchedProduct.product_image);
      }
    }
  }, [route.params]);

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    setQuantity(1);
    console.log('Selected variant changed to:', variant);

    if (variant.variant_image_url) {
      setCurrentDisplayImage(variant.variant_image_url);
    } else if (variant.variant_image_base64 && variant.variant_image_type) {
      setCurrentDisplayImage(`data:${variant.variant_image_type};base64,${variant.variant_image_base64}`);
    } else {
      setCurrentDisplayImage(product.product_image);
    }
  };

  const handleAddToCart = async () => {
    if (!userId) {
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Người dùng chưa đăng nhập.');
      return;
    }

    if (!product) {
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Sản phẩm chưa được chọn.');
      return;
    }

    if (!selectedVariant) {
      Alert.alert('Lỗi', 'Vui lòng chọn biến thể sản phẩm.');
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const requestBody = {
        cartItem: {
          id_product: product._id,
          id_variant: selectedVariant._id,
          name_product: product.product_name,
          color: selectedVariant.variant_color,
          size: selectedVariant.variant_size,
          quantity: quantity,
          unit_price_item: selectedVariant.variant_price,
          total_price_item: selectedVariant.variant_price * quantity,
          image: selectedVariant.variant_image_url || 
                 (selectedVariant.variant_image_base64 ? 
                  `data:${selectedVariant.variant_image_type};base64,${selectedVariant.variant_image_base64}` : 
                  product.product_image),
          status: false,
        }
      };

      console.log('Adding to cart payload:', requestBody);

      const response = await fetch(`${API_ENDPOINTS.CART.ADD_TO_CART}/${userId}`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData = '';
        try {
          errorData = await response.text();
          console.error('Raw error response from server:', errorData);
          const jsonError = JSON.parse(errorData);
          throw new Error(`Failed to add to cart: ${response.status} - ${jsonError.message || response.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to add to cart: ${response.status} - Unexpected response format: ${errorData.substring(0, 100)}...`);
        }
      }

      const responseData = await response.json();
      console.log('Add to cart successful:', responseData);
      Alert.alert('Thành công', 'Sản phẩm đã được thêm vào giỏ hàng!');

    } catch (error) {
      if (error.name === 'AbortError') {
        Alert.alert('Lỗi', 'Thời gian yêu cầu thêm vào giỏ hàng đã hết. Vui lòng thử lại.');
      } else {
        console.error('Error adding to cart:', error);
        Alert.alert('Lỗi', `Không thể thêm vào giỏ hàng: ${error.message}`);
      }
    }
  };

  if (!product) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text>Loading product details...</Text>
      </View>
    );
  }

  const displayImageSource = (
    typeof currentDisplayImage === 'string' && 
    (currentDisplayImage.startsWith('http://') || 
     currentDisplayImage.startsWith('https://') || 
     currentDisplayImage.startsWith('data:image'))
  )
    ? { uri: currentDisplayImage }
    : require('../assets/LogoGG.png');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      <Image
        source={displayImageSource}
        style={styles.productImage}
        resizeMode="cover"
        onError={(e) => {
          console.error('Product detail image loading error:', e.nativeEvent.error);
          e.target.setNativeProps({ source: require('../assets/LogoGG.png') });
        }}
      />

      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.product_name}</Text>
        <Text style={styles.productPrice}>
          {selectedVariant ? selectedVariant.variant_price?.toLocaleString('vi-VN') : product.product_price?.toLocaleString('vi-VN')}đ
        </Text>
        <Text style={styles.description}>{product.product_description}</Text>

        {/* Variant Selection */}
        {product.product_variant && product.product_variant.length > 0 && (
          <View style={styles.variantSelectionContainer}>
            <Text style={styles.variantSelectionTitle}>Chọn biến thể:</Text>
            <View style={styles.variantButtonsWrapper}>
              {product.product_variant.map((variant) => {
                const isSelected = selectedVariant && selectedVariant._id === variant._id;
                const buttonStyle = [styles.variantButton, isSelected && styles.selectedVariantButton];
                const textStyle = [styles.variantButtonText, isSelected && styles.selectedVariantButtonText];

                return (
                  <TouchableOpacity
                    key={variant._id}
                    style={buttonStyle}
                    onPress={() => handleVariantChange(variant)}
                  >
                    <Text style={textStyle}>
                      {variant.variant_color} - {variant.variant_size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Quantity Selector */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityText}>Số lượng: {quantity}</Text>
          <View style={styles.quantityButtons}>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Text style={styles.quantityButtonText}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityNumber}>{quantity}</Text>
            <TouchableOpacity 
              style={styles.quantityButton}
              onPress={() => setQuantity(quantity + 1)}
            >
              <Text style={styles.quantityButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>Thêm vào giỏ hàng</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  productImage: {
    width: width,
    height: width * 0.7,
  },
  detailsContainer: {
    padding: 16,
  },
  productName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 20,
    color: '#2ecc71',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    lineHeight: 24,
  },
  variantSelectionContainer: {
    marginBottom: 20,
  },
  variantSelectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  variantButtonsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  variantButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    marginBottom: 10,
  },
  selectedVariantButton: {
    backgroundColor: '#FF0000',
    borderColor: '#FF0000',
  },
  variantButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedVariantButtonText: {
    color: '#fff',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quantityText: {
    fontSize: 16,
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#333',
  },
  quantityNumber: {
    fontSize: 16,
    marginHorizontal: 15,
  },
  addToCartButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default ProductDetailScreen; 