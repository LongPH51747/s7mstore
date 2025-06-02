import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  ActivityIndicator, // Để hiển thị loading
} from 'react-native';
// Nếu bạn muốn dùng icon quay lại, bạn cần cài đặt thư viện react-native-vector-icons
// Ví dụ: npm install react-native-vector-icons
// import Icon from 'react-native-vector-icons/Ionicons';

const AddAddressScreen = ({ navigation }) => { // Thêm navigation nếu bạn dùng React Navigation
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [ward, setWard] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [addressType, setAddressType] = useState('home'); // 'home' hoặc 'office'
  const [isLoading, setIsLoading] = useState(false); // State cho loading indicator

  // Hàm xử lý khi người dùng nhấn nút lưu địa chỉ
  const handleSaveAddress = async () => {
    // 1. Validation cơ bản
    if (!fullName.trim() || !phoneNumber.trim() || !streetAddress.trim() || !province.trim() || !district.trim() || !ward.trim()) {
      Alert.alert('Lỗi', 'Vui lòng điền đầy đủ tất cả các trường.');
      return;
    }

    // Bạn có thể thêm validation regex cho số điện thoại, email nếu có
    // Ví dụ: if (!/^\d{10}$/.test(phoneNumber)) { Alert.alert('Lỗi', 'Số điện thoại không hợp lệ.'); return; }

    setIsLoading(true); // Bắt đầu hiển thị loading

    try {
      // 2. Thu thập dữ liệu form
      const newAddress = {
        fullName,
        phoneNumber,
        streetAddress,
        province, // Trong thực tế, đây có thể là ID của tỉnh/TP
        district, // ID của quận/huyện
        ward,     // ID của phường/xã
        isDefault,
        addressType,
      };

      console.log('Dữ liệu địa chỉ gửi đi:', newAddress);

      // 3. Gọi API để lưu địa chỉ
      // Đây là phần bạn sẽ thay thế bằng cuộc gọi API thực tế của mình
      // Ví dụ:
      // const response = await fetch('YOUR_API_ENDPOINT_TO_SAVE_ADDRESS', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': 'Bearer YOUR_AUTH_TOKEN', // Nếu cần xác thực
      //   },
      //   body: JSON.stringify(newAddress),
      // });

      // const data = await response.json();

      // if (response.ok) {
      //   Alert.alert('Thành công', 'Địa chỉ đã được lưu.');
      //   // Điều hướng về màn hình trước đó hoặc màn hình danh sách địa chỉ
      //   if (navigation) {
      //     navigation.goBack();
      //   }
      // } else {
      //   Alert.alert('Lỗi', data.message || 'Không thể lưu địa chỉ. Vui lòng thử lại.');
      // }

      // Giả lập thời gian gọi API (2 giây)
      await new Promise(resolve => setTimeout(resolve, 2000));
      Alert.alert('Thành công', 'Địa chỉ đã được lưu.');
      if (navigation) {
        navigation.goBack();
      }

    } catch (error) {
      console.error('Lỗi khi lưu địa chỉ:', error);
      Alert.alert('Lỗi', 'Đã có lỗi xảy ra. Vui lòng thử lại sau.');
    } finally {
      setIsLoading(false); // Kết thúc hiển thị loading
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {/* Nút quay lại (nếu sử dụng react-navigation) */}
        {/* <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity> */}
        <Text style={styles.headerText}>Thêm địa chỉ mới</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Phần nhập thông tin chi tiết */}
        <View style={styles.sectionContainer}>
          <Text style={styles.label}>Họ và tên người nhận:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Nguyễn Văn A"
            value={fullName}
            onChangeText={setFullName}
          />

          <Text style={styles.label}>Số điện thoại:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 0987xxxxxx"
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Địa chỉ cụ thể (Số nhà, tên đường, thôn/xóm):</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Ví dụ: Số 1, ngõ 2, đường ABC"
            value={streetAddress}
            onChangeText={setStreetAddress}
            multiline
            numberOfLines={3}
            textAlignVertical="top" // Để text bắt đầu từ trên cùng trên Android
          />

          {/* Các trường chọn Tỉnh/Thành phố, Quận/Huyện, Phường/Xã */}
          {/* Trong ứng dụng thực tế, bạn sẽ dùng Picker hoặc các thư viện dropdown/autocomplete để chọn từ danh sách API */}
          <Text style={styles.label}>Tỉnh/Thành phố:</Text>
          <TextInput
            style={styles.input}
            placeholder="Chọn Tỉnh/Thành phố"
            value={province}
            onChangeText={setProvince} // Trong thực tế sẽ gọi hàm mở Picker/Dropdown
          />

          <Text style={styles.label}>Quận/Huyện:</Text>
          <TextInput
            style={styles.input}
            placeholder="Chọn Quận/Huyện"
            value={district}
            onChangeText={setDistrict}
          />

          <Text style={styles.label}>Phường/Xã:</Text>
          <TextInput
            style={styles.input}
            placeholder="Chọn Phường/Xã"
            value={ward}
            onChangeText={setWard}
          />

          {/* Tùy chọn Địa chỉ mặc định */}
          <View style={styles.optionRow}>
            <Text style={styles.label}>Đặt làm địa chỉ mặc định:</Text>
            <Switch
              trackColor={{ false: '#767577', true: '#81b0ff' }} // Màu khi tắt/bật
              thumbColor={isDefault ? '#007bff' : '#f4f3f4'} // Màu nút trượt
              ios_backgroundColor="#3e3e3e"
              onValueChange={setIsDefault}
              value={isDefault}
            />
          </View>

          {/* Tùy chọn Loại địa chỉ (Nhà riêng/Cơ quan) */}
          <View style={styles.optionRow}>
            <Text style={styles.label}>Loại địa chỉ:</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  addressType === 'home' && styles.radioOptionSelected,
                ]}
                onPress={() => setAddressType('home')}
              >
                <Text
                  style={addressType === 'home' && styles.radioTextSelected}
                >
                  Nhà riêng
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.radioOption,
                  addressType === 'office' && styles.radioOptionSelected,
                ]}
                onPress={() => setAddressType('office')}
              >
                <Text
                  style={addressType === 'office' && styles.radioTextSelected}
                >
                  Cơ quan
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Nút lưu địa chỉ */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSaveAddress}
        disabled={isLoading} // Vô hiệu hóa nút khi đang loading
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" /> // Hiển thị loading spinner
        ) : (
          <Text style={styles.saveButtonText}>Lưu địa chỉ</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8', // Màu nền tổng thể
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  // backButton: { // Style cho nút back nếu có
  //   marginRight: 10,
  //   padding: 5,
  // },
  headerText: {
    flex: 1, // Để tiêu đề căn giữa nếu có nút back, hoặc chiếm hết chiều rộng nếu không
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center', // Căn giữa tiêu đề
  },
  scrollContent: {
    paddingVertical: 20,
    paddingHorizontal: 15,
  },
  sectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 15,
    color: '#333',
    backgroundColor: '#fff',
  },
  multilineInput: {
    height: 90, // Tăng chiều cao cho TextInput đa dòng
    textAlignVertical: 'top', // Để text bắt đầu từ trên cùng trên Android
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  radioGroup: {
    flexDirection: 'row',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  radioOption: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#f0f0f0',
  },
  radioOptionSelected: {
    backgroundColor: '#007bff', // Màu xanh khi chọn
  },
  radioTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  saveButton: {
    backgroundColor: '#007bff', // Màu xanh dương
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 20, // Khoảng cách với đáy SafeAreaView
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default AddAddressScreen;