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
          navigation.replace('Login'); // Optionally redirect to Login
        }
      } else {
        console.warn('No userInfo found in AsyncStorage on ProductDetailScreen focus.');
        // No alert here, as it might interfere with initial screen load for unauthenticated users
      }
    } catch (error) {
      console.error('Failed to get user info from AsyncStorage on ProductDetailScreen focus:', error);
      // No alert here to avoid interfering with screen flow
    }
  }, [navigation]);

  useEffect(() => {
    // Initial load of user info
    getUserInfo();

    // Add listener for focus events to re-fetch user info
    const unsubscribe = navigation.addListener('focus', () => {
      getUserInfo();
    });

    // Cleanup the listener when the component unmounts
    return unsubscribe;
  }, [getUserInfo, navigation]);

  useEffect(() => {
    if (route.params?.product) {
      const fetchedProduct = route.params.product;
      setProduct(fetchedProduct);
      // console.log('Product data received in ProductDetailScreen:', fetchedProduct);
      
      if (fetchedProduct.product_variant && fetchedProduct.product_variant.length > 0) {
        setSelectedVariant(fetchedProduct.product_variant[0]);
        // console.log('Initial selected variant:', fetchedProduct.product_variant[0]);
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
    if (!product || !selectedVariant) {
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Sản phẩm hoặc biến thể chưa được chọn.');
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
          image: selectedVariant.variant_image_url || (selectedVariant.variant_image_base64 ? `data:${selectedVariant.variant_image_type};base64,${selectedVariant.variant_image_base64}` : null) || product.product_image,
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
          errorData = await response.text(); // Read as text to see the raw response
          console.error('Raw error response from server:', errorData);
          // Attempt to parse as JSON in case it's a valid JSON error message
          const jsonError = JSON.parse(errorData);
          throw new Error(`Failed to add to cart: ${response.status} - ${jsonError.message || response.statusText}`);
        } catch (parseError) {
          // If it's not JSON, throw an error with the raw text
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

  if (!product || !selectedVariant || !currentDisplayImage) {
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
  
  // console.log('Final Display Image Source URI:', displayImageSource.uri);

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

      {/* Variant Image Thumbnails */}
      {product.product_variant && product.product_variant.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.thumbnailScrollView}>
          {/* Main Product Image Thumbnail */}
          <TouchableOpacity 
            key="main-product-image" 
            onPress={() => {
              setCurrentDisplayImage(product.product_image);
              setSelectedVariant(null);
            }} 
            style={[
              styles.thumbnailContainer,
              !selectedVariant && styles.selectedThumbnail,
            ]}
          >
            <Image 
              source={(
                product.product_image && 
                (product.product_image.startsWith('http://') || 
                 product.product_image.startsWith('https://') || 
                 product.product_image.startsWith('data:image'))
              )
                ? { uri: product.product_image }
                : require('../assets/LogoGG.png')
              }
              style={styles.thumbnailImage} 
              resizeMode="cover" 
            />
          </TouchableOpacity>

          {/* Variant Thumbnails */}
          {product.product_variant.map((variant) => {
            const thumbnailSource = 
              (variant.variant_image_url && (variant.variant_image_url.startsWith('http://') || variant.variant_image_url.startsWith('https://')))
                ? { uri: variant.variant_image_url }
              : (variant.variant_image_base64 && typeof variant.variant_image_base64 === 'string' && variant.variant_image_base64.length > 0 && variant.variant_image_type) 
                ? { uri: `data:${variant.variant_image_type};base64,${variant.variant_image_base64}` }
                : require('../assets/LogoGG.png');
            
            // console.log(`Final Thumbnail Source URI for ${variant.variant_color} ${variant.variant_size}:`, thumbnailSource.uri);

            return (
              <TouchableOpacity 
                key={variant._id} 
                onPress={() => handleVariantChange(variant)} 
                style={[
                  styles.thumbnailContainer,
                  selectedVariant && selectedVariant._id === variant._id && styles.selectedThumbnail,
                ]}
              >
                <Image source={thumbnailSource} style={styles.thumbnailImage} resizeMode="cover" />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.detailsContainer}>
        <Text style={styles.productName}>{product.product_name}</Text>
        <Text style={styles.productPrice}>
          {selectedVariant.variant_price?.toLocaleString('vi-VN')}đ
        </Text>
        <Text style={styles.description}>{product.product_description}</Text>

        {/* Variant Selection */}
        {product.product_variant && product.product_variant.length > 0 && (
          <View style={styles.variantSelectionContainer}>
            <Text style={styles.variantSelectionTitle}>Select Variant:</Text>
            <View style={styles.variantButtonsWrapper}> 
              {product.product_variant.map((variant) => {
                const isSelected = selectedVariant._id === variant._id;
                const buttonStyle = [styles.variantButton, isSelected && styles.selectedVariantButton];
                const textStyle = [styles.variantButtonText, isSelected && styles.selectedVariantButtonText];

                console.log(`Variant ${variant.variant_color} ${variant.variant_size} isSelected: ${isSelected}, Applied Button Style:`, StyleSheet.flatten(buttonStyle));
                console.log(`Variant ${variant.variant_color} ${variant.variant_size} isSelected: ${isSelected}, Applied Text Style:`, StyleSheet.flatten(textStyle));

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

        {/* Quantity Selector - Optional, can be expanded */}
        <View style={styles.quantityContainer}>
          <Text style={styles.quantityText}>Quantity: {quantity}</Text>
          {/* Add buttons to increase/decrease quantity if needed */}
        </View>

        <TouchableOpacity style={styles.addToCartButton} onPress={handleAddToCart}>
          <Text style={styles.addToCartText}>Add to Cart</Text>
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
  thumbnailScrollView: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 10,
  },
  thumbnailContainer: {
    width: 70,
    height: 70,
    borderRadius: 5,
    overflow: 'hidden',
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  selectedThumbnail: {
    borderColor: '#007AFF',
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
    marginBottom: 20,
  },
  quantityText: {
    fontSize: 16,
    marginRight: 10,
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