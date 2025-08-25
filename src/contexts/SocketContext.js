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
    const [accessToken, setAccessToken] = useState(null); // JWT cục bộ từ backend
    const [user, setUser] = useState(null); // Thông tin user từ backend (có _id, role)
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingAuth, setLoadingAuth] = useState(true);

    // State socket và chat
    const socketRef = useRef(null);
    const [isSocketReady, setIsSocketReady] = useState(false);
    const isConnecting = useRef(false); // Tránh kết nối lại liên tục

    const [messages, setMessages] = useState([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [messagesError, setMessagesError] = useState(null);
    const [chatRooms, setChatRooms] = useState([]);

    // ChatRoomId cho user thường (user - admin) hoặc admin đang xem phòng cụ thể
    const [currentUserChatRoomId, setCurrentUserChatRoomId] = useState(null);

    // Refs cho giá trị mới nhất của state để dùng trong useCallback và listeners
    const latestUserRef = useRef(user);
    useEffect(() => { latestUserRef.current = user; }, [user]);
    const latestAccessTokenRef = useRef(accessToken);
    useEffect(() => { latestAccessTokenRef.current = accessToken; }, [accessToken]);
    const latestIsAuthenticatedRef = useRef(isAuthenticated);
    useEffect(() => { latestIsAuthenticatedRef.current = isAuthenticated; }, [isAuthenticated]);
    const latestIsAdminRef = useRef(isAdmin);
    useEffect(() => { latestIsAdminRef.current = isAdmin; }, [isAdmin]);
    const latestCurrentChatRoomIdRef = useRef(currentUserChatRoomId);
    useEffect(() => { latestCurrentChatRoomIdRef.current = currentUserChatRoomId; }, [currentUserChatRoomId]);

    // --- Xử lý Đăng xuất cục bộ ---
    const handleLocalLogout = useCallback(async () => {
        console.log("[SocketContext] Bắt đầu quá trình đăng xuất cục bộ.");
        try {
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
    }, []); // Dependencies: None, as it uses internal state/refs via latest refs

    // --- Load dữ liệu xác thực từ AsyncStorage ---
    // Hàm này tập trung vào việc tải JWT cục bộ và userInfo từ AsyncStorage
    const loadAuthDataFromAsyncStorage = useCallback(async () => {
        setLoadingAuth(true);
        try {
            let finalUserObject = null;
            let finalAccessToken = null;

            const [tokenFromStorage, userInfoStringFromStorage] = await Promise.all([
                AsyncStorage.getItem('userToken'), // JWT cục bộ từ backend
                AsyncStorage.getItem('userInfo'),  // userInfo có MongoDB _id
            ]);

            // Xử lý userInfo từ AsyncStorage
            if (userInfoStringFromStorage) {
                try {
                    const storedUserInfo = JSON.parse(userInfoStringFromStorage);
                    // Đảm bảo có MongoDB _id (24 ký tự hex)
                    if (storedUserInfo && typeof storedUserInfo._id === 'string' && storedUserInfo._id.length === 24) {
                        finalUserObject = { ...storedUserInfo };
                        console.log("[SocketContext][LoadAuth] Đã tải UserInfo từ AsyncStorage (MongoDB _id):", storedUserInfo._id);
                    } else {
                       
                        await AsyncStorage.removeItem('userInfo'); // Xóa nếu không hợp lệ
                    }
                } catch (e) {
                    console.error("[SocketContext][LoadAuth] Lỗi parse userInfo từ AsyncStorage:", e);
                    await AsyncStorage.removeItem('userInfo'); // Xóa nếu parse lỗi
                }
            }

            // Xử lý token từ AsyncStorage
            if (tokenFromStorage) {
                // Kiểm tra sơ bộ định dạng JWT (có 3 phần)
                if (tokenFromStorage.split('.').length === 3) {
                    finalAccessToken = tokenFromStorage;
                    console.log("[SocketContext][LoadAuth] Đã tải JWT cục bộ từ AsyncStorage.");
                } else {
                    await AsyncStorage.removeItem('userToken'); // Xóa nếu token không hợp lệ
                }
            }

            const newIsAuthenticated = !!finalAccessToken && !!finalUserObject && typeof finalUserObject._id === 'string' && finalUserObject._id.length === 24;
            const newIsAdmin = finalUserObject?.role === 'admin';

            setAccessToken(newIsAuthenticated ? finalAccessToken : null);
            setUser(newIsAuthenticated ? finalUserObject : null);
            setIsAuthenticated(newIsAuthenticated);
            setIsAdmin(newIsAdmin);

            // Luôn lưu thông tin user và token vào AsyncStorage nếu được xác thực hợp lệ
            if (newIsAuthenticated) {
                await AsyncStorage.setItem('userToken', finalAccessToken);
                await AsyncStorage.setItem('userInfo', JSON.stringify(finalUserObject));
                console.log("[SocketContext][LoadAuth] Đã cập nhật AsyncStorage với User._id:", finalUserObject._id);
                console.log("[SocketContext][LoadAuth] Full userInfo saved:", JSON.stringify(finalUserObject, null, 2));
            } else {
                // console.warn("[SocketContext][LoadAuth] Thông tin xác thực không hợp lệ. Xóa dữ liệu cũ trong AsyncStorage.");
                await AsyncStorage.multiRemove(['userToken', 'userInfo']); // Xóa nếu không xác thực được
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

    // --- Lắng nghe trạng thái Firebase Auth ---
    // Mục đích chính là để phát hiện khi Firebase user thay đổi trạng thái đăng nhập
    // và kích hoạt loadAuthDataFromAsyncStorage để đồng bộ với trạng thái cục bộ.
    useEffect(() => {
        const firebaseAuth = getAuth();
        let isInitialLoad = true;

        const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
            console.log("[Firebase Auth Listener] onAuthStateChanged fired. firebaseUser:", !!firebaseUser);

            // Luôn gọi loadAuthDataFromAsyncStorage để đồng bộ trạng thái từ AsyncStorage
            await loadAuthDataFromAsyncStorage();

            // Logic xử lý logout khi cả Firebase user và token cục bộ đều không tồn tại
            if (!firebaseUser && isInitialLoad) { // Chỉ kiểm tra ở lần tải đầu tiên
                // Lấy lại trạng thái cục bộ sau khi loadAuthDataFromAsyncStorage đã chạy
                const userTokenFromStorage = await AsyncStorage.getItem('userToken');
                const userInfoStringFromStorage = await AsyncStorage.getItem('userInfo');
                let storedUserInfo = null;
                if (userInfoStringFromStorage) {
                    try {
                        storedUserInfo = JSON.parse(userInfoStringFromStorage);
                    } catch (e) { /* ignore */ }
                }

                const isLocallyAuthenticatedWithMongoId = userTokenFromStorage && userTokenFromStorage.split('.').length === 3 && storedUserInfo && typeof storedUserInfo._id === 'string' && storedUserInfo._id.length === 24;

                if (!isLocallyAuthenticatedWithMongoId) {
                    console.log("[Firebase Auth Listener] Không có Firebase user và không có token/userInfo cục bộ hợp lệ (MongoDB _id). Đang gọi handleLocalLogout.");
                    handleLocalLogout(); // Đảm bảo logout cục bộ
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
        if (loadingAuth || !isAuthenticated || !accessToken || !user?._id || typeof user._id !== 'string' || user._id.length !== 24) {
            if (socketRef.current) {
                console.log('[SocketContext] Ngắt kết nối socket hiện có do thiếu xác thực hoặc đang load.');
                socketRef.current.disconnect();
                socketRef.current.removeAllListeners(); // Quan trọng: xóa listeners trước khi null
                socketRef.current = null;
            }
            setIsSocketReady(false);
            isConnecting.current = false; // Reset isConnecting
            return;
        }

        // Nếu socket đã tồn tại và đang kết nối/đã kết nối với đúng token và user id, không làm gì cả
        // Cần kiểm tra accessToken và userId trong handshake.auth để đảm bảo đúng người dùng
        if (socketRef.current && (socketRef.current.connected || socketRef.current.connecting) &&
            socketRef.current.handshake?.auth?.token === accessToken &&
            socketRef.current.handshake?.auth?.userId === user._id) {
            console.log('[SocketContext] Socket đã sẵn sàng và đang dùng đúng token/user. Không cần tạo mới.');
            setIsSocketReady(true);
            isConnecting.current = false; // Đã sẵn sàng, reset isConnecting
            return;
        }

        // Nếu socket tồn tại nhưng token hoặc trạng thái không khớp, ngắt kết nối cũ
        if (socketRef.current) {
            console.log('[SocketContext] Socket hiện có không khớp hoặc không hợp lệ. Ngắt kết nối cũ.');
            socketRef.current.removeAllListeners();
            socketRef.current.disconnect();
            socketRef.current = null;
            isConnecting.current = false; // Reset isConnecting
            setIsSocketReady(false);
        }

        // Chỉ tạo socket mới nếu chưa có socket và không đang trong quá trình kết nối
        if (!socketRef.current && !isConnecting.current) {
            isConnecting.current = true;
            setIsSocketReady(false); // Đặt false trước khi bắt đầu kết nối mới

            const tokenType = user.provider || 'local';
            console.log(`[SocketContext] Tạo socket mới với URL: ${API_BASE_URL}, User ID: ${user._id}`);

            const newSocket = io(API_BASE_URL, {
                transports: ['websocket', 'polling'],
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 20000,
                autoConnect: false, // Quan trọng: Tự connect chỉ khi có đủ thông tin
                auth: {
                    token: accessToken, // Gửi JWT cục bộ
                    tokenType: tokenType,
                    userId: user._id // Gửi MongoDB _id của user lên backend
                },
            });

            newSocket.onAny((event, ...args) => {
                // console.log(`[SocketContext][SOCKET EVENT] ${event}`, args); // Có thể gây nhiễu log, chỉ bật khi debug
            });

            socketRef.current = newSocket;

            const onConnect = () => {
                console.log('[SocketContext] Socket đã kết nối thành công!');
                // setIsSocketReady(true) và isConnecting.current = false sẽ được xử lý trong 'authenticated'
                // hoặc nếu backend không có event 'authenticated', thì xử lý ở đây.
                // Nếu backend gửi event 'authenticated' ngay sau connect thành công, thì chờ event đó.
            };

            const onAuthenticated = (data) => {
                console.log('[SocketContext] Socket đã được xác thực thành công!', data);
                setIsSocketReady(true);
                isConnecting.current = false; // Đã xác thực xong

                if (data && data.userId && typeof data.userId === 'string' && data.userId.length === 24) {
                    const backendUserData = data;

                    setUser(prevUser => {
                        const updatedUser = {
                            ...prevUser, // Giữ lại các thông tin ban đầu (email, avatar từ Firebase nếu có)
                            _id: backendUserData.userId, // Cập nhật _id thành MongoDB ID chính xác
                            fullname: backendUserData.fullname || prevUser.fullname,
                            role: backendUserData.userRole || prevUser.role,
                            firebaseUid: prevUser?.firebaseUid // Giữ nguyên firebaseUid nếu có
                        };
                        AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser))
                            .then(() => console.log("[SocketContext] Đã cập nhật UserInfo trong AsyncStorage sau xác thực Socket.IO."))
                            .catch(e => console.error("Error updating userInfo in AsyncStorage after Socket auth:", e));
                        return updatedUser;
                    });
                    setIsAdmin(backendUserData.userRole === 'admin');
                } else {
                    // console.warn("[SocketContext] Dữ liệu xác thực từ backend không hợp lệ (thiếu userId hoặc định dạng sai).");
                    // Ngắt kết nối hoặc xử lý lỗi nếu dữ liệu xác thực không hợp lệ
                    if (newSocket && newSocket.connected) { newSocket.disconnect(); }
                    handleLocalLogout();
                    return;
                }

                // Sau khi xác thực, yêu cầu danh sách phòng chat hoặc lịch sử chat
                if (latestUserRef.current?.role === 'admin') {
                    newSocket.emit('request_chat_room_list');
                } else {
                    newSocket.emit('request_chat_history_for_user_self');
                }
            };

            const onUnauthorized = (reason) => {
                // console.warn('[SocketContext] unauthorized:', reason);
                Alert.alert('Phiên đăng nhập hết hạn', 'Vui lòng đăng nhập lại để tiếp tục.', [
                    { text: 'OK', onPress: handleLocalLogout }
                ]);
                if (newSocket && newSocket.connected) { newSocket.disconnect(); }
                setIsSocketReady(false);
                isConnecting.current = false;
                
            };

            const onDisconnect = (reason) => {
                // console.warn('[SocketContext] Đã disconnect:', reason);
                setIsSocketReady(false);
                isConnecting.current = false;
                // Nếu disconnect do xác thực thất bại, handleLocalLogout đã được gọi
                // Nếu không, có thể là lỗi mạng tạm thời, socket sẽ tự reconnect (nếu cấu hình)
            };

            const onConnectError = (error) => {
                console.error('[SocketContext] Lỗi connect_error:', error.message);
                setIsSocketReady(false);
                isConnecting.current = false;
                if (error.message.includes('Authentication error') || error.message.includes('Unauthorized')) {
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
            };

            const onReceiveMessage = (message) => {
                console.log('[SocketContext] Nhận message:', message);
                setMessages((prevMessages) => {
                    // Xử lý tin nhắn tạm (pending) khi nhận được tin nhắn thật
                    if (message.tempMessageId) {
                        const existingTempMessageIndex = prevMessages.findIndex(msg => msg._id === message.tempMessageId);
                        if (existingTempMessageIndex !== -1) {
                            const updatedMessages = [...prevMessages];
                            updatedMessages[existingTempMessageIndex] = {
                                ...message,
                                _id: message._id || message.tempMessageId, // Đảm bảo dùng _id thật nếu có
                                status: 'sent',
                                tempMessageId: undefined
                            };
                            return updatedMessages;
                        }
                    }
                    // Tránh thêm tin nhắn trùng lặp nếu đã tồn tại (_id thật)
                    const isMessageAlreadyExist = prevMessages.some(msg => msg._id === message._id);
                    if (isMessageAlreadyExist) {
                        return prevMessages.map(msg => msg._id === message._id ? { ...msg, ...message, status: 'sent' } : msg);
                    }
                    // Thêm tin nhắn mới
                    return [...prevMessages, { ...message, status: 'sent' }];
                });
            };

            const onChatHistory = (data) => {
                // console.log('[SocketContext] Dữ liệu lịch sử chat nhận từ backend:', data);
                let history = [];
                let chatRoomId = null;

                if (Array.isArray(data)) { // Trường hợp admin nhận array of messages
                    history = data;
                    if (history.length > 0) chatRoomId = history[0].chatRoomId; // Lấy chatRoomId từ tin nhắn đầu tiên
                } else if (data && data.messages) { // Trường hợp user nhận object { messages, chatRoomId }
                    history = data.messages;
                    chatRoomId = data.chatRoomId;
                } else {
                    // console.warn("[SocketContext] Dữ liệu chat_history không đúng định dạng:", data);
                    setMessages([]);
                    setIsLoadingMessages(false);
                    return;
                }

                setMessages(history.map(msg => ({ ...msg, status: 'sent' })));
                setIsLoadingMessages(false);
                setMessagesError(null);

                // Cập nhật currentUserChatRoomId nếu là user hoặc nếu admin đang xem một phòng cụ thể
                // Đối với user, luôn set nếu có. Đối với admin, chỉ set nếu họ vừa yêu cầu lịch sử của phòng đó.
                // Lưu ý: `isAdmin` là state, `latestIsAdminRef.current` là giá trị mới nhất của ref.
                if (!latestIsAdminRef.current && chatRoomId) { // Nếu là user, tự động set phòng chat ID
                    setCurrentUserChatRoomId(chatRoomId);
                } else if (latestIsAdminRef.current && latestCurrentChatRoomIdRef.current === chatRoomId) {
                    // Nếu là admin và lịch sử này là của phòng chat admin đang xem
                    setCurrentUserChatRoomId(chatRoomId);
                }
            };

            const onMessageError = (errorMsg) => {
                console.error('[SocketContext] Lỗi gửi tin nhắn:', errorMsg);
                setMessagesError({ error: true, message: errorMsg.message });
                setIsLoadingMessages(false); // Đảm bảo isLoadingMessages được reset
                setMessages(prevMessages =>
                    prevMessages.map(msg =>
                        msg._id === errorMsg.tempMessageId ? { ...msg, status: 'failed', error: errorMsg.message } : msg
                    )
                );
                Alert.alert('Lỗi gửi tin nhắn', errorMsg.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
            };

            const onMessageReadStatusUpdate = (data) => {
                console.log('[SocketContext] Cập nhật trạng thái đọc tin nhắn:', data);
                const { chatRoomId, messageIds, readerId } = data;
                const currentUserId = latestUserRef.current?._id;

                if (!currentUserId || typeof currentUserId !== 'string' || currentUserId.length !== 24 || !chatRoomId || !Array.isArray(messageIds) || messageIds.length === 0) {
                    // console.warn('[SocketContext] onMessageReadStatusUpdate: Dữ liệu không hợp lệ hoặc thiếu. Bỏ qua cập nhật.', data);
                    return;
                }

                setMessages(prevMessages =>
                    prevMessages.map(msg => {
                        // Chỉ cập nhật tin nhắn trong phòng chat hiện tại (nếu có) và tin nhắn chưa được đọc bởi readerId
                        if (msg.chatRoomId === chatRoomId && messageIds.includes(msg._id) && msg.sender?._id !== readerId) {
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
                        // Cập nhật unreadCount dựa trên vai trò của người đọc
                        if (latestUserRef.current?.role === 'user' && currentUserId === readerId) {
                            return { ...room, unreadCountUser: 0 };
                        } else if (latestUserRef.current?.role === 'admin' && currentUserId === readerId) {
                            return { ...room, unreadCountAdmin: 0 };
                        }
                    }
                    return room;
                }));
            };

            const onMessageDeleted = (deletedMessageId) => {
                console.log(`[SocketContext] Received 'messageDeleted' for ID: ${deletedMessageId}`);
                setMessages(prevMessages => prevMessages.filter(msg => msg._id !== deletedMessageId));
            };

            // Đăng ký listeners
            newSocket.on('connect', onConnect);
            newSocket.on('authenticated', onAuthenticated);
            newSocket.on('unauthorized', onUnauthorized);
            newSocket.on('disconnect', onDisconnect);
            newSocket.on('connect_error', onConnectError);
            newSocket.on('error', onGenericError);

            // Listeners phụ thuộc vào vai trò
            // `user` state có thể chưa cập nhật kịp trong lần render đầu tiên của useEffect này,
            // nên việc đăng ký listeners chung và xử lý logic bên trong listeners là tốt hơn.
            // Hoặc dùng latestUserRef.current
            newSocket.on('chat_room_list', onChatRoomsList); // Admin
            newSocket.on('chat_history', onChatHistory); // Cả user và admin
            newSocket.on('receive_message', onReceiveMessage);
            newSocket.on('message_error', onMessageError);
            newSocket.on('message_read_status_update', onMessageReadStatusUpdate);
            newSocket.on('messageDeleted', onMessageDeleted);

            // Cuối cùng, kết nối socket
            newSocket.connect();

            return () => {
                // Cleanup function: Ngắt kết nối và hủy đăng ký listeners
                if (newSocket && (newSocket.connected || newSocket.connecting)) {
                    console.log("[SocketContext] Cleanup: Ngắt kết nối socket.");
                    newSocket.disconnect();
                }
                // Hủy đăng ký tất cả các listeners để tránh memory leaks
                newSocket.off('connect', onConnect);
                newSocket.off('authenticated', onAuthenticated);
                newSocket.off('unauthorized', onUnauthorized);
                newSocket.off('disconnect', onDisconnect);
                newSocket.off('connect_error', onConnectError);
                newSocket.off('error', onGenericError);

                newSocket.off('chat_room_list', onChatRoomsList);
                newSocket.off('chat_history', onChatHistory);
                newSocket.off('receive_message', onReceiveMessage);
                newSocket.off('message_error', onMessageError);
                newSocket.off('message_read_status_update', onMessageReadStatusUpdate);
                newSocket.off('messageDeleted', onMessageDeleted);

                if (socketRef.current === newSocket) { // Chỉ null ref nếu đây là socket đang được giữ
                    socketRef.current = null;
                }
                setIsSocketReady(false);
                isConnecting.current = false;
            };
        }
    }, [isAuthenticated, accessToken, loadingAuth, handleLocalLogout]);


    // --- Hàm gửi tin nhắn ---
    const sendMessage = useCallback((messageObject) => {
        const userId = latestUserRef.current?._id;
        const socket = socketRef.current;
        const currentChatRoomId = latestCurrentChatRoomIdRef.current;

        if (!userId || typeof userId !== 'string' || userId.length !== 24 || !socket || !socket.connected || !isSocketReady || loadingAuth) {
            Alert.alert('Lỗi', 'Không thể gửi tin nhắn. Vui lòng kiểm tra kết nối hoặc xác thực.');
            // console.warn('[SocketContext] sendMessage failed: Missing userId, socket not ready, or loadingAuth. User ID:', userId);
            return;
        }

        if (!currentChatRoomId) {
            Alert.alert('Lỗi', 'Chưa chọn phòng chat để gửi tin nhắn.');
            // console.warn('[SocketContext] sendMessage failed: No chat room selected.');
            return;
        }

        if (messageObject.messageType === 'text' && !messageObject.content?.trim()) {
            // console.warn('Cannot send empty text message');
            return;
        }

        if (messageObject.messageType === 'image' && !messageObject.mediaUrl) {
            Alert.alert('Lỗi', 'Không thể gửi ảnh do thiếu URL ảnh.');
            return;
        }

        const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const messageData = {
            chatRoomId: currentChatRoomId,
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
            chatRoomId: currentChatRoomId,
            status: 'pending', // Trạng thái pending cho tin nhắn đang gửi
            readBy: [userId], // Ban đầu người gửi tự động đánh dấu đã đọc
        }]);

        console.log('Gửi tin nhắn:', messageData);
        socket.emit('send_message', messageData);
    }, [isSocketReady, loadingAuth]); // latestUserRef.current và latestCurrentChatRoomIdRef.current được truy cập trực tiếp

    // --- Hàm chọn phòng chat cho admin (và yêu cầu lịch sử chat) ---
    const selectChatRoom = useCallback((roomId) => {
        const currentUserId = latestUserRef.current?._id;
        const currentUserRole = latestUserRef.current?.role;
        const socket = socketRef.current;

        if (currentUserRole !== 'admin' || !currentUserId || typeof currentUserId !== 'string' || currentUserId.length !== 24) {
            // console.warn("[SocketContext] Người dùng không phải admin hoặc User ID không hợp lệ. Không thể chọn phòng chat.");
            Alert.alert('Lỗi quyền truy cập', 'Bạn không có quyền truy cập chức năng này.');
            return;
        }

        if (latestCurrentChatRoomIdRef.current === roomId) {
            console.log(`[SocketContext] Phòng chat ${roomId} đã được chọn. Không làm gì.`);
            // Nếu admin đã chọn phòng này rồi, có thể force reload messages nếu cần hoặc bỏ qua
            return;
        }

        console.log(`[SocketContext] Admin chọn phòng chat: ${roomId}`);
        setMessages([]); // Xóa tin nhắn cũ khi chuyển phòng
        // Cập nhật ref và state ngay lập tức để các hàm khác có thể sử dụng
        latestCurrentChatRoomIdRef.current = roomId;
        setCurrentUserChatRoomId(roomId);

        if (socket && socket.connected && isSocketReady && roomId && typeof roomId === 'string' && roomId.length === 24) {
            setIsLoadingMessages(true);
            socket.emit('request_chat_history_for_admin', { chatRoomId: roomId });
        } else {
            // console.warn("[SocketContext] Không thể yêu cầu lịch sử chat: Socket không sẵn sàng hoặc thiếu/sai định dạng roomId.");
            Alert.alert('Lỗi', 'Không thể tải lịch sử chat. Vui lòng thử lại.');
            setIsLoadingMessages(false);
        }
    }, [isSocketReady]); // latestUserRef được truy cập qua .current

    // --- Hàm đánh dấu tin nhắn đã đọc ---
    const markMessagesAsRead = useCallback((messageIdsToMark, chatRoomId) => {
        const socket = socketRef.current;
        const currentUserId = latestUserRef.current?._id;

        if (!socket || !socket.connected || !isSocketReady || !currentUserId || typeof currentUserId !== 'string' || currentUserId.length !== 24) {
            // console.warn('[SocketContext] Không thể đánh dấu tin nhắn đã đọc: Socket không sẵn sàng hoặc User ID không hợp lệ.');
            return;
        }

        if (!chatRoomId || !Array.isArray(messageIdsToMark) || messageIdsToMark.length === 0) {
            // console.warn('[SocketContext] markMessagesAsRead: Dữ liệu không hợp lệ hoặc thiếu.');
            return;
        }

        console.log(`[SocketContext] Đánh dấu tin nhắn đã đọc trong phòng ${chatRoomId} bởi ${currentUserId}:`, messageIdsToMark);
        socket.emit('mark_messages_as_read', { chatRoomId, messageIds: messageIdsToMark });
    }, [isSocketReady]);

    const deleteMessage = useCallback((messageId, chatRoomId) => {
        const socket = socketRef.current;
        const currentUserId = latestUserRef.current?._id;
        const currentUserRole = latestUserRef.current?.role;

        if (!socket || !socket.connected || !isSocketReady || !currentUserId) {
            Alert.alert('Lỗi', 'Không thể xóa tin nhắn. Vui lòng kiểm tra kết nối.');
            return;
        }

        if (!messageId || !chatRoomId) {
            Alert.alert('Lỗi', 'Thông tin tin nhắn hoặc phòng chat không đầy đủ.');
            return;
        }

        // Tối ưu: Cập nhật trạng thái tạm thời trong UI ngay lập tức
        setMessages(prevMessages => prevMessages.map(msg =>
            msg._id === messageId ? { ...msg, status: 'deleting' } : msg
        ));

        console.log(`[SocketContext] Đang yêu cầu xóa tin nhắn ID: ${messageId} trong phòng ${chatRoomId}`);
        socket.emit('delete_message', { messageId, chatRoomId, requesterId: currentUserId, requesterRole: currentUserRole });
    }, [isSocketReady]);

    const value = {
        socket: socketRef.current,
        isSocketReady,
        accessToken,
        user,
        isAuthenticated,
        isAdmin,
        loadingAuth,
        messages,
        isLoadingMessages,
        messagesError,
        chatRooms,
        currentUserChatRoomId,
        sendMessage,
        selectChatRoom,
        markMessagesAsRead,
        deleteMessage,
        handleLocalLogout, // Export để component có thể gọi đăng xuất
        loadAuthDataFromAsyncStorage // Export để component có thể gọi tải lại auth
    };
    

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};