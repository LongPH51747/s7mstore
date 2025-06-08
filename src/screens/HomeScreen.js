import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, SafeAreaView, Text, FlatList, TouchableOpacity, Dimensions, ActivityIndicator, ScrollView } from 'react-native';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';

const numColumns = 2;
const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / numColumns - 24;

/**
 * Màn hình Trang chủ (Home Screen)
 *
 * Chức năng:
 * - Hiển thị banner quảng cáo
 * - Hiển thị danh mục sản phẩm
 * - Hiển thị danh sách sản phẩm
 * - Tìm kiếm sản phẩm
 * - Điều hướng đến các màn hình khác
 */
const HomeScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');

  /**
   * Fetch dữ liệu khi component mount
   */
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch products
        console.log('Fetching products...');
        const productsController = new AbortController();
        const productsTimeout = setTimeout(() => productsController.abort(), API_TIMEOUT);
        
        const productsResponse = await fetch(API_ENDPOINTS.PRODUCTS.GET_ALL, {
          headers: API_HEADERS,
          signal: productsController.signal,
        });
        clearTimeout(productsTimeout);
        
        if (!productsResponse.ok) {
          throw new Error(`Failed to fetch products: ${productsResponse.status}`);
        }
        const productsData = await productsResponse.json();
        console.log('Products response:', productsData);
        if (productsData && Array.isArray(productsData)) {
          setProducts(productsData);
        } else {
          console.error('Invalid products data format:', productsData);
          setProducts([]);
        }

        // Fetch categories
        console.log('Fetching categories...');
        const categoriesController = new AbortController();
        const categoriesTimeout = setTimeout(() => categoriesController.abort(), API_TIMEOUT);
        
        const categoriesResponse = await fetch(API_ENDPOINTS.CATEGORIES.GET_ALL, {
          headers: API_HEADERS,
          signal: categoriesController.signal,
        });
        clearTimeout(categoriesTimeout);
        
        if (!categoriesResponse.ok) {
          throw new Error(`Failed to fetch categories: ${categoriesResponse.status}`);
        }
        const categoriesData = await categoriesResponse.json();
        if (categoriesData && Array.isArray(categoriesData)) {
          setCategories(categoriesData);
        } else {
          console.error('Invalid categories data format:', categoriesData);
          setCategories([]);
        }

        // Fetch banners
        console.log('Fetching banners...');
        const bannersController = new AbortController();
        const bannersTimeout = setTimeout(() => bannersController.abort(), API_TIMEOUT);
        
        const bannersResponse = await fetch(API_ENDPOINTS.BANNERS.GET_ALL, {
          headers: API_HEADERS,
          signal: bannersController.signal,
        });
        clearTimeout(bannersTimeout);
        
        if (!bannersResponse.ok) {
          throw new Error(`Failed to fetch banners: ${bannersResponse.status}`);
        }
        const bannersData = await bannersResponse.json();
        if (bannersData && Array.isArray(bannersData)) {
          const transformedBanners = bannersData.map(banner => ({
            ...banner,
            image: banner.banner_image_url || null
          }));
          setBanners(transformedBanners);
        } else {
          console.error('Invalid banners data format:', bannersData);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /**
   * Tự động chuyển banner sau mỗi 3s
   */
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setBannerIndex(idx => (idx + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners]);

  /**
   * Lọc sản phẩm theo danh mục
   */
  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(product => product.product_category.includes(selectedCategory));

  console.log('Filtered products:', filteredProducts);
  console.log('Selected category:', selectedCategory);

  /**
   * Render item sản phẩm trong grid
   */
  const renderItem = ({ item }) => {
    console.log('Rendering product:', item);
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate('ProductDetail', { product: item })}
      >
        <Image 
          source={item.product_image ? { uri: item.product_image } : require('../assets/LogoGG.png')} 
          style={styles.image} 
          resizeMode="cover"
          onError={(e) => console.error('Image loading error:', e.nativeEvent.error)}
        />
        <Text style={styles.price}>{item.product_price?.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.name} numberOfLines={2}>{item.product_name}</Text>
        <TouchableOpacity style={styles.heart}>
          <Text>♡</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  /**
   * Hiển thị loading khi đang tải dữ liệu
   */
  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header: logo và ô tìm kiếm */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.searchContainer}
          onPress={() => navigation.navigate('Search')}
        >
          <Text style={styles.searchPlaceholder}>🔍 Tìm kiếm sản phẩm...</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {/* Banner quảng cáo */}
        {banners.length > 0 && banners[bannerIndex] && banners[bannerIndex].image && (
          <View style={styles.bannerImgWrap}>
            <Image
              source={{ uri: banners[bannerIndex].image }}
              style={styles.bannerImg}
              resizeMode="cover"
              onError={(e) => console.error('Banner image loading error:', e.nativeEvent.error)}
            />
          </View>
        )}
        {/* Danh mục sản phẩm (tabs) */}
        <View style={styles.categoriesContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryCard,
                selectedCategory === 'All' && styles.categoryCardActive
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <View style={styles.categoryImageContainer}>
                <Image 
                  source={require('../assets/LogoGG.png')}
                  style={styles.categoryImage}
                  resizeMode="cover"
                />
              </View>
              <Text style={[
                styles.categoryName,
                selectedCategory === 'All' && styles.categoryNameActive
              ]}>
                Tất cả
              </Text>
            </TouchableOpacity>
            {categories.map(category => (
              <TouchableOpacity
                key={category._id}
                style={[
                  styles.categoryCard,
                  category.category_name === selectedCategory && styles.categoryCardActive
                ]}
                onPress={() => setSelectedCategory(category.category_name)}
              >
                <View style={styles.categoryImageContainer}>
                  <Image 
                    source={
                      category.category_image 
                        ? { uri: `data:image/jpeg;base64,${category.category_image}` }
                        : require('../assets/LogoGG.png')
                    }
                    style={styles.categoryImage}
                    resizeMode="cover"
                    onError={(e) => console.error('Category image loading error:', e.nativeEvent.error)}
                  />
                </View>
                <Text style={[
                  styles.categoryName,
                  category.category_name === selectedCategory && styles.categoryNameActive
                ]}>
                  {category.category_name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {/* Grid sản phẩm */}
        <FlatList
          scrollEnabled={false}
          data={filteredProducts}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          numColumns={numColumns}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </ScrollView>
      {/* Bottom Navigation: các icon điều hướng nhanh */}
      <View style={styles.bottomNav}>
        <Text style={styles.bottomIcon}>🏠</Text>
        <Text style={styles.bottomIcon}>🔍</Text>
        <Text style={styles.bottomIcon}>🛒</Text>
        <Text style={styles.bottomIcon}>♡</Text>
        <Text style={styles.bottomIcon}>👤</Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerLogo: {
    width: 100,
    height: 40,
  },
  searchContainer: {
    flex: 1,
    marginLeft: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
  },
  searchPlaceholder: {
    color: '#666',
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#222', letterSpacing: 1 },
  headerIcon: { fontSize: 26, color: '#222' },
  tabs: { 
    flexDirection: 'row', 
    padding: 12, 
    borderBottomWidth: 1, 
    borderColor: '#eee',
  },
  tab: { marginRight: 16, color: '#888', fontSize: 16 },
  tabActive: { marginRight: 16, fontWeight: 'bold', color: '#000', fontSize: 16 },
  list: { padding: 12 },
  card: {
    width: ITEM_WIDTH,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    position: 'relative',
  },
  image: { width: '100%', height: 200, borderRadius: 8 },
  price: { fontWeight: 'bold', marginTop: 8 },
  name: { color: '#444', fontSize: 13, marginTop: 2, marginBottom: 8 },
  heart: { position: 'absolute', top: 10, right: 10 },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
  },
  bottomIcon: {
    fontSize: 32,
  },
  bannerImgWrap: { width: '100%', height: 180, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  bannerImg: { width: '95%', height: 180, borderRadius: 12 },
  categoriesContainer: {
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
  categoriesScrollContent: {
    paddingHorizontal: 12,
  },
  categoryCard: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8f8f8',
  },
  categoryCardActive: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  categoryImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  categoryImage: {
    width: '100%',
    height: '100%',
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  categoryNameActive: {
    color: '#000',
    fontWeight: 'bold',
  },
});

export default HomeScreen; 