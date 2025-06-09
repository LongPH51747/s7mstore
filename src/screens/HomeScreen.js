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
        // console.log('Products response:', productsData);
        if (productsData && Array.isArray(productsData)) {
          setProducts(productsData);
          // console.log('Products state after fetch:', productsData.map(p => ({ id: p._id, image: p.product_image })));
        } else {
          // console.error('Invalid products data format:', productsData);
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
          // Transform category data to ensure valid image URLs
          const transformedCategories = categoriesData.map(category => ({
            ...category,
            category_image: (category.category_image && (category.category_image.startsWith('http://') || category.category_image.startsWith('https://')))
              ? category.category_image 
              : null
          }));
          setCategories(transformedCategories);
          // console.log('Categories state after fetch:', transformedCategories.map(c => ({ id: c._id, image: c.category_image })));
        } else {
          // console.error('Invalid categories data format:', categoriesData);
          setCategories([]);
        }

        // Fetch banners
        console.log('Fetching banners...');
        try {
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
          // console.log('Banners response:', bannersData);
          
          if (bannersData && Array.isArray(bannersData)) {
            const transformedBanners = bannersData.map(banner => ({
              ...banner,
              image: banner.banner_image_url || banner.banner_image || null
            })).filter(banner => banner.image !== null);
            
            // console.log('Transformed banners:', transformedBanners);
            setBanners(transformedBanners);
            // console.log('Banners state after fetch:', transformedBanners.map(b => ({ id: b._id, image: b.image }))); // Removed for long base64
          } else {
            // console.error('Invalid banners data format:', bannersData);
            setBanners([]);
          }
        } catch (bannerError) {
          // console.error('Error fetching banners:', bannerError);
          setBanners([]);
        }

        setLoading(false);
      } catch (error) {
        // console.error('Error fetching data:', error);
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

  // console.log('Filtered products:', filteredProducts);
  console.log('Selected category:', selectedCategory);

  /**
   * Render item sản phẩm trong grid
   */
  const renderItem = ({ item }) => {
    // console.log('Rendering product:', item);
    // console.log('Product Image URL before validation:', item.product_image);
    const productImageSource = (typeof item.product_image === 'string' && (item.product_image.startsWith('http://') || item.product_image.startsWith('https://') || item.product_image.startsWith('data:image')))
      ? { uri: item.product_image }
      : require('../assets/LogoGG.png');

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
            console.error('Product image loading error:', e.nativeEvent.error, 'for URL:', item.product_image);
            e.target.setNativeProps({
              source: require('../assets/LogoGG.png')
            });
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
        {banners.length > 0 && banners[bannerIndex] && (
          <View style={styles.bannerImgWrap}>
            <Image
              source={(() => {
                const bannerImg = banners[bannerIndex].image;
                // console.log('Banner Image URL before validation:', bannerImg); // Removed for long base64
                if (typeof bannerImg === 'string' && (bannerImg.startsWith('data:image') || bannerImg.startsWith('http://') || bannerImg.startsWith('https://'))) {
                  return { uri: bannerImg };
                } else {
                  // If it's not a valid URL or base64, fallback to default image
                  return require('../assets/LogoGG.png'); 
                }
              })()}
              style={styles.bannerImg}
              resizeMode="cover"
              onError={(e) => {
                console.error('Banner image loading error:', e.nativeEvent.error, 'for URL:', banners[bannerIndex].image);
                setBannerIndex((prevIndex) => (prevIndex + 1) % banners.length); // Try next banner on error
              }}
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
                styles.categoryTab,
                selectedCategory === 'All' && styles.selectedCategoryTab
              ]}
              onPress={() => setSelectedCategory('All')}
            >
              <View style={styles.categoryImageContainer}>
                <Image
                  source={require('../assets/LogoGG.png')}
                  style={styles.categoryImage}
                />
              </View>
              <Text style={[
                styles.categoryText,
                selectedCategory === 'All' && styles.selectedCategoryText
              ]}>Tất cả</Text>
            </TouchableOpacity>
            {categories.map((category) => (
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
                    source={(() => {
                      const categoryImg = category.category_image;
                      // console.log('Category Image URL before validation:', categoryImg); // Removed for long base64
                      if (typeof categoryImg === 'string' && (categoryImg.startsWith('http://') || categoryImg.startsWith('https://'))) {
                        return { uri: categoryImg };
                      }
                      return require('../assets/LogoGG.png');
                    })()}
                    style={styles.categoryImage}
                    onError={(e) => {
                      console.error('Category image loading error:', e.nativeEvent.error, 'for URL:', category.category_image);
                      e.target.setNativeProps({
                        source: require('../assets/LogoGG.png')
                      });
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
        <TouchableOpacity onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.bottomIcon}>🛒</Text>
        </TouchableOpacity>
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
  heartIcon: {
    fontSize: 20,
  },
  variantContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  variantButton: {
    padding: 5,
    margin: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedVariant: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  variantText: {
    fontSize: 12,
    color: '#333',
  },
});

export default HomeScreen; 