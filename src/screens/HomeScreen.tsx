import React, { useEffect, useState } from 'react';
import { View, Image, StyleSheet, SafeAreaView, Text, FlatList, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';

type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  SignUp: undefined;
  Home: undefined;
};

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
  navigation: HomeScreenNavigationProp;
}

const numColumns = 2;
const { width } = Dimensions.get('window');
const ITEM_WIDTH = width / numColumns - 24;



const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [banners, setBanners] = useState<any[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);

  useEffect(() => {
    fetch('http://192.168.1.5:3001/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch('http://192.168.1.5:3001/banners')
      .then(res => res.json())
      .then(data => setBanners(data));
  }, []);

  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setBannerIndex(idx => (idx + 1) % banners.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [banners]);

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
      <Text style={styles.price}>{item.price}</Text>
      <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
      <TouchableOpacity style={styles.heart}>
        <Text>♡</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, {justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>s7m store</Text>
        <TouchableOpacity>
          <Text style={styles.headerIcon}>🔍</Text>
        </TouchableOpacity>
      </View>
      {/* Banner */}
      {banners.length > 0 && banners[bannerIndex] && (
        <View style={styles.bannerImgWrap}>
          <Image
            source={{ uri: banners[bannerIndex].image }}
            style={styles.bannerImg}
            resizeMode="cover"
          />
        </View>
      )}
      {/* Top Tabs */}
      <View style={styles.tabs}>
        <Text style={styles.tabActive}>All</Text>
        <Text style={styles.tab}>Dresses</Text>
        <Text style={styles.tab}>Jackets & Blazers</Text>
        <Text style={styles.tab}>Coats</Text>
      </View>
      {/* Product Grid */}
      <FlatList
        data={products}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        numColumns={numColumns}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      {/* Bottom Navigation */}
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
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#222', letterSpacing: 1 },
  headerIcon: { fontSize: 26, color: '#222' },
  tabs: { flexDirection: 'row', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  tab: { marginRight: 16, color: '#888' },
  tabActive: { marginRight: 16, fontWeight: 'bold', color: '#000' },
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
});

export default HomeScreen;