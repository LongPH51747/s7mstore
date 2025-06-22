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
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';

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
      console.log('=== PRODUCT DETAIL: Product data received ===');
      console.log('Full product data:', JSON.stringify(fetchedProduct, null, 2));
      
      setProduct(fetchedProduct);
      
      if (fetchedProduct.product_variant && fetchedProduct.product_variant.length > 0) {
        console.log('=== PRODUCT DETAIL: Product variants ===');
        fetchedProduct.product_variant.forEach((variant, index) => {
          console.log(`Variant ${index + 1}:`, {
            _id: variant._id,
            variant_color: variant.variant_color,
            variant_size: variant.variant_size,
            variant_price: variant.variant_price,
            variant_quantity: variant.variant_quantity,
            stock: variant.stock,
            // Log all available fields to see what's actually there
            allFields: Object.keys(variant),
            fullVariantData: variant
          });
        });
        
        // Chỉ chọn biến thể còn hàng đầu tiên
        const availableVariant = fetchedProduct.product_variant.find(variant => {
          const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
          console.log('=== PRODUCT DETAIL: Checking variant stock ===', {
            variantId: variant._id,
            variant_quantity: variant.variant_quantity,
            stock: variant.stock,
            quantity: variant.quantity,
            inventory: variant.inventory,
            calculatedStock: stockQuantity
          });
          return stockQuantity > 0;
        });
        
        console.log('=== PRODUCT DETAIL: Initial variant selection ===', {
          availableVariant: availableVariant ? {
            _id: availableVariant._id,
            variant_color: availableVariant.variant_color,
            variant_size: availableVariant.variant_size,
            variant_quantity: availableVariant.variant_quantity,
            stock: availableVariant.stock,
            quantity: availableVariant.quantity,
            inventory: availableVariant.inventory
          } : 'No available variant found',
          firstVariant: fetchedProduct.product_variant[0] ? {
            _id: fetchedProduct.product_variant[0]._id,
            variant_color: fetchedProduct.product_variant[0].variant_color,
            variant_size: fetchedProduct.product_variant[0].variant_size,
            variant_quantity: fetchedProduct.product_variant[0].variant_quantity,
            stock: fetchedProduct.product_variant[0].stock,
            quantity: fetchedProduct.product_variant[0].quantity,
            inventory: fetchedProduct.product_variant[0].inventory
          } : 'No variants available'
        });
        
        setSelectedVariant(availableVariant || null); // Nếu không có biến thể nào còn hàng thì null
        // Set image for the available variant if exists
        if (availableVariant) {
          if (availableVariant.variant_image_url) {
            if (typeof availableVariant.variant_image_url === 'string' && availableVariant.variant_image_url.startsWith('/uploads_product/')) {
              setCurrentDisplayImage(`${API_BASE_URL}${availableVariant.variant_image_url}`);
            } else {
              setCurrentDisplayImage(availableVariant.variant_image_url);
            }
          } else if (availableVariant.variant_image_base64 && availableVariant.variant_image_type) {
            setCurrentDisplayImage(`data:${availableVariant.variant_image_type};base64,${availableVariant.variant_image_base64}`);
          } else {
            if (typeof fetchedProduct.product_image === 'string' && fetchedProduct.product_image.startsWith('/uploads_product/')) {
              setCurrentDisplayImage(`${API_BASE_URL}${fetchedProduct.product_image}`);
            } else {
              setCurrentDisplayImage(fetchedProduct.product_image);
            }
          }
        } else if (fetchedProduct.product_image) {
          if (typeof fetchedProduct.product_image === 'string' && fetchedProduct.product_image.startsWith('/uploads_product/')) {
            setCurrentDisplayImage(`${API_BASE_URL}${fetchedProduct.product_image}`);
          } else {
            setCurrentDisplayImage(fetchedProduct.product_image);
          }
        }
      }
    }
  }, [route.params]);

  const handleVariantChange = (variant) => {
    console.log('=== PRODUCT DETAIL: handleVariantChange called ===');
    console.log('Selected variant:', {
      _id: variant._id,
      variant_color: variant.variant_color,
      variant_size: variant.variant_size,
      variant_price: variant.variant_price,
      variant_quantity: variant.variant_quantity,
      stock: variant.stock,
      quantity: variant.quantity,
      inventory: variant.inventory,
      allFields: Object.keys(variant)

    });
    
    // Kiểm tra xem biến thể có hàng tồn kho không - try multiple field names
    const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
    console.log('=== PRODUCT DETAIL: Stock validation ===', {
      stockQuantity,
      isOutOfStock: stockQuantity <= 0,
      fieldValues: {
        variant_quantity: variant.variant_quantity,
        stock: variant.stock,
        quantity: variant.quantity,
        inventory: variant.inventory
      }
    });
    
    if (stockQuantity <= 0) {
      // Find the next available variant
      const nextAvailableVariant = product.product_variant.find(v => {
        const qty = v.variant_stock || v.variant_quantity || v.stock || v.quantity || v.inventory || 0;
        
        return qty > 0 && v._id !== variant._id;
      });
      if (nextAvailableVariant) {
        setSelectedVariant(nextAvailableVariant);
        // Update image for the new variant
        if (nextAvailableVariant.variant_image_url) {
          if (typeof nextAvailableVariant.variant_image_url === 'string' && nextAvailableVariant.variant_image_url.startsWith('/uploads_product/')) {
            setCurrentDisplayImage(`${API_BASE_URL}${nextAvailableVariant.variant_image_url}`);
          } else {
            setCurrentDisplayImage(nextAvailableVariant.variant_image_url);
          }
        } else if (nextAvailableVariant.variant_image_base64 && nextAvailableVariant.variant_image_type) {
          setCurrentDisplayImage(`data:${nextAvailableVariant.variant_image_type};base64,${nextAvailableVariant.variant_image_base64}`);
        } else {
          if (typeof product.product_image === 'string' && product.product_image.startsWith('/uploads_product/')) {
            setCurrentDisplayImage(`${API_BASE_URL}${product.product_image}`);
          } else {
            setCurrentDisplayImage(product.product_image);
          }
        }
        Alert.alert('Thông báo', 'Biến thể này đã hết hàng. Đã chuyển sang biến thể còn hàng tiếp theo.');
      } else {
        Alert.alert('Thông báo', 'Biến thể này đã hết hàng và không còn biến thể nào khác.');
      }
      return;
    }

    setSelectedVariant(variant);
    setQuantity(1);
    console.log('=== PRODUCT DETAIL: Variant changed successfully ===', {
      newSelectedVariant: variant._id,
      newQuantity: 1
    });

    if (variant.variant_image_url) {
      if (typeof variant.variant_image_url === 'string' && variant.variant_image_url.startsWith('/uploads_product/')) {
        setCurrentDisplayImage(`${API_BASE_URL}${variant.variant_image_url}`);
      } else {
        setCurrentDisplayImage(variant.variant_image_url);
      }
    } else if (variant.variant_image_base64 && variant.variant_image_type) {
      setCurrentDisplayImage(`data:${variant.variant_image_type};base64,${variant.variant_image_base64}`);
    } else {
      if (typeof product.product_image === 'string' && product.product_image.startsWith('/uploads_product/')) {
        setCurrentDisplayImage(`${API_BASE_URL}${product.product_image}`);
      } else {
        setCurrentDisplayImage(product.product_image);
      }
    }
  };

  const handleAddToCart = async () => {
    console.log('=== PRODUCT DETAIL: handleAddToCart called ===');
    
    if (!userId) {
      console.log('=== PRODUCT DETAIL: No userId - cannot add to cart ===');
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Người dùng chưa đăng nhập.');
      return;
    }

    if (!product) {
      console.log('=== PRODUCT DETAIL: No product - cannot add to cart ===');
      Alert.alert('Lỗi', 'Không thể thêm vào giỏ hàng: Sản phẩm chưa được chọn.');
      return;
    }

    if (!selectedVariant) {
      console.log('=== PRODUCT DETAIL: No selected variant - cannot add to cart ===');
      Alert.alert('Lỗi', 'Vui lòng chọn biến thể sản phẩm.');
      return;
    }

    console.log('=== PRODUCT DETAIL: Validation data ===', {
      userId,
      productId: product._id,
      productName: product.product_name,
      selectedVariantId: selectedVariant._id,
      selectedVariantColor: selectedVariant.variant_color,
      selectedVariantSize: selectedVariant.variant_size,
      quantity,
      selectedVariantPrice: selectedVariant.variant_price
    });

    // Kiểm tra số lượng tồn kho
    const stockQuantity = selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0;
    console.log('=== PRODUCT DETAIL: Stock validation ===', {
      stockQuantity,
      requestedQuantity: quantity,
      isOutOfStock: stockQuantity <= 0,
      exceedsStock: quantity > stockQuantity,
      fieldValues: {
        variant_quantity: selectedVariant.variant_quantity,
        stock: selectedVariant.stock,
        quantity: selectedVariant.quantity,
        inventory: selectedVariant.inventory
      }
    });
    
    if (stockQuantity <= 0) {
      console.log('=== PRODUCT DETAIL: Item is out of stock ===');
      Alert.alert('Thông báo', 'Sản phẩm này đã hết hàng trong kho.');
      return;
    }

    if (quantity > stockQuantity) {
      console.log('=== PRODUCT DETAIL: Quantity exceeds stock ===', {
        requested: quantity,
        available: stockQuantity
      });
      Alert.alert('Thông báo', `Chỉ còn ${stockQuantity} sản phẩm trong kho. Vui lòng giảm số lượng xuống ${stockQuantity} hoặc ít hơn.`);
      return;
    }

    if (quantity <= 0) {
      console.log('=== PRODUCT DETAIL: Invalid quantity ===', { quantity });
      Alert.alert('Lỗi', 'Số lượng phải lớn hơn 0.');
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
          variant_quantity: stockQuantity, // Add stock information to cart item
        }
      };

      console.log('=== PRODUCT DETAIL: Add to cart request ===', {
        endpoint: `${API_ENDPOINTS.CART.ADD_TO_CART}/${userId}`,
        requestBody: JSON.stringify(requestBody, null, 2)
      });

      const response = await fetch(`${API_ENDPOINTS.CART.ADD_TO_CART}/${userId}`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      console.log('=== PRODUCT DETAIL: Add to cart response ===', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorData = '';
        try {
          errorData = await response.text();
          console.error('=== PRODUCT DETAIL: Raw error response ===', errorData);
          const jsonError = JSON.parse(errorData);
          throw new Error(`Failed to add to cart: ${response.status} - ${jsonError.message || response.statusText}`);
        } catch (parseError) {
          throw new Error(`Failed to add to cart: ${response.status} - Unexpected response format: ${errorData.substring(0, 100)}...`);
        }
      }

      const responseData = await response.json();
      console.log('=== PRODUCT DETAIL: Add to cart successful ===', responseData);
      Alert.alert('Thành công', `Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('=== PRODUCT DETAIL: Request timeout ===');
        Alert.alert('Lỗi', 'Thời gian yêu cầu thêm vào giỏ hàng đã hết. Vui lòng thử lại.');
      } else {
        console.error('=== PRODUCT DETAIL: Error adding to cart ===', error);
        Alert.alert('Lỗi', `Không thể thêm vào giỏ hàng: ${error.message}`);
      }
    }
  };

  // Declare only once before first use
  const isSelectedVariantInStock = selectedVariant && (selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0) > 0;
  const selectedVariantStock = selectedVariant ? (selectedVariant.variant_stock || selectedVariant.variant_quantity || selectedVariant.stock || selectedVariant.quantity || selectedVariant.inventory || 0) : 0;

  console.log('=== PRODUCT DETAIL: Current state ===', {
    hasProduct: !!product,
    hasSelectedVariant: !!selectedVariant,
    selectedVariantId: selectedVariant?._id,
    selectedVariantColor: selectedVariant?.variant_color,
    selectedVariantSize: selectedVariant?.variant_size,
    selectedVariantStock,
    isSelectedVariantInStock,
    currentQuantity: quantity,
    userId: userId,
    stockFieldValues: selectedVariant ? {
      variant_quantity: selectedVariant.variant_quantity,
      stock: selectedVariant.stock,
      quantity: selectedVariant.quantity,
      inventory: selectedVariant.inventory
    } : null
  });

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

        {/* Hiển thị thông tin tồn kho */}
        {selectedVariant && (
          <View style={styles.stockInfo}>
            <Text style={[
              styles.stockText,
              selectedVariantStock > 0 ? styles.inStock : styles.outOfStock
            ]}>
              {selectedVariantStock > 0 
                ? `Còn ${selectedVariantStock} sản phẩm trong kho` 
                : 'Hết hàng'
              }
            </Text>
          </View>
        )}

        {/* Variant Selection */}
        {product.product_variant && product.product_variant.length > 0 && (
          <View style={styles.variantSelectionContainer}>
            <Text style={styles.variantSelectionTitle}>Chọn biến thể:</Text>
            <View style={styles.variantButtonsWrapper}>
              {product.product_variant.map((variant) => {
                const isSelected = selectedVariant && selectedVariant._id === variant._id;
                const stockQuantity = variant.variant_stock || variant.variant_quantity || variant.stock || variant.quantity || variant.inventory || 0;
                const isOutOfStock = stockQuantity <= 0;
                
                const buttonStyle = [
                  styles.variantButton, 
                  isSelected && styles.selectedVariantButton,
                  isOutOfStock && styles.outOfStockVariantButton
                ];
                const textStyle = [
                  styles.variantButtonText, 
                  isSelected && styles.selectedVariantButtonText,
                  isOutOfStock && styles.outOfStockVariantButtonText
                ];

                return (
                  <View key={variant._id} style={styles.variantButtonContainer}>
                    <TouchableOpacity
                      style={buttonStyle}
                      onPress={() => handleVariantChange(variant)}
                      disabled={isOutOfStock}
                    >
                      <Text style={textStyle}>
                        {variant.variant_color} - {variant.variant_size}
                      </Text>
                    </TouchableOpacity>
                    <Text style={[
                      styles.variantStockText,
                      isOutOfStock ? styles.variantStockTextOut : styles.variantStockTextIn
                    ]}>
                      {isOutOfStock ? 'Hết hàng' : `${stockQuantity} sản phẩm`}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Quantity Selector */}
        {isSelectedVariantInStock && (
          <View style={styles.quantityContainer}>
            <View style={styles.quantityHeader}>
              <Text style={styles.quantityText}>Số lượng: {quantity}</Text>
              <Text style={styles.stockLimitText}>
                Tối đa: {selectedVariantStock} sản phẩm
              </Text>
            </View>
            <View style={styles.quantityButtons}>
              <TouchableOpacity 
                style={[
                  styles.quantityButton,
                  quantity <= 1 && styles.quantityButtonDisabled
                ]}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
              >
                <Text style={[
                  styles.quantityButtonText,
                  quantity <= 1 && styles.quantityButtonTextDisabled
                ]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.quantityNumber}>{quantity}</Text>
              <TouchableOpacity 
                style={[
                  styles.quantityButton,
                  quantity >= selectedVariantStock && styles.quantityButtonDisabled
                ]}
                onPress={() => {
                  if (quantity < selectedVariantStock) {
                    setQuantity(quantity + 1);
                  } else {
                    Alert.alert('Thông báo', `Chỉ còn ${selectedVariantStock} sản phẩm trong kho. Không thể tăng thêm số lượng.`);
                  }
                }}
                disabled={quantity >= selectedVariantStock}
              >
                <Text style={[
                  styles.quantityButtonText,
                  quantity >= selectedVariantStock && styles.quantityButtonTextDisabled
                ]}>+</Text>
              </TouchableOpacity>
            </View>
            {quantity >= selectedVariantStock && (
              <Text style={styles.stockWarningText}>
                ⚠️ Đã đạt giới hạn tồn kho
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity 
          style={[
            styles.addToCartButton,
            !isSelectedVariantInStock && styles.addToCartButtonDisabled
          ]} 
          onPress={handleAddToCart}
          disabled={!isSelectedVariantInStock}
        >
          <Text style={[
            styles.addToCartText,
            !isSelectedVariantInStock && styles.addToCartTextDisabled
          ]}>
            {isSelectedVariantInStock ? 'Thêm vào giỏ hàng' : 'Hết hàng'}
          </Text>
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
    height: width * 0.9,
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
    marginBottom: 16,
    lineHeight: 24,
  },
  stockInfo: {
    marginBottom: 16,
  },
  stockText: {
    fontSize: 14,
    fontWeight: '500',
  },
  inStock: {
    color: '#2ecc71',
  },
  outOfStock: {
    color: '#e74c3c',
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
  outOfStockVariantButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ccc',
    opacity: 0.6,
  },
  variantButtonText: {
    fontSize: 14,
    color: '#333',
  },
  selectedVariantButtonText: {
    color: '#fff',
  },
  outOfStockVariantButtonText: {
    color: '#999',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  quantityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  quantityText: {
    fontSize: 16,
  },
  stockLimitText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  quantityButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 40,
    height: 40,
    borderRadius: 15,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#e0e0e0',
    opacity: 0.5,
  },
  quantityButtonText: {
    fontSize: 18,
    color: '#333',
  },
  quantityButtonTextDisabled: {
    color: '#999',
  },
  quantityNumber: {
    fontSize: 16,
    marginHorizontal: 15,
  },
  stockWarningText: {
    fontSize: 14,
    color: '#e74c3c',
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  addToCartButton: {
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addToCartButtonDisabled: {
    backgroundColor: '#ccc',
  },
  addToCartText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  addToCartTextDisabled: {
    color: '#666',
  },
  variantButtonContainer: {
    alignItems: 'center',
    marginBottom: 15,
    marginRight: 10,
  },
  variantStockText: {
    fontSize: 12,
    marginTop: 5,
    fontWeight: '500',
  },
  variantStockTextIn: {
    color: '#2ecc71',
  },
  variantStockTextOut: {
    color: '#e74c3c',
  },
});

export default ProductDetailScreen; 