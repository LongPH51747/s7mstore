import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert,
    Image, 
    Modal,
    Dimensions,
    StatusBar
} from 'react-native';
import { useSocket } from '../contexts/SocketContext';
import moment from 'moment';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker'; // Import image picker
import { API_BASE_URL } from '../config/api'; // Import base URL
import ImageMessage from '../components/ImageMessage';

const UserChatScreen = () => {
    const {
        isSocketReady,
        messages,
        isLoadingMessages,
        messagesError,
        sendMessage, // Updated function name
        user,
        loadingAuth,
        currentUserChatRoomId,
        markMessagesAsRead,
        socket
    } = useSocket();

    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState(null); // State for selected image
    const flatListRef = useRef(null);
    const currentUserId = user?._id;
    const [selectedImageForViewer, setSelectedImageForViewer] = useState(null); // State cho ảnh đang xem
    const [isImageViewerVisible, setIsImageViewerVisible] = useState(false); // State để điều khiển hiển thị trình xem ảnh
    const navigation = useNavigation();

    // Clear selected image when chat room changes
    useEffect(() => {
        setSelectedImage(null);
    }, [currentUserChatRoomId]);

    useFocusEffect(
        useCallback(() => {
            if (isSocketReady && currentUserChatRoomId && currentUserId && messages.length > 0) {
                const unreadMessageIds = messages
                    .filter(msg => !msg.readBy.includes(currentUserId) && msg.sender?._id !== currentUserId)
                    .map(msg => msg._id);

                if (unreadMessageIds.length > 0) {
                    markMessagesAsRead(unreadMessageIds, currentUserChatRoomId);
                }
            }
            return () => {};
        }, [isSocketReady, currentUserChatRoomId, currentUserId, messages, markMessagesAsRead])
    );

    useEffect(() => {
        if (messagesError && messagesError.message) {
            console.log("Chat error: ", messagesError.message);
        }
    }, [messagesError]);

        const imagePickerOptions = {
            mediaType: 'photo',
            quality: 0.8,
            maxWidth: 1024,
            maxHeight: 1024,
        };
    const handleChoosePhoto = () => {
       
        launchImageLibrary(imagePickerOptions, (response) => {
            if (response.didCancel) {
                console.log('User cancelled image picker');
            } else if (response.errorCode) {
                console.log('ImagePicker Error: ', response.errorMessage);
                Alert.alert('Lỗi', 'Không thể chọn ảnh. Vui lòng thử lại.');
            } else if (response.assets && response.assets.length > 0) {
                const source = { uri: response.assets[0].uri, type: response.assets[0].type, name: response.assets[0].fileName };
                setSelectedImage(source);
            }
        });
    };

    const handleTakePhoto = () => {
        launchCamera(imagePickerOptions, (response) => {
            if(response.didCancel){
                console.log("User cancelled camera");
            }else if(response.errorCode){
                console.log('ImagePicker Error (Camera): ', response.errorMessage);
                Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng kiểm tra quyền truy cập camera.');
            }else if(response.assets && response.assets.length > 0){
                const asset = response.assets[0];
                const source = {uri: asset.uri, type: asset.type, name: asset.fileName || 'camera_photo.jpg'};
                setSelectedImage(source)
            }
        })
    }

    const uploadImage = async (image) => {
        const formData = new FormData();
        formData.append('image', {
            uri: image.uri,
            type: image.type,
            name: image.name || 'photo.jpg',
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const data = await response.json();
            if (response.ok) {
                return data.url;
            } else {
                Alert.alert('Lỗi Upload', data.message || 'Không thể tải ảnh lên.');
                return null;
            }
        } catch (error) {
            console.error('Upload Error:', error);
            Alert.alert('Lỗi Mạng', 'Không thể kết nối đến máy chủ để tải ảnh lên.');
            return null;
        }
    };

    const handleSend = async () => {
        if (selectedImage) {
            const imageUrl = await uploadImage(selectedImage);
            if (imageUrl) {
                sendMessage({
                    content: newMessage, // Gửi kèm text dưới dạng caption
                    messageType: 'image',
                    mediaUrl: imageUrl,
                });
                setSelectedImage(null);
                setNewMessage('');
            }
        } else if (newMessage.trim()) {
            sendMessage({
                content: newMessage,
                messageType: 'text',
            });
            setNewMessage('');
        }
    };

    const handleImagePress = (imageUrl) => {
        setSelectedImageForViewer(imageUrl);
        setIsImageViewerVisible(true);
    };

    const handleDeleteMessage = useCallback((messageId, senderIdOfMessage) => {
        if(!user || user._id !== senderIdOfMessage){
            Alert.alert("Không có quyền", "Bạn chỉ có thể xóa tin nhắn của chính mình.");
            return; 
        }
        Alert.alert(
            "Xóa tin nhắn", 
            "Bạn có chắc muốn xóa tin nhắn này không?", 
            [
                {text: 'Hủy', style: 'cancel'},
                {text: 'Xóa', 
                 onPress: ()=> {
                    if(socket && user && currentUserChatRoomId){
                       console.log(`[UserChatScreen] Đang gửi yêu cầu xóa tin nhắn ID: ${messageId} trong phòng ${currentUserChatRoomId}`);
                        socket.emit('delete_message', { messageId, chatRoomId: currentUserChatRoomId });
                    }else{
                        let errorMessage = 'Không thể xóa tin nhắn. ';
                        if (!socket) errorMessage += 'Socket chưa sẵn sàng. ';
                        if (!user) errorMessage += 'Người dùng chưa được xác định. ';
                        if (!currentUserChatRoomId) errorMessage += 'Phòng chat chưa xác định. ';
                        Alert.alert('Lỗi', errorMessage + 'Vui lòng thử lại.');
                        console.error('Lỗi xóa tin nhắn (client):', { socketReady: !!socket, userExists: !!user, chatRoomIdExists: !!currentUserChatRoomId });
                    }
                 }
                }
            ], {cancelable:  true}
        )
    }, [socket, user, currentUserChatRoomId])

    const renderMessage = useCallback(({ item: msg, user, handleDeleteMessage, handleImagePress }) => {
        const isAdmin = msg.sender?.role === 'admin';
        const isUser = !isAdmin;
        const displayTime = moment(msg.createdAt || msg.timestamp).format('HH:mm DD/MM');
        const defaultAvatarUrl = `https://www.gravatar.com/avatar/${msg.sender?.email ? encodeURIComponent(msg.sender.email) : 'default'}?d=mp&s=200`;
        const avatarSource = msg.sender?.avatar ? { uri: msg.sender.avatar } : { uri: defaultAvatarUrl };
        const isMyMessage = msg.sender?._id === user?._id;
        console.log("msg.sender?._id:", msg.sender?._id);
    console.log("user?._id:", user?._id);
    console.log("isMyMessage:", isMyMessage);
    console.log("Full User Object:", user);

        return (
            <View style={{
                flexDirection: isAdmin ? 'row' : 'row-reverse',
                alignItems: 'flex-end',
                marginBottom: 10,
                
                
            }}>
                <Image source={avatarSource} style={styles.avatar} />
                {/* Logic mới để điều khiển bubble cho text và ảnh */}
                {msg.messageType === 'image' && msg.mediaUrl ? (
                    // Nếu là tin nhắn ảnh, không áp dụng messageBubble
                    <View style={isAdmin ? styles.adminImageContainer : styles.userImageContainer}>
                        <TouchableOpacity
                        style={[styles.image1, {
                            //  flexDirection: isAdmin ? 'row' : 'row-reverse',
                        }]}
                        onLongPress={() => {
                            if (isMyMessage) {
                handleDeleteMessage(msg._id, msg.sender?._id);
            } else {
                Alert.alert("Không có quyền", "Bạn chỉ có thể xóa tin nhắn của chính mình.");
            }
                        }}
                        onPress={() => handleImagePress(msg.mediaUrl)}>
                           <ImageMessage imageUrl={msg.mediaUrl} /> 
                        </TouchableOpacity>
                        
                        {/* Nếu có nội dung văn bản kèm ảnh (caption) */}
                        {msg.content && msg.content.trim() !== '' && (
                             <Text style={
                                isAdmin ? styles.adminImageCaption : styles.userImageCaption
                            }>
                                {msg.content}
                            </Text>
                        )}
                        <View style={[
                            styles.messageInfoRow,
                            isAdmin ? styles.adminMessageInfoRow : styles.userMessageInfoRow // Thêm style riêng cho info row của ảnh
                        ]}>
                            <Text style={[
                                styles.messageTime,
                                { color: isAdmin ? '#718096' : 'rgba(255,255,255,0.7)' }
                            ]}>
                                {displayTime}
                            </Text>
                            {isUser && (
                                <View style={styles.messageStatusContainer}>
                                    {msg.status === 'pending' && <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={styles.statusIcon} />}
                                    {msg.status === 'sent' && <Icon name="checkmark-done-sharp" size={14} color="rgba(255,255,255,0.7)" style={styles.statusIcon} />}
                                    {msg.status === 'failed' && <Icon name="warning-outline" size={14} color="#ef4444" style={styles.statusIcon} />}
                                </View>
                            )}
                        </View>
                    </View>
                ) : (
                    // Nếu là tin nhắn văn bản, áp dụng messageBubble
                    <View style={[
                        styles.messageBubble,
                        {
                            backgroundColor: isAdmin ? '#e2e8f0' : '#9be9ffff',
                            alignSelf: isAdmin ? 'flex-start' : 'flex-end',
                        }
                    ]}>
                        {isAdmin && msg.sender?.fullname && (
                            <Text style={styles.senderName}>{msg.sender.fullname}</Text>
                        )}
                        <Text style={[
                            styles.messageContent,
                            { color: isAdmin ? '#2d3748' : '#fff' }
                        ]}>{msg.content}</Text>
                        <View style={styles.messageInfoRow}>
                            <Text style={[
                                styles.messageTime,
                                { color: isAdmin ? '#718096' : 'rgba(255,255,255,0.7)' }
                            ]}>
                                {displayTime}
                            </Text>
                            {isUser && (
                                <View style={styles.messageStatusContainer}>
                                    {msg.status === 'pending' && <ActivityIndicator size="small" color="rgba(255,255,255,0.7)" style={styles.statusIcon} />}
                                    {msg.status === 'sent' && <Icon name="checkmark-done-sharp" size={14} color="rgba(255,255,255,0.7)" style={styles.statusIcon} />}
                                    {msg.status === 'failed' && <Icon name="warning-outline" size={14} color="#ef4444" style={styles.statusIcon} />}
                                </View>
                            )}
                        </View>
                    </View>
                )}
            </View>
        );
    }, [user, handleDeleteMessage, handleImagePress]);

    if (loadingAuth || !isSocketReady) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>
                    {loadingAuth ? 'Loading login information...' : 'Connecting to chat server...'}
                </Text>
            </SafeAreaView>
        );
    }

    if (isLoadingMessages) {
        return (
            <SafeAreaView style={styles.statusContainer}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>Loading chat history...</Text>
            </SafeAreaView>
        );
    }



    return (
        <View style={styles.safeArea}>
            <StatusBar backgroundColor='transparent' translucent  />
            <KeyboardAvoidingView
                style={styles.keyboardAvoidingView}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={()=> navigation.goBack()} style={{marginTop: 15}}>
                    <Icon name="arrow-back" size={24} color="#000000ff" />
                    </TouchableOpacity>
                     <Image style={styles.logo} source={require('../assets/LogoS7MStore.png')}/>
                   <Text style={styles.s7m}>S7M Store</Text>
                   
                </View>

                <FlatList
                    ref={flatListRef}
                    data={messages}
                   renderItem={({ item }) => renderMessage({ item, user: user, handleDeleteMessage: handleDeleteMessage, handleImagePress: handleImagePress })}
                    keyExtractor={(item, index) => item._id?.toString() || `index-${index}`}
                    contentContainerStyle={{ paddingHorizontal: 8, paddingVertical: 15 }}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={() => (
                        <View style={styles.noMessagesContainer}>
                            <Text style={styles.noMessagesText}>No messages yet. Start a conversation!</Text>
                        </View>
                    )}
                />

                {/* Image Preview Area */}
                {selectedImage && (
                    <View style={styles.previewContainer}>
                        <Image source={{ uri: selectedImage.uri }} style={styles.previewImage} />
                        <TouchableOpacity onPress={() => setSelectedImage(null)} style={styles.removeImageButton}>
                            <Icon name="close-circle" size={24} color="#000" />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.inputForm}>
                    <TouchableOpacity style={styles.imagePickerButton} onPress={handleTakePhoto}>
                        <Icon name="camera-outline" size={24} color="#000000ff" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.imagePickerButton} onPress={handleChoosePhoto}>
                        <Icon name="image-outline" size={24} color="#000000ff" />
                    </TouchableOpacity>
                    <TextInput
                        style={styles.textInput}
                        value={newMessage}
                        onChangeText={setNewMessage}
                        placeholder="..."
                        placeholderTextColor="#888"
                        editable={isSocketReady}
                        multiline
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            (!isSocketReady || (!newMessage.trim() && !selectedImage)) && styles.sendButtonDisabled
                        ]}
                        onPress={handleSend}
                        disabled={!isSocketReady || (!newMessage.trim() && !selectedImage)}
                    >
                       <Icon name="send" size={24} color="#22eae3ff" />

                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

            <Modal 
            visible = {isImageViewerVisible}
            transparent= {true}
            onRequestClose={() => setIsImageViewerVisible(false)}
            animationType='slide'
            >
                <View style = {styles.imageViewerContainer}>
                        <TouchableOpacity style ={styles.closeButton}
                         onPress={() => {setIsImageViewerVisible(false);
                            setSelectedImageForViewer(null);
                         }}>
                        <Icon name="close-circle" size={30} color="#fff"/>
                        </TouchableOpacity>
                        {selectedImageForViewer && (
                            <Image
                            source={{uri: selectedImageForViewer}}
                            style={styles.fullScreenImage}
                            resizeMode='contain'
                            />
                        )}
                </View>
            </Modal>
        </View>

        
    );
};
const { width, height } = Dimensions.get('window');
const styles = StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: '#eeeaeaff' },
    keyboardAvoidingView: { flex: 1,},
    statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f8f8' },
    statusText: { marginTop: 10, fontSize: 16, color: '#4a5568' },
    errorText: { fontSize: 16, color: '#ef4444', textAlign: 'center', paddingHorizontal: 20 },
    header: { paddingTop: 10, paddingHorizontal: 10, backgroundColor: '#ffffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center', justifyContent: 'flex-start', flexDirection: 'row' },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#2c5282', textTransform: 'uppercase', letterSpacing: 0.5 },
    messagesContainer: { paddingVertical: 15, paddingHorizontal: 10, backgroundColor: '#f8f8f8', flexGrow: 1 },
    noMessagesContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noMessagesText: { textAlign: 'center', color: '#a0aec0', fontSize: 16, padding: 20 },

    // ============ Styles for Message Row and Avatar ============
    messageRow: {
        flexDirection: 'row', // Arrange avatar and bubble horizontally
        marginBottom: 15,
        alignItems: 'flex-end', // Align avatar and bubble to the bottom
        maxWidth: '100%', // Ensure row doesn't exceed screen width
    },
    
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20, // Bo tròn
        backgroundColor: '#ccc',
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    // ============ End Styles ============

    messageBubble: {
        maxWidth: '75%',
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderRadius: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        marginHorizontal: 0, // Không margin ngang, sát mép
    },
    senderName: { // Style for sender's name (if available)
        fontSize: 13,
        color: '#666',
        marginBottom: 4,
        fontWeight: 'bold',
    },
    messageContent: { fontSize: 13, lineHeight: 22 },
    myMessageContent: { color: '#ffffff' },
    otherMessageContent: { color: '#e0e1e4ff' },
    messageInfoRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 5 },
    messageTime: { fontSize: 10 },
    myMessageTime: { color: 'rgba(255, 255, 255, 0.7)' },
    otherMessageTime: { color: '#718096' },
    messageStatusContainer: { marginLeft: 5 },
    statusIcon: {},
    inputForm: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        backgroundColor: '#ffffff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0'
    },
    textInput: {
        flex: 1,
        height: 45,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 25,
        fontSize: 16,
        color: '#4a5568',
        backgroundColor: '#f9fafb',
        marginHorizontal: 5,
    },
    sendButton: { marginLeft: 10, paddingVertical: 8,
         paddingHorizontal: 15, borderWidth: 0.5,
          borderRadius: 25, backgroundColor: '#ffffffff', 
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
           shadowOpacity: 0.2, shadowRadius: 3, elevation: 4 },
    sendButtonDisabled: { backgroundColor: '#ffffffff' },
    sendButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
    // chatImage: {
    //     width: 250,
    //     aspectRatio: 1,
        
    //     borderRadius: 15,
    //     resizeMode: 'cover',
    // },
    previewContainer: {
        flexDirection: 'row',
        padding: 10,
        backgroundColor: '#e9e9e9',
        borderTopWidth: 1,
        borderColor: '#ddd',
        alignItems: 'center',
    },
    previewImage: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginRight: 10,
    },
    removeImageButton: {
        position: 'absolute',
        top: 0,
        left: 60,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 12,
    },
    imagePickerButton: {
        paddingHorizontal: 10,
    },
    // Style mới cho container của ảnh
    // adminImageContainer: {
    //     alignSelf: 'flex-start',
    //     marginRight: 10, // Khoảng cách với avatar
    //     maxWidth: '80%', // Tương tự như bubble text
    //     marginBottom: 5, // Khoảng cách với tin nhắn tiếp theo
    // },
    // userImageContainer: {
    //     alignSelf: 'flex-end',
    //     maxWidth: '80%',
    //     marginBottom: 5,
    // },
    // Style cho caption của ảnh (nếu có text kèm theo ảnh)
    adminImageCaption: {
        fontSize: 13,
        lineHeight: 20,
        color: '#2d3748',
        paddingHorizontal: 15,
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: '#e2e8f0', // Màu nền cho caption
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 5,
    },
    userImageCaption: {
        fontSize: 13,
        lineHeight: 20,
        color: '#fff',
        paddingHorizontal: 15,
        paddingTop: 5,
        paddingBottom: 5,
        backgroundColor: '#9be9ffff', // Màu nền cho caption
        borderRadius: 15,
        overflow: 'hidden',
        marginBottom: 5,
    },
    // Có thể điều chỉnh styles.messageInfoRow nếu muốn nó có nền khác khi đi kèm ảnh
    adminMessageInfoRow: {
        paddingHorizontal: 15, // Giữ padding nếu muốn nó align với caption
    },
    userMessageInfoRow: {
        paddingHorizontal: 15,
    },
    imageViewerContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)', // Nền đen mờ
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 1,
        padding: 10,
    },
    fullScreenImage: {
        width: width,
        height: height * 0.8,
        resizeMode: 'contain',
    },
    logo: {
        width: 60,
        height: 60,
        marginTop: 15
    }, 
    s7m: {
        marginTop: 15,
        fontSize: 15,
        color: 'black'
    }
    
});

export default UserChatScreen;