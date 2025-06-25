import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, StatusBar } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
const ProfileScreen = () => {
  const navigation = useNavigation();
  return (
    <View style={{flex: 1}}>
      <StatusBar backgroundColor='white' barStyle='dark-content'/>
        <ScrollView style={styles.container}>
        <View style={styles.topBar}>
             <Ionicons name="chevron-back-outline" size={26} color="black" />
             <Text style={styles.title}>My account</Text>
             <Feather name="shopping-bag" size={24} color="black" />
        </View>

        <TouchableOpacity style={styles.prifile}>
            <Image style={styles.avatar} source={{uri: 'https://th.bing.com/th/id/OIP.yRVGvfVRlNtRvzxbCcGb7wHaJQ?rs=1&pid=ImgDetMain'}}/>
            <View>
                <Text style={styles.name}>Mesut Ozil</Text>
                <Text>mesutoz@gmail.com</Text>
            </View>
           
        </TouchableOpacity>
        <View style={{marginVertical: 12, paddingVertical: 5}}>
            <View style={styles.orderHistory}>
                <Text>Đơn mua</Text>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <Text>Xem lịch sử mua hàng</Text>
                <Ionicons name="chevron-forward" size={24} color="black" />
                </View>
            </View>

            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10}}>
                <TouchableOpacity style={styles.status}>
                         <Feather name="clock" size={24} color="black" />
                         <Text style={styles.textStatus}>Chờ xác nhận</Text>
                </TouchableOpacity>

                 <TouchableOpacity style={styles.status}>
                          <Feather name="package" size={24} color="black" />
                         <Text style={styles.textStatus}>Chờ lấy hàng</Text>
                </TouchableOpacity>

                 <TouchableOpacity style={styles.status}>
                        <Feather name="truck" size={24} color="black" />
                         <Text style={styles.textStatus}>Chờ giao hàng</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.status}>
                         <Feather name="check-circle" size={24} color="black" />
                         <Text style={styles.textStatus}>Đã nhận</Text>
                </TouchableOpacity>
            </View>
        </View>
     

      {/* ACTIVITY */}
      <Text style={styles.sectionTitle}>Activity</Text>
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.activityButton}>
           <Feather name="gift" size={24} color="white" />
          <Text style={styles.activityText}>Voucher</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.activityButton}>
          <Feather name="box" size={20} color="#fff" />
          <Text style={styles.activityText}>Đơn hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.activityButton}>
          <Feather name="star" size={20} color="#fff" />
          <Text style={styles.activityText}>Yêu thích</Text>
        </TouchableOpacity>
      </View>

      {/* Thay đổi địa chỉ */}
      <Text style={styles.sectionTitle}>Địa chỉ</Text>
      <TouchableOpacity style={styles.itemRow}>
        <Feather name="map-pin" size={20} color="black" />
        <Text style={styles.itemText}>Chỉnh sửa địa chỉ giao hàng</Text>
      </TouchableOpacity>

      {/* SUPPORT */}
      <Text style={styles.sectionTitle}>Support</Text>
      <View style={styles.supportGrid}>
        <TouchableOpacity style={styles.gridItem}>
          <Feather name="video" size={20} color="black" />
          <Text style={styles.gridText}>LiveStream</Text>
        </TouchableOpacity>
        <TouchableOpacity
        onPress={() => navigation.navigate('chat')}
        style={styles.gridItem}>
          <Feather name="message-circle" size={20} color="black" />
          <Text style={styles.gridText}>Chat with us</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem} onPress={() => navigation.navigate('change')}>
          <Feather name="lock" size={20} color="black" />
          <Text style={styles.gridText}>Đổi mật khẩu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem}>
          <Feather name="info" size={20} color="black" />
          <Text style={styles.gridText}>Thông tin cửa hàng</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.gridItem}>
          <Feather name="refresh-ccw" size={20} color="black" />
          <Text style={styles.gridText}>Đổi trả hàng</Text>
        </TouchableOpacity>
      </View>

      {/* SETTINGS */}
      <Text style={styles.sectionTitle}>Settings</Text>
      <TouchableOpacity style={styles.itemRow}>
        <Feather name="globe" size={20} color="black" />
        <Text style={styles.itemText}>Quên mật khẩu</Text>
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Settings</Text>
      <TouchableOpacity style={styles.itemRow}>
        <Feather name="globe" size={20} color="black" />
        <Text style={styles.itemText}>Location & Language</Text>
      </TouchableOpacity>
      


      {/* LOGOUT */}
      
    </ScrollView>
    <View style={styles.iconContainer}>
        {/* Home icon */}
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="home" size={24} color="black" />
        </TouchableOpacity>

        {/* Menu icon */}
       
        {/* Cart icon with notification */}
        <TouchableOpacity style={styles.iconButton}>
          
            <Feather name="shopping-bag" size={24} color="black" />
        
        </TouchableOpacity>

        {/* Heart icon */}
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="heart" size={24} color="black" />
        </TouchableOpacity>

         <TouchableOpacity style={styles.iconButton}>
          <Feather name="bell" size={24} color="black" />
        </TouchableOpacity>

        {/* User icon */}
        <TouchableOpacity style={styles.iconButton}>
          <Feather name="user" size={24} color="black" />
        </TouchableOpacity>
      </View>
    </View>
    
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    alignSelf: 'center',
  
  },
  sectionTitle: {
    fontWeight: '600',
    fontSize: 16,
    marginTop: 25,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  activityButton: {
    backgroundColor: 'black',
    padding: 12,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  activityText: {
    color: 'white',
    fontSize: 13,
    marginTop: 5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
  },
  itemText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#000',
  },
  supportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  gridText: {
    marginLeft: 10,
    fontSize: 14,
  },
  logout: {
    marginTop: 30,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 16,
    color: '#555',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20
  },
    prifile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    },
    name: {
       fontSize: 18
    },
    orderHistory: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    textStatus: {
        fontSize: 12
    },
    status: {
        justifyContent: 'center',
        alignItems: 'center'
    },
     iconContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingVertical: 15
   
  },
  iconButton: {
    alignItems: 'center',
  },
 
  
});

export default ProfileScreen;
