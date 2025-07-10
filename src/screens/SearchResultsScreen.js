/**
 * Màn hình Kết quả tìm kiếm (Search Results Screen)
 * 
 * Màn hình này hiển thị kết quả tìm kiếm sản phẩm với các chức năng:
 * - Hiển thị danh sách sản phẩm tìm được
 * - Lọc sản phẩm theo danh mục
 * - Sắp xếp sản phẩm theo giá
 * - Xem chi tiết sản phẩm
 */

import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';
import Icon from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const numColumns = 2;
const ITEM_WIDTH = width / numColumns - 24;

const getImageSource = (img) => {
  if (typeof img === 'string') {
    if (img.startsWith('/uploads_product/')) {
      return { uri: `${API_BASE_URL}${img}` };
    }
    if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:image')) {
      return { uri: img };
    }
  }
  return require('../assets/errorimg.webp');
};

const SearchResultsScreen = ({ route, navigation }) => {
  const { searchQuery } = route.params;
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [sortBy, setSortBy] = useState('default');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [searchQuery]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(`${API_ENDPOINTS.PRODUCTS.SEARCH}?q=${encodeURIComponent(searchQuery)}`, {
        headers: API_HEADERS,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch products: ${response.status}`);
      }

      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(error.message);
      if (error.name === 'AbortError') {
        Alert.alert('Lỗi', 'Thời gian tìm kiếm đã hết. Vui lòng thử lại.');
      } else {
        Alert.alert('Lỗi', 'Không thể tải kết quả tìm kiếm. Vui lòng thử lại sau.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(API_ENDPOINTS.CATEGORIES.GET_ALL, {
        headers: API_HEADERS,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch categories: ${response.status}`);
      }

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!selectedCategory) return true;
    return product.product_category?.some(category => 
      category && category.category_name === selectedCategory
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc':
        return a.product_price - b.product_price;
      case 'price_desc':
        return b.product_price - a.product_price;
      default:
        return 0;
    }
  });

  const renderProductItem = ({ item }) => {
    const productImageSource = getImageSource(item.product_image);

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <Image 
          source={productImageSource} 
          style={styles.image} 
          resizeMode="cover"
          onError={(e) => {
            e.target.setNativeProps({ source: require('../assets/errorimg.webp') });
          }}
        />
        <Text style={styles.price}>{item.product_price?.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.name} numberOfLines={2}>{item.product_name}</Text>
        <TouchableOpacity style={styles.heart}>
          <Text style={styles.heartIcon}>♡</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Icon name="alert-circle-outline" size={48} color="#ff3b30" />
        <Text style={styles.errorText}>Không thể tải kết quả tìm kiếm</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProducts}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Kết quả tìm kiếm</Text>
        <Text style={styles.subtitle}>Tìm thấy {products.length} sản phẩm</Text>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScrollContent}
        >
          <TouchableOpacity
            style={[
              styles.categoryTab,
              !selectedCategory && styles.selectedCategoryTab
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <View style={styles.categoryImageContainer}>
              <Image
                source={require('../assets/errorimg.webp')}
                style={styles.categoryImage}
              />
            </View>
            <Text style={[
              styles.categoryText,
              !selectedCategory && styles.selectedCategoryText
            ]}>Tất cả</Text>
          </TouchableOpacity>
          {categories.map(category => (
            <TouchableOpacity
              key={category._id}
              style={[
                styles.categoryTab,
                selectedCategory === category.category_name && styles.selectedCategoryTab
              ]}
              onPress={() => setSelectedCategory(category.category_name)}
            >
              <View style={styles.categoryImageContainer}>
                <Image
                  source={getImageSource(category.category_image)}
                  style={styles.categoryImage}
                  onError={(e) => {
                    e.target.setNativeProps({ source: require('../assets/errorimg.webp') });
                  }}
                />
              </View>
              <Text style={[
                styles.categoryText,
                selectedCategory === category.category_name && styles.selectedCategoryText
              ]}>{category.category_name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sort Options */}
      <View style={styles.sortContainer}>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'price_asc' && styles.sortButtonSelected]}
          onPress={() => setSortBy('price_asc')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'price_asc' && styles.sortButtonTextSelected]}>
            Giá: Thấp đến cao
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.sortButton, sortBy === 'price_desc' && styles.sortButtonSelected]}
          onPress={() => setSortBy('price_desc')}
        >
          <Text style={[styles.sortButtonText, sortBy === 'price_desc' && styles.sortButtonTextSelected]}>
            Giá: Cao đến thấp
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products List */}
      {sortedProducts.length > 0 ? (
        <FlatList
          data={sortedProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item._id}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={[styles.container, styles.centerContent]}>
          <Icon name="search-outline" size={48} color="#666" />
          <Text style={styles.noResultsText}>Không tìm thấy sản phẩm phù hợp</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  categoriesContainer: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  categoriesScrollContent: {
    paddingHorizontal: 12,
  },
  categoryTab: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  selectedCategoryTab: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  selectedCategoryText: {
    color: '#000',
    fontWeight: 'bold',
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  sortContainer: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  sortButtonSelected: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  sortButtonText: {
    color: '#666',
  },
  sortButtonTextSelected: {
    color: '#fff',
  },
  list: {
    padding: 12,
  },
  card: {
    width: ITEM_WIDTH,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  price: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  name: {
    color: '#444',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  heart: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  heartIcon: {
    fontSize: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#ff3b30',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default SearchResultsScreen; 