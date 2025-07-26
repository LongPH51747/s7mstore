import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAuth, onAuthStateChanged } from '@react-native-firebase/auth';
import { API_BASE_URL } from '../config/api';

const SocketContext = createContext(null);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) throw new Error('useSocket must be used within a SocketProvider');
    return context;
};

export const SocketProvider = ({ children }) => {
    // State xác thực và user
    const [accessToken, setAccessToken] = useState(null);
    const [user, setUser] = useState(null); 
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // State socket và chat
    const socketRef = useRef(null);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const isConnecting = useRef(false);

    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [messagesError, setMessagesError] = useState(null);
    const [chatRooms, setChatRooms] = useState([]);

    // ChatRoomId cho user thường (user - admin)
    const [currentUserChatRoomId, setCurrentUserChatRoomId] = useState(null);

    // Refs cho giá trị mới nhất của state để dùng trong useCallback
    const latestUserRef = useRef(user);
    useEffect(() => { latestUserRef.current = user; }, [user]);
    const latestAccessTokenRef = useRef(accessToken);
    useEffect(() => { latestAccessTokenRef.current = accessToken; }, [accessToken]);
    const latestCurrentChatRoomIdRef = useRef(null); 
    useEffect(() => { latestCurrentChatRoomIdRef.current = currentUserChatRoomId; }, [currentUserChatRoomId]);


    // --- Xử lý Đăng xuất cục bộ ---
    const handleLocalLogout = useCallback(async () => {
        try {
            console.log("[SocketContext] Bắt đầu quá trình đăng xuất cục bộ.");
            // Xóa tất cả các item liên quan đến user và token
            await AsyncStorage.multiRemove(['userToken', 'userInfo', 'shouldAutoLogin', 'userPhone']);
            
            // Chỉ gọi signOut() nếu có người dùng Firebase đang đăng nhập
            const firebaseAuth = getAuth();
            if (firebaseAuth.currentUser) {
                try { 
                    await firebaseAuth.signOut(); 
                    console.log("[Firebase Auth] Đã đăng xuất khỏi Firebase.");
                } catch (e) { 
                    console.error("[Firebase Auth] Lỗi khi đăng xuất Firebase:", e); 
                }
            }
            
            // Reset tất cả các state liên quan đến authentication và chat
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            setMessages([]);
            setChatRooms([]);
            setCurrentUserChatRoomId(null);
            latestCurrentChatRoomIdRef.current = null; // Reset ref
            setLoadingAuth(false);

            // Ngắt kết nối socket nếu đang kết nối
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
                socketRef.current = null;
                console.log("[Socket.js] Socket đã ngắt kết nối và xóa listeners.");
            }
            setIsSocketReady(false);
            isConnecting.current = false;
            console.log("[SocketContext] Đã hoàn tất quá trình đăng xuất cục bộ.");

        } catch (error) {
            console.error("[SocketContext] Lỗi đăng xuất cục bộ:", error);
            Alert.alert("Lỗi đăng xuất", "Không thể hoàn tất đăng xuất. Vui lòng thử lại.");
        }
    }, []);


    // --- Load dữ liệu xác thực từ AsyncStorage và Firebase Auth ---
    const loadAuthDataFromAsyncStorage = useCallback(async () => {
        setLoadingAuth(true);
        try {
            const firebaseAuth = getAuth();
            const firebaseUser = firebaseAuth.currentUser; 

            let finalUserObject = null;
            let finalAccessToken = null;

            const [tokenFromStorage, userInfoStringFromStorage] = await Promise.all([
                AsyncStorage.getItem('userToken'),
                AsyncStorage.getItem('userInfo'),
            ]);

            if (userInfoStringFromStorage) {
                try {
                    const storedUserInfo = JSON.parse(userInfoStringFromStorage);
                    // Ưu tiên MongoDB _id từ AsyncStorage nếu có
                    if (storedUserInfo && storedUserInfo._id) {
                        finalUserObject = { ...storedUserInfo };
                        console.log("[SocketContext][LoadAuth] Đã tải UserInfo từ AsyncStorage (MongoDB _id):", storedUserInfo._id);
                    }
                } catch (e) {
                    console.error("[SocketContext][LoadAuth] Lỗi parse userInfo từ AsyncStorage:", e);
                    await AsyncStorage.removeItem('userInfo');
                }
            }
            
            if (tokenFromStorage) {
                finalAccessToken = tokenFromStorage;
                console.log("[SocketContext][LoadAuth] Đã tải Token từ AsyncStorage.");
            }

            // Nếu có Firebase User, đảm bảo token là Firebase ID Token mới nhất
            if (firebaseUser) {
                const firebaseIdToken = await firebaseUser.getIdToken(true);
                finalAccessToken = firebaseIdToken; // Ưu tiên Firebase ID Token

                // Nếu chưa có user object từ AsyncStorage với MongoDB _id, 
                // hoặc Firebase UID không khớp, tạo một user object tạm thời từ Firebase data
                if (!finalUserObject || finalUserObject.firebaseUid !== firebaseUser.uid) {
                    console.log("[SocketContext][LoadAuth] Tạo hoặc cập nhật UserInfo TẠM THỜI từ Firebase User. UID:", firebaseUser.uid);
                    // Chỉ dùng Firebase UID làm _id tạm thời nếu chưa có MongoDB _id
                    finalUserObject = {
                        _id: firebaseUser.uid, // Tạm thời dùng Firebase UID làm _id
                        email: firebaseUser.email,
                        fullname: firebaseUser.displayName || 'Người dùng',
                        avatar: firebaseUser.photoURL,
                        provider: 'firebase',
                        role: 'user', 
                        firebaseUid: firebaseUser.uid
                    };
                } else {
                    // Nếu đã có user object từ AsyncStorage và khớp với Firebase UID, 
                    // Cập nhật các trường có thể thay đổi từ Firebase và giữ lại MongoDB _id
                    console.log("[SocketContext][LoadAuth] Cập nhật UserInfo từ Firebase (giữ MongoDB _id).");
                    finalUserObject = {
                        ...finalUserObject,
                        email: firebaseUser.email || finalUserObject.email,
                        fullname: firebaseUser.displayName || finalUserObject.fullname,
                        avatar: firebaseUser.photoURL || finalUserObject.avatar,
                        provider: finalUserObject.provider || 'firebase',
                        firebaseUid: firebaseUser.uid 
                    };
                }
            } 
            // Nếu có finalUserObject nhưng không có finalAccessToken (token hết hạn),
            // hoặc finalUserObject không có _id hợp lệ (chưa được xác thực backend),
            // coi như chưa xác thực và xóa thông tin.
            else if (finalUserObject && (!finalAccessToken || !finalUserObject._id || finalUserObject._id === finalUserObject.firebaseUid)) {
                console.warn("[SocketContext][LoadAuth] Phát hiện UserInfo nhưng không có Token hợp lệ hoặc MongoDB _id. Xem như chưa xác thực.");
                finalUserObject = null;
                finalAccessToken = null;
            }


            // Cập nhật trạng thái Context
            const newIsAuthenticated = !!finalAccessToken && !!finalUserObject && !!finalUserObject._id;
            const newIsAdmin = finalUserObject?.role === 'admin';

            setAccessToken(newIsAuthenticated ? finalAccessToken : null);
            setUser(newIsAuthenticated ? finalUserObject : null); 
            setIsAuthenticated(newIsAuthenticated);
            setIsAdmin(newIsAdmin);

            // Luôn lưu thông tin user đã đồng bộ và token vào AsyncStorage
            if (newIsAuthenticated) {
                await AsyncStorage.setItem('userToken', finalAccessToken);
                await AsyncStorage.setItem('userInfo', JSON.stringify(finalUserObject));
                console.log("[SocketContext][LoadAuth] Đã cập nhật AsyncStorage với User._id:", finalUserObject._id);
                console.log("[SocketContext][LoadAuth] Full userInfo saved:", JSON.stringify(finalUserObject, null, 2));
            } else {
                console.warn("[SocketContext][LoadAuth] Thông tin xác thực không hợp lệ. Xóa dữ liệu cũ trong AsyncStorage.");
                await AsyncStorage.multiRemove(['userToken', 'userInfo']);
            }

        } catch (e) {
            console.error("[SocketContext][LoadAuth] Lỗi khi tải dữ liệu xác thực:", e);
            setAccessToken(null);
            setUser(null);
            setIsAuthenticated(false);
            setIsAdmin(false);
            await AsyncStorage.multiRemove(['userToken', 'userInfo']);
        } finally {
            setLoadingAuth(false);
        }
    }, []);


    // --- Lắng nghe trạng thái Firebase Auth và đồng bộ với Authentication Context ---
    useEffect(() => {
        const firebaseAuth = getAuth();
        let isInitialLoad = true;

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            console.log("[Firebase Auth Listener] onAuthStateChanged fired. firebaseUser:", !!firebaseUser);
            
            // Gọi loadAuthDataFromAsyncStorage để đồng bộ trạng thái Auth (cả Firebase và Local)
            // loadAuthDataFromAsyncStorage sẽ cố gắng đọc MongoDB _id từ AsyncStorage
            await loadAuthDataFromAsyncStorage();

            // Nếu không có firebaseUser VÀ không có token cục bộ hợp lệ (MongoDB _id),
            // thì mới gọi handleLocalLogout.
            // Điều này ngăn chặn việc tự động logout người dùng đăng nhập bằng email/password
            // nếu firebaseUser tạm thời bị null nhưng user cục bộ vẫn có token/userInfo hợp lệ
            if (!firebaseUser && isInitialLoad) {
                const userTokenFromStorage = await AsyncStorage.getItem('userToken');
                const userInfoStringFromStorage = await AsyncStorage.getItem('userInfo');
                let storedUserInfo = null;
                if (userInfoStringFromStorage) {
                    try {
                        storedUserInfo = JSON.parse(userInfoStringFromStorage);
                    } catch (e) { /* ignore */ }
                }
                // Chỉ logout nếu KHÔNG có Firebase user VÀ KHÔNG có MongoDB _id trong userInfo
                const isLocallyAuthenticatedWithMongoId = userTokenFromStorage && storedUserInfo && storedUserInfo._id;

                if (!isLocallyAuthenticatedWithMongoId) {
                    console.log("[Firebase Auth Listener] Không có Firebase user và không có token/userInfo cục bộ hợp lệ (MongoDB _id). Đang gọi handleLocalLogout.");
                    handleLocalLogout();
                }
            }
            isInitialLoad = false;
        });

        return () => {
            unsubscribe();
        };
    }, [loadAuthDataFromAsyncStorage, handleLocalLogout]); 

    // --- SOCKET.IO KẾT NỐI VÀ QUẢN LÝ LIFECYCLE ---
    useEffect(() => {
        setMessagesError(null);
        console.log('[SocketContext] ===== BẮT ĐẦU HOẶC KIỂM TRA KẾT NỐI SOCKET =====');
        console.log('[SocketContext] Current state: loadingAuth=', loadingAuth, 'isAuthenticated=', isAuthenticated, 'accessToken=', !!accessToken, 'user=', user, 'user._id=', user?._id);

        // Điều kiện để KHÔNG kết nối socket hoặc ngắt kết nối hiện có
        // Rất quan trọng: user._id PHẢI là MongoDB _id hợp lệ để kết nối socket
        if (loadingAuth || !isAuthenticated || !accessToken || !user?._id || user._id.length < 20) { // Thêm điều kiện user._id hợp lệ
            if (socketRef.current) {
                console.log('[SocketContext] Ngắt kết nối socket hiện có do thiếu xác thực hoặc đang load.');
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners();
                socketRef.current = null;
            }
            setIsSocketReady(false);
            isConnecting.current = false;
            return;
        }

        // Nếu socket đã tồn tại và đang kết nối/đã kết nối với đúng token và user id, không làm gì cả
        if (socketRef.current && (socketRef.current.connected || socketRef.current.connecting) && 
            socketRef.current.handshake?.auth?.token === accessToken &&
            socketRef.current.handshake?.query?.userId === user._id) { // Kiểm tra userId để đảm bảo đúng user
            console.log('[SocketContext] Socket đã sẵn sàng và đang dùng đúng token/user. Không cần tạo mới.');
            setIsSocketReady(true);
            isConnecting.current = false;
            return;
        }

        // Nếu socket tồn tại nhưng token hoặc trạng thái không khớp, ngắt kết nối cũ
        if (socketRef.current) {
            console.log('[SocketContext] Socket hiện có không khớp hoặc không hợp lệ. Ngắt kết nối cũ.');
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            isConnecting.current = false;
            setIsSocketReady(false);
        }

        // Chỉ tạo socket mới nếu chưa có socket hoặc socket cũ đã bị ngắt
        if (!socketRef.current && !isConnecting.current) {
            isConnecting.current = true;
            setIsSocketReady(false);

            const tokenType = user.provider || 'local';
            console.log(`[SocketContext] Tạo socket mới với URL: ${API_BASE_URL}, Token Type: ${tokenType}, User ID: ${user._id}`);

            const newSocket = io(API_BASE_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: false,
                auth: { 
                    token: accessToken, 
                    tokenType: tokenType,
                    userId: user._id // Gửi userId lên để backend kiểm tra
                },
            });

            newSocket.onAny((event, ...args) => {
                console.log(`[SocketContext][SOCKET EVENT] ${event}`, args);
            });

            socketRef.current = newSocket;

            const onConnect = () => {
                console.log('[SocketContext] Socket đã kết nối thành công!');
                // Ngay sau khi connect, socket sẽ tự emit 'authenticated' nếu backend config
                // hoặc bạn có thể emit một sự kiện 'authenticate' riêng nếu cần.
            };

            const onAuthenticated = (data) => {
                console.log('[SocketContext] Socket đã được xác thực thành công!', data);
                setIsSocketReady(true);
                isConnecting.current = false;

                // Đảm bảo data là mảng và có phần tử đầu tiên
                if (Array.isArray(data) && data.length > 0 && data[0].userId) {
                    const backendUserData = data[0]; // Lấy dữ liệu user từ backend (chứa MongoDB _id)

                    // Cập nhật lại `user` state với MongoDB _id từ backend
                    setUser(prevUser => {
                        if (prevUser && prevUser._id !== backendUserData.userId) {
                            console.log("[SocketContext] Cập nhật user._id từ Firebase UID sang MongoDB _id:", backendUserData.userId);
                            
                            // Cập nhật userInfo trong AsyncStorage
                            AsyncStorage.getItem('userInfo').then(userInfoString => {
                                let storedUserInfo = {};
                                if (userInfoString) {
                                    try {
                                        storedUserInfo = JSON.parse(userInfoString);
                                    } catch (e) {
                                        console.error("Error parsing stored userInfo:", e);
                                    }
                                }
                                const updatedStoredUserInfo = {
                                    ...storedUserInfo,
                                    // Ghi đè các trường từ backend (userId, fullname, userRole)
                                    _id: backendUserData.userId, // Đảm bảo _id là MongoDB ID
                                    role: backendUserData.userRole, // Cập nhật role từ backend
                                    fullname: backendUserData.fullname, // Cập nhật fullname từ backend
                                    // Giữ lại Firebase UID nếu có, nhưng chỉ khi nó khác với _id mới
                                    firebaseUid: prevUser.firebaseUid || (prevUser._id && prevUser._id.length > 20 ? prevUser._id : undefined)
                                };
                                AsyncStorage.setItem('userInfo', JSON.stringify(updatedStoredUserInfo));
                                console.log("[SocketContext][onAuthenticated] Updated userInfo in AsyncStorage:", JSON.stringify(updatedStoredUserInfo, null, 2));
                            }).catch(e => console.error("Error updating userInfo in AsyncStorage:", e));

                            return {
                                ...prevUser, // Giữ lại các thông tin Firebase (email, avatar)
                                _id: backendUserData.userId, // Cập nhật _id thành MongoDB ID
                                fullname: backendUserData.fullname || prevUser.fullname,
                                role: backendUserData.userRole || prevUser.role,
                                // Đảm bảo firebaseUid vẫn được giữ nếu prevUser._id là firebaseUid ban đầu
                                firebaseUid: prevUser.firebaseUid || (prevUser._id && prevUser._id.length > 20 ? undefined : prevUser._id)
                            };
                        }
                        return prevUser;
                    });
                }

                // Yêu cầu dữ liệu ban đầu sau khi xác thực
                // Dùng `latestUserRef.current` để đảm bảo lấy được user._id đã cập nhật nếu có.
                // Hoặc có thể trì hoãn việc này cho đến khi `user` state được cập nhật.
                // Tuy nhiên, việc `setUser` là async, nên emit ngay có thể vẫn dùng UID cũ.
                // Tốt hơn là đặt request này vào một useEffect riêng biệt phụ thuộc vào `user._id`
                if (latestUserRef.current?.role === 'admin') {
                    newSocket.emit('request_chat_room_list');
                } else {
                    newSocket.emit('request_chat_history_for_user_self');
                }
            };

            const onUnauthorized = (reason) => {
                console.warn('[SocketContext] unauthorized:', reason);
                Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.', [
                    { text: 'OK', onPress: handleLocalLogout }
                ]);
                if (newSocket && newSocket.connected) { newSocket.disconnect(); }
                setIsSocketReady(false);
                isConnecting.current = false;
            };
            const onDisconnect = (reason) => {
                console.warn('[SocketContext] Đã disconnect:', reason);
                setIsSocketReady(false);
                isConnecting.current = false;
            };
            const onConnectError = (error) => {
                console.error('[SocketContext] Lỗi connect_error:', error);
                setIsSocketReady(false);
                isConnecting.current = false;
                if (error.message.includes('Authentication error')) {
                    Alert.alert('Lỗi xác thực', 'Xác thực không thành công. Vui lòng đăng nhập lại.', [
                        { text: 'OK', onPress: handleLocalLogout }
                    ]);
                } else {
                    Alert.alert('Lỗi kết nối', 'Không thể kết nối đến máy chủ chat. Vui lòng thử lại sau.', [{ text: 'OK' }]);
                }
            };
            const onGenericError = (error) => {
                console.error('[SocketContext] Lỗi chung từ Socket:', error);
                Alert.alert('Lỗi hệ thống chat', 'Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.', [{ text: 'OK' }]);
            };

            const onChatRoomsList = (rooms) => {
                console.log('[SocketContext] Nhận danh sách phòng chat:', rooms);
                setChatRooms(rooms.map(room => ({ ...room, roomId: room._id }))); 
                // Logic chọn phòng đầu tiên nếu cần có thể ở đây hoặc một useEffect khác
            };

            const onReceiveMessage = (message) => {
                console.log('[SocketContext] Nhận message:', message);
                setMessages((prevMessages) => {
                    if (message.tempMessageId) {
                        const existingTempMessageIndex = prevMessages.findIndex(msg => msg._id === message.tempMessageId);
                        if (existingTempMessageIndex !== -1) {
                            const updatedMessages = [...prevMessages];
                            updatedMessages[existingTempMessageIndex] = {
                                ...message,
                                _id: message._id || message.tempMessageId,
                                status: 'sent',
                                tempMessageId: undefined 
                            };
                            return updatedMessages;
                        }
                    }
                    const isMessageAlreadyExist = prevMessages.some(msg => msg._id === message._id);
                    if (isMessageAlreadyExist) {
                        return prevMessages.map(msg => msg._id === message._id ? { ...msg, ...message, status: 'sent' } : msg);
                    }
                    return [...prevMessages, { ...message, status: 'sent' }];
                });
            };

            const onChatHistory = (data) => {
                console.log('[SocketContext] Dữ liệu lịch sử chat nhận từ backend:', data);
                let history = [];
                let chatRoomId = null;

                if (Array.isArray(data)) {
                    history = data;
                    if (history.length > 0) chatRoomId = history[0].chatRoomId;
                } else if (data && data.messages) {
                    history = data.messages;
                    chatRoomId = data.chatRoomId;
                }
                setMessages(history.map(msg => ({ ...msg, status: 'sent' })));
                setIsLoadingMessages(false);
                setMessagesError(null);
                if (!isAdmin && chatRoomId) {
                    setCurrentUserChatRoomId(chatRoomId);
                }
            };

            const onMessageError = (errorMsg) => {
                console.error('[SocketContext] Lỗi gửi tin nhắn:', errorMsg);
                setMessagesError({ error: true, message: errorMsg.message});
                setIsLoadingMessages(false);
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg.tempMessageId === errorMsg.tempMessageId ? { ...msg, status: 'failed', error: errorMsg.message } : msg
                    )
                );
                Alert.alert('Lỗi gửi tin nhắn', errorMsg.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
            };

            const onMessageReadStatusUpdate = (data) => {
                console.log('[SocketContext] Cập nhật trạng thái đọc tin nhắn:', data);
                const { chatRoomId, messageIds, readerId } = data;
                const currentUserId = latestUserRef.current?._id; 

                if (!currentUserId || !chatRoomId || !Array.isArray(messageIds) || messageIds.length === 0) {
                    console.warn('[SocketContext] onMessageReadStatusUpdate: Dữ liệu không hợp lệ hoặc thiếu. Bỏ qua cập nhật.', data);
                    return;
                }

                setMessages(prevMessages => 
                    prevMessages.map(msg => {
                        if (messageIds.includes(msg._id) && msg.sender?._id !== readerId) {
                            const currentReadBy = msg.readBy || []; 
                            if (!currentReadBy.includes(readerId)) {
                                return { 
                                    ...msg, 
                                    readBy: [...currentReadBy, readerId] 
                                };
                            }
                        }
                        return msg;
                    })
                );

                setChatRooms(prevRooms => prevRooms.map(room => {
                    if (room._id === chatRoomId) {
                        if (currentUserId === readerId) {
                            if (latestUserRef.current?.role === 'user') {
                                return { ...room, unreadCountUser: 0 };
                            } else if (latestUserRef.current?.role === 'admin') {
                                return { ...room, unreadCountAdmin: 0 };
                            }
                        }
                    }
                    return room;
                }));
            };
            
            const onMessageDeleted = (deletedMessageId) => {
                console.log(`[SocketContext] Received 'messageDeleted' for ID: ${deletedMessageId}`);
                setMessages(prevMessages => {
                  return prevMessages.filter(msg => msg._id !== deletedMessageId)
                })
            };;
 
            newSocket.on('connect', onConnect);
            newSocket.on('authenticated', onAuthenticated); 
            newSocket.on('unauthorized', onUnauthorized);
            newSocket.on('disconnect', onDisconnect);
            newSocket.on('connect_error', onConnectError);
            newSocket.on('error', onGenericError);

            if (isAdmin) {
                newSocket.on('chat_room_list', onChatRoomsList);
                newSocket.on('chat_history', onChatHistory); 
            } else {
                newSocket.on('chat_history', onChatHistory); 
            }
            newSocket.on('receive_message', onReceiveMessage);
            newSocket.on('message_error', onMessageError);
            newSocket.on('message_read_status_update', onMessageReadStatusUpdate);
            newSocket.on('messageDeleted', onMessageDeleted)

            newSocket.connect();

            return () => {
                if (newSocket && (newSocket.connected || newSocket.connecting)) {
                    console.log("[SocketContext] Cleanup: Ngắt kết nối socket.");
                    newSocket.disconnect();
                }
                newSocket.off('connect', onConnect);
                newSocket.off('authenticated', onAuthenticated);
                newSocket.off('unauthorized', onUnauthorized);
                newSocket.off('disconnect', onDisconnect);
                newSocket.off('connect_error', onConnectError);
                newSocket.off('error', onGenericError);
                if (isAdmin) {
                    newSocket.off('chat_room_list', onChatRoomsList);
                }
                newSocket.off('chat_history', onChatHistory);
                newSocket.off('receive_message', onReceiveMessage);
                newSocket.off('message_error', onMessageError);
                newSocket.off('message_read_status_update', onMessageReadStatusUpdate);
                newSocket.off('messageDeleted', onMessageDeleted);
                
                if (socketRef.current === newSocket) {
                    socketRef.current = null;
                }
                setIsSocketReady(false);
                isConnecting.current = false;
            };
        }
    }, [isAuthenticated, accessToken, user, isAdmin, handleLocalLogout, loadingAuth, loadAuthDataFromAsyncStorage]);


    // --- Hàm gửi tin nhắn ---
    const sendMessage = useCallback((messageObject) => {
        const userId = latestUserRef.current?._id;
        const socket = socketRef.current;

        if (!userId || userId.length < 20 || !socket || !socket.connected || !isSocketReady || loadingAuth) {
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối hoặc xác thực.');
            return;
        }

        if (messageObject.messageType === 'text' && !messageObject.content?.trim()) {
            console.warn('Cannot send empty text message');
            return;
        }

        if (messageObject.messageType === 'image' && !messageObject.mediaUrl) {
            Alert.alert('Lỗi', 'Không thể gửi ảnh do thiếu URL ảnh.');
            return;
        }

        const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const messageData = {
            chatRoomId: currentUserChatRoomId,
            content: messageObject.content || '',
            messageType: messageObject.messageType,
            mediaUrl: messageObject.mediaUrl || null,
            tempMessageId,
        };

        setMessages(prevMessages => [...prevMessages, {
            _id: tempMessageId,
            sender: { _id: userId, fullname: latestUserRef.current?.fullname, avatar: latestUserRef.current?.avatar },
            content: messageData.content,
            messageType: messageData.messageType,
            mediaUrl: messageData.mediaUrl,
            createdAt: new Date().toISOString(),
            chatRoomId: currentUserChatRoomId,
            status: 'pending',
            readBy: [userId],
        }]);

        console.log('Gửi tin nhắn:', messageData);
        socket.emit('send_message', messageData);
    }, [isSocketReady, loadingAuth, currentUserChatRoomId]);


    // --- Hàm chọn phòng chat cho admin (và yêu cầu lịch sử chat) ---
    const selectChatRoom = useCallback((roomId, chattingWithUserId) => {
        if (latestCurrentChatRoomIdRef.current === roomId) {
            console.log(`[SocketContext] Phòng chat ${roomId} đã được chọn. Không làm gì.`);
            return;
        }
        
        console.log(`[SocketContext] Chọn phòng chat: ${roomId}, Chatting with: ${chattingWithUserId}`);
        setMessages([]); 
        latestCurrentChatRoomIdRef.current = roomId;
        
        const socket = socketRef.current;
        if (socket && socket.connected && isSocketReady && roomId) {
            setIsLoadingMessages(true);
            socket.emit('request_chat_history_for_admin', { chatRoomId: roomId });
        } else {
            console.warn("[SocketContext] Không thể yêu cầu lịch sử chat: Socket không sẵn sàng hoặc thiếu roomId.");
            // Có thể Alert.alert ở đây nếu muốn thông báo cho người dùng
        }
    }, [isSocketReady]); // Depend on isSocketReady


    // --- Hàm đánh dấu tin nhắn đã đọc (client side) ---
    // UserChatScreen sẽ gọi hàm này
    const markMessagesAsRead = useCallback((messageIdsToMark, chatRoomId) => {
        const socket = socketRef.current;
        const currentUserId = latestUserRef.current?._id;

        if (!socket || !socket.connected || !isSocketReady || !currentUserId || currentUserId.length < 20) {
            console.warn('[SocketContext] Không thể đánh dấu tin nhắn đã đọc: Socket không sẵn sàng hoặc User ID không hợp lệ.');
            return;
        }
        if (!Array.isArray(messageIdsToMark) || messageIdsToMark.length === 0 || !chatRoomId) {
            console.warn('[SocketContext] markMessagesAsRead: Dữ liệu đầu vào không hợp lệ.');
            return;
        }

        console.log(`[SocketContext] Đang gửi yêu cầu đánh dấu tin nhắn đã đọc: Room ${chatRoomId}, Messages: ${messageIdsToMark}, Reader: ${currentUserId}`);
        socket.emit('mark_messages_as_read', { 
            chatRoomId: chatRoomId, 
            messageIds: messageIdsToMark, 
            readerId: currentUserId 
        });
    }, [isSocketReady]);


    const contextValue = {
        accessToken,
        user,
        isAuthenticated,
        isAdmin,
        loadingAuth,
        isSocketReady,
        messages,
        isLoadingMessages,
        messagesError,
        chatRooms,
        currentUserChatRoomId,
        setMessages, // Cho phép component khác reset messages (ví dụ khi unmount chat)
        sendMessage,
        selectChatRoom,
        markMessagesAsRead,
        handleLocalLogout, // Export hàm logout để có thể gọi từ ngoài
        // setAccessToken, setUser, setIsAuthenticated, setIsAdmin - nếu cần cho luồng đăng nhập khác
    };

    return (
        <SocketContext.Provider value={contextValue}>
            {children}
        </SocketContext.Provider>
    );
};