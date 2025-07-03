import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; // Cần cài đặt: npm install @react-native-picker/picker
import { launchImageLibrary } from 'react-native-image-picker';
const RefundReturnScreen = () => {
  // State cho các trường trong form
  const [orderId, setOrderId] = useState('12345gb');
  const [productName, setProductName] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [imageUri, setImageUri] = useState(null); // Để lưu URI của ảnh đã chọn
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

   const selectImage = async () => {
    const options = {
        mediaType: 'photo',
        includeBase64: false,
        maxHeight: 2000,
        maxWidth: 2000,
    };
    launchImageLibrary(options, (response) => {
        if(response.didCancel){
            console.log('User cancelled image picker');
        }else if(response.errorCode){
            console.log('ImagePicker Error: ', response.error);
        Alert.alert('Lỗi', 'Có lỗi xảy ra khi chọn ảnh.');
        }else{
            const source = {uri: response.assets[0].uri};
             console.log('Image URI:', source.uri);
        setImageUri(source.uri);
        }
    })
   }

  // Hàm xử lý khi người dùng nhấn nút gửi yêu cầu
  const handleSubmit = () => {
    // Đây là nơi bạn sẽ thu thập tất cả dữ liệu từ state
    const formData = {
      orderId,
      productName,
      selectedReason,
      otherReason,
      imageUri,
      contactName,
      contactPhone,
      contactEmail,
    };
    console.log('Dữ liệu form gửi đi:', formData);

    // Sau đó, bạn sẽ gửi dữ liệu này lên API backend của mình
    // Ví dụ: callAPIToSubmitRefund(formData);

    Alert.alert('Thành công', 'Yêu cầu đổi trả/hoàn tiền của bạn đã được gửi.');
    // Có thể reset form sau khi gửi thành công
    // setOrderId('');
    // ...
  };

  return (
    <View style={styles.container}>
        <StatusBar backgroundColor='white' barStyle='dark-content'/>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>Đổi trả & Hoàn tiền</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Chính sách Đổi trả & Hoàn tiền */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Chính sách Đổi trả & Hoàn tiền</Text>
          <Text style={styles.policyText}>
            1. Thời gian đổi trả: Trong vòng 7 ngày kể từ ngày nhận hàng.
          </Text>
          <Text style={styles.policyText}>
            2. Điều kiện sản phẩm: Còn nguyên tem mác, chưa qua sử dụng, giặt ủi.
          </Text>
          <Text style={styles.policyText}>
            3. Quy trình: Vui lòng điền đầy đủ thông tin vào form bên dưới.
          </Text>
          <Text style={styles.policyText}>
            4. Liên hệ CSKH nếu có bất kỳ thắc mắc nào.
          </Text>
        </View>

        {/* Thông tin đơn hàng/sản phẩm */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Thông tin đơn hàng/sản phẩm</Text>
          <Text style={styles.label}>Mã đơn hàng:</Text>
          <TextInput
            style={styles.input}
            placeholder="Nhập mã đơn hàng của bạn"
            value={orderId}
            onChangeText={setOrderId}
            keyboardType="default"
          />

          <Text style={styles.label}>Tên sản phẩm (nếu cụ thể):</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Áo phông Basic size M"
            value={productName}
            onChangeText={setProductName}
          />
        </View>

        {/* Lý do đổi trả */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Lý do đổi trả:</Text>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={selectedReason}
              onValueChange={(itemValue) => setSelectedReason(itemValue)}
              style={styles.picker}
            >
              <Picker.Item label="--- Chọn lý do ---" value="" />
              <Picker.Item label="Size không vừa" value="size_issue" />
              <Picker.Item label="Sản phẩm bị lỗi" value="defective_product" />
              <Picker.Item label="Không ưng ý" value="not_satisfied" />
              <Picker.Item label="Gửi nhầm hàng" value="wrong_item" />
              <Picker.Item label="Lý do khác" value="other" />
            </Picker>
          </View>

          {selectedReason === 'other' && (
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Vui lòng nêu rõ lý do khác của bạn"
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={4}
            />
          )}
        </View>

        {/* Upload ảnh/video */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Ảnh/Video bằng chứng (Tùy chọn):</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={selectImage}>
            <Text style={styles.uploadButtonText}>Chọn ảnh/video</Text>
          </TouchableOpacity>
          {imageUri && <Image source={{ uri: imageUri }} style={styles.uploadedImage} />}
        </View>

        {/* Thông tin liên hệ (hiện khi cần) */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Thông tin liên hệ:</Text>
          <Text style={styles.label}>Họ và tên:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: Nguyễn Văn A"
            value={contactName}
            onChangeText={setContactName}
          />
          <Text style={styles.label}>Số điện thoại:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: 0987xxxxxx"
            value={contactPhone}
            onChangeText={setContactPhone}
            keyboardType="phone-pad"
          />
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            placeholder="Ví dụ: email@example.com"
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
          />
        </View>

        {/* Nút gửi yêu cầu */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Gửi yêu cầu đổi trả</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8', // Màu nền tổng thể
  },
  header: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
    elevation: 2,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10,
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
    height: 100, // Chiều cao cho TextInput đa dòng
    textAlignVertical: 'top', // Để text bắt đầu từ trên cùng trên Android
  },
  policyText: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 22,
    color: '#666',
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    marginBottom: 15,
    overflow: 'hidden', // Đảm bảo borderRadius hoạt động trên Android cho Picker
  },
  picker: {
    height: 50,
    width: '100%',
    color: '#333',
  },
  uploadButton: {
    backgroundColor: 'transparent', // Màu xanh dương
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 2
  },
  uploadButtonText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadedImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    resizeMode: 'cover',
    marginTop: 10,
    alignSelf: 'center', // Canh giữa ảnh
    borderWidth: 1,
    borderColor: '#eee',
  },
  submitButton: {
    backgroundColor: '#28a745', // Màu xanh lá cây
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default RefundReturnScreen;