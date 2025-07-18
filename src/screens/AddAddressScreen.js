import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Image,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Checkbox } from 'react-native-paper';
import { API_ENDPOINTS, API_HEADERS, API_TIMEOUT } from '../config/api';
import { useLocationData } from '../hooks/useLocationData';
import Geolocation from '@react-native-community/geolocation';

const GOOGLE_API_KEY = 'AIzaSyB7ETOwK6NMmiPXlHUAThIjfDbCxXq_A6c';

const AddAddressScreen = ({ route }) => {
  const navigation = useNavigation();
  const { provinces, wards, loading, loadWardsByProvince } = useLocationData();
  
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [loadingWard, setLoadingWard] = useState(false);
  const [error, setError] = useState(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [addressDetail, setAddressDetail] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [latitude, setLatitude] = useState(21.028511); // Hà Nội mặc định
  const [longitude, setLongitude] = useState(105.804817);

  // Set province đầu tiên khi provinces được load
  useEffect(() => {
    // Không tự động chọn tỉnh đầu tiên nữa
    // if (provinces.length > 0 && !selectedProvince) {
    //   setSelectedProvince(provinces[0].id);
    // }
  }, [provinces]);

  // Load wards khi province thay đổi
  useEffect(() => {
    if (selectedProvince) {
      loadWardsForProvince(selectedProvince);
    }
  }, [selectedProvince]);

  // Set ward đầu tiên khi wards được load
  useEffect(() => {
    if (wards.length > 0 && !selectedWard) {
      setSelectedWard(wards[0].id);
    }
  }, [wards, selectedWard]);

  const loadWardsForProvince = async (provinceId) => {
    try {
      setLoadingWard(true);
      setSelectedWard('');
      await loadWardsByProvince(provinceId);
    } catch (err) {
      setError('Không thể tải danh sách xã/phường');
      Alert.alert('Lỗi', 'Không thể tải danh sách xã/phường');
    } finally {
      setLoadingWard(false);
    }
  };

  useEffect(() => {
    if (route.params?.selectedLat && route.params?.selectedLng) {
      setLatitude(route.params.selectedLat);
      setLongitude(route.params.selectedLng);
    }
  }, [route.params?.selectedLat, route.params?.selectedLng]);

  const validate = () => {
    if (!fullName.trim() || !phoneNumber.trim() || !addressDetail.trim() || !selectedProvince || !selectedWard) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin.');
      return false;
    }
    if (!/^0\d{9}$/.test(phoneNumber.trim())) {
      Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      const userInfo = JSON.parse(userInfoString);
      if (!userInfo || !userInfo._id) throw new Error('Không tìm thấy thông tin người dùng');
      
      // Lấy tên tỉnh và xã từ SQLite data
      const provinceName = provinces.find(p => p.id === selectedProvince)?.name || '';
      const provinceType = provinces.find(p => p.id === selectedProvince)?.type || '';
      const wardName = wards.find(w => w.id === selectedWard)?.name || '';
      const wardType = wards.find(w => w.id === selectedWard)?.type || '';
      
      // Địa chỉ chi tiết: {addressDetail}, {wardName} {wardType}, {provinceName}
      const fullAddress = `${addressDetail}, ${wardType} ${wardName}, ${provinceType} ${provinceName}`;
      
      const body = {
        fullName: fullName.trim(),
        addressDetail: fullAddress,
        phone_number: phoneNumber.trim(),
        is_default: isDefault,
        latitude,
        longitude
      };
      
      const response = await fetch(API_ENDPOINTS.ADDRESS.CREATE(userInfo._id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const errData = await response.json();
        console.log('Lỗi khi thêm địa chỉ:', errData);
        throw new Error(errData.message || 'Không thể thêm địa chỉ');
      }
      
      const result = await response.json();
      console.log('Thêm địa chỉ thành công:', result);
      Alert.alert('Thành công', 'Đã thêm địa chỉ mới!', [
        { text: 'OK', onPress: () => navigation.navigate('Address', { refresh: true }) }
      ]);
    } catch (err) {
      console.log('Lỗi khi lưu địa chỉ:', err);
      Alert.alert('Lỗi', err.message || 'Không thể lưu địa chỉ.');
    } finally {
      setSaving(false);
    }
  };

  const handleChooseLocation = () => {
    const lat = latitude || 21.028511;
    const lng = longitude || 105.804817;
    navigation.navigate('MapScreen', {
      latitude: lat,
      longitude: lng,
      fromScreen: 'AddAddress',
      addressDetail,
      selectedWard,
      selectedProvince,
      wards,
      provinces,
    });
  };

  // Sắp xếp và nhóm tỉnh/thành phố theo chữ cái đầu
  const sortedProvinces = [...provinces].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const provincePickerItems = [
    <Picker.Item
      key="province-placeholder"
      label="Tỉnh/Thành phố"
      value=""
      color="#888"
      enabled={false}
    />
  ];
  let lastProvinceChar = '';
  sortedProvinces.forEach((province) => {
    const firstChar = province.name[0].toUpperCase();
    if (firstChar !== lastProvinceChar) {
      provincePickerItems.push(
        <Picker.Item
          key={`header-province-${firstChar}`}
          label={`--- ${firstChar} ---`}
          value={`_header_province_${firstChar}`}
          enabled={false}
          color="#888"
        />
      );
      lastProvinceChar = firstChar;
    }
    provincePickerItems.push(
      <Picker.Item
        key={province.id}
        label={`${province.name} (${province.type})`}
        value={province.id}
        color="#000"
      />
    );
  });

  // Sắp xếp và nhóm xã/phường theo chữ cái đầu
  const sortedWards = [...wards].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const wardPickerItems = [];
  let lastWardChar = '';
  sortedWards.forEach((ward) => {
    const firstChar = ward.name[0].toUpperCase();
    if (firstChar !== lastWardChar) {
      wardPickerItems.push(
        <Picker.Item
          key={`header-ward-${firstChar}`}
          label={`--- ${firstChar} ---`}
          value={`_header_ward_${firstChar}`}
          enabled={false}
          color="#888"
        />
      );
      lastWardChar = firstChar;
    }
    wardPickerItems.push(
      <Picker.Item
        key={ward.id}
        label={`${ward.name} (${ward.type})`}
        value={ward.id}
        color="#000"
      />
    );
  });

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
        <Text style={[styles.headerTitle, {color: '#000'}]}>Thêm địa chỉ mới</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#000" />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <>
          {/* Province */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Tỉnh/Thành phố</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedProvince}
                onValueChange={(itemValue) => setSelectedProvince(itemValue)}
                style={styles.picker}
              >
                {provincePickerItems}
              </Picker>
            </View>
          </View>
          
          {/* Ward */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Xã/Phường</Text>
            <View style={styles.pickerWrapper}>
              {loadingWard ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                selectedProvince && wardPickerItems.length > 0 ? (
                  <Picker
                    selectedValue={selectedWard}
                    onValueChange={(itemValue) => setSelectedWard(itemValue)}
                    style={styles.picker}
                  >
                    {wardPickerItems}
                  </Picker>
                ) : null
              )}
            </View>
          </View>
          
          {/* Address detail */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Địa chỉ cụ thể</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập địa chỉ cụ thể"
              value={addressDetail}
              onChangeText={setAddressDetail}
            />
          </View>
          
          {/* Full name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Họ tên</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập họ tên"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>
          
          {/* Phone number */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập số điện thoại"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              maxLength={10}
            />
          </View>
          
          {/* Default address checkbox */}
          <View style={styles.checkboxRow}>
            <Checkbox
              status={isDefault ? 'checked' : 'unchecked'}
              onPress={() => setIsDefault(!isDefault)}
            />
            <Text style={styles.checkboxLabel}>Đặt làm địa chỉ mặc định</Text>
          </View>
          
          {/* Save button */}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveBtnText}>{saving ? 'Đang lưu...' : 'Lưu địa chỉ'}</Text>
          </TouchableOpacity>
          
          {/* Map button */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: '#2196F3', marginBottom: 10 }]}
            onPress={handleChooseLocation}
          >
            <Text style={styles.saveBtnText}>Chọn vị trí trên bản đồ</Text>
          </TouchableOpacity>
          
          {/* Coordinates display */}
          <View style={{ alignItems: 'center', marginBottom: 10 }}>
            <Text>Latitude: {latitude}</Text>
            <Text>Longitude: {longitude}</Text>
          </View>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E3E4E5',
    backgroundColor: '#fff',
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
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  picker: {
    height: 48,
    width: '100%',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E3E4E5',
    borderRadius: 6,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginVertical: 16,
  },
  saveBtn: {
    backgroundColor: '#000',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
});

export default AddAddressScreen;
