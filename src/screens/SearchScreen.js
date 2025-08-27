/**
 * Màn hình Tìm kiếm (Search Screen)
 * 
 * Màn hình này cho phép người dùng tìm kiếm sản phẩm với các chức năng:
 * - Nhập từ khóa tìm kiếm
 * - Hiển thị lịch sử tìm kiếm
 * - Hiển thị gợi ý tìm kiếm
 * - Chuyển đến màn hình kết quả tìm kiếm
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Keyboard,
  ActivityIndicator,
  Image,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT, API_BASE_URL } from '../config/api';

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

const SearchScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHistory, setSearchHistory] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recommendedProducts, setRecommendedProducts] = useState([]);
  const [loadingRecommended, setLoadingRecommended] = useState(true);

  useEffect(() => {
    loadSearchHistory();
    fetchRecommendedProducts();
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch suggestions when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim()) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [debouncedQuery]);

  const loadSearchHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('searchHistory');
      if (history) {
        setSearchHistory(JSON.parse(history));
      }
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };

  const saveSearchHistory = async (query) => {
    try {
      const newHistory = [query, ...searchHistory.filter(item => item !== query)].slice(0, 10);
      await AsyncStorage.setItem('searchHistory', JSON.stringify(newHistory));
      setSearchHistory(newHistory);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };

 const fetchSuggestions = async () => {
  try {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const url = `${API_ENDPOINTS.PRODUCTS.SEARCH}?q=${encodeURIComponent(debouncedQuery)}`;
    console.log('Đang gửi yêu cầu gợi ý tới:', url);

    const response = await fetch(url, {
      headers: API_HEADERS,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Không thể lấy gợi ý: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Dữ liệu gợi ý:', data);
    // Ưu tiên các sản phẩm có tên bắt đầu bằng truy vấn, sau đó chứa truy vấn
    const normalizedQuery = debouncedQuery.toLowerCase();
    const sorted = Array.isArray(data)
      ? [...data].sort((a, b) => {
          const an = (a?.product_name || '').toLowerCase();
          const bn = (b?.product_name || '').toLowerCase();
          const aStarts = an.startsWith(normalizedQuery) ? 1 : 0;
          const bStarts = bn.startsWith(normalizedQuery) ? 1 : 0;
          if (aStarts !== bStarts) return bStarts - aStarts;
          const aIncl = an.includes(normalizedQuery) ? 1 : 0;
          const bIncl = bn.includes(normalizedQuery) ? 1 : 0;
          if (aIncl !== bIncl) return bIncl - aIncl;
          return 0;
        })
      : [];
    setSuggestions(sorted.slice(0, 5));
  } catch (error) {
    console.error('Lỗi khi lấy gợi ý:', error);
    if (error.name === 'AbortError') {
      Alert.alert('Lỗi', 'Thời gian tìm kiếm đã hết. Vui lòng thử lại.');
    } else {
      Alert.alert('Lỗi', `Không thể tải gợi ý tìm kiếm: ${error.message}`);
    }
    setSuggestions([]);
  } finally {
    setLoading(false);
  }
};

  const handleSearch = () => {
    if (searchQuery.trim()) {
      saveSearchHistory(searchQuery.trim());
              navigation.navigate('SearchResultsScreen', { searchQuery: searchQuery.trim() });
      Keyboard.dismiss();
    }
  };

  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.removeItem('searchHistory');
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const fetchRecommendedProducts = async () => {
    try {
      setLoadingRecommended(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(API_ENDPOINTS.PRODUCTS.GET_ALL_LIMIT, {
        headers: API_HEADERS,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Failed to fetch recommended products');
      }

      const data = await response.json();
      // Get 4 random products from the response
      const randomProducts = data.data
        .sort(() => 0.5 - Math.random())
        .slice(0, 4);
      setRecommendedProducts(randomProducts);
    } catch (error) {
      console.error('Error fetching recommended products:', error);
    } finally {
setLoadingRecommended(false);
    }
  };

  const renderRecommendedProduct = ({ item }) => {
    const productImageSource = getImageSource(item.product_image);

    return (
      <TouchableOpacity 
        style={styles.recommendedCard}
        onPress={() => navigation.navigate('ProductDetailScreen', { product: item })}
      >
        <Image 
          source={productImageSource} 
          style={styles.recommendedImage} 
          resizeMode="cover"
          onError={(e) => {
            e.target.setNativeProps({ source: require('../assets/errorimg.webp') });
          }}
        />
        <Text style={styles.recommendedPrice}>{item.product_price?.toLocaleString('vi-VN')}đ</Text>
        <Text style={styles.recommendedName} numberOfLines={2}>{item.product_name}</Text>
        <TouchableOpacity style={styles.recommendedHeart}>
          <Text style={styles.heartIcon}>♡</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.historyItem}
      onPress={() => {
        setSearchQuery(item);
        navigation.navigate('SearchResultsScreen', { searchQuery: item });
      }}
    >
      <Icon name="time-outline" size={20} color="#666" />
      <Text style={styles.historyText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButton}>Hủy</Text>
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      )}

      {/* Search History */}
      {!searchQuery && searchHistory.length > 0 && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Tìm kiếm gần đây</Text>
            <TouchableOpacity onPress={clearSearchHistory}>
              <Text style={styles.clearButton}>Xóa tất cả</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={searchHistory}
            renderItem={renderHistoryItem}
keyExtractor={(item, index) => index.toString()}
          />
        </View>
      )}

      {/* Suggestions */}
      {searchQuery && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.suggestionsTitle}>Gợi ý tìm kiếm</Text>
          <FlatList
            data={suggestions}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => {
                  setSearchQuery(item.product_name);
                  navigation.navigate('SearchResultsScreen', { searchQuery: item.product_name });
                }}
              >
                <Text style={styles.suggestionText}>{item.product_name}</Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item._id}
          />
        </View>
      )}

      {/* Recommended Products */}
      {!searchQuery && (
        <View style={styles.recommendedContainer}>
          <Text style={styles.recommendedTitle}>Sản phẩm đề xuất</Text>
          {loadingRecommended ? (
            <View style={styles.loadingRecommended}>
              <ActivityIndicator size="small" color="#000" />
            </View>
          ) : (
            <FlatList
              data={recommendedProducts}
              renderItem={renderRecommendedProduct}
              keyExtractor={item => item._id}
              numColumns={numColumns}
              contentContainerStyle={styles.recommendedList}
              scrollEnabled={false}
            />
          )}
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  historyContainer: {
    padding: 16,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    color: '#007AFF',
    fontSize: 14,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
suggestionItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
  },
  recommendedContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  recommendedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingRecommended: {
    padding: 20,
    alignItems: 'center',
  },
  recommendedList: {
    padding: 4,
  },
  recommendedCard: {
    width: ITEM_WIDTH,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 8,
    elevation: 2,
    position: 'relative',
  },
  recommendedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  recommendedPrice: {
    fontWeight: 'bold',
    marginTop: 8,
  },
  recommendedName: {
    color: '#444',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
  },
  recommendedHeart: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  heartIcon: {
    fontSize: 20,
  },
});

export default SearchScreen;