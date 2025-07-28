import React, { useState, useEffect } from 'react';
import { View, Image, Dimensions, StyleSheet, ActivityIndicator } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');
// Giới hạn chiều rộng tối đa của ảnh trong bubble.
// Thường thì bạn không muốn ảnh tràn hết 100% màn hình vì nó sẽ sát mép quá mức hoặc không để lại không gian cho avatar.
// 0.75 (75%) là một giá trị phổ biến, bạn có thể điều chỉnh để phù hợp với giao diện tổng thể.
const MAX_IMAGE_BUBBLE_WIDTH = screenWidth * 0.4; 

const ImageMessage = ({ imageUrl }) => {
    const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
    const [isLoadingImage, setIsLoadingImage] = useState(true);

    useEffect(() => {
        if (!imageUrl) {
            setIsLoadingImage(false); // Không có URL thì dừng loading
            return;
        }

        setIsLoadingImage(true);
        Image.getSize(imageUrl, (originalWidth, originalHeight) => {
            const aspectRatio = originalHeight / originalWidth;

            // Tính toán kích thước hiển thị để ảnh không vượt quá MAX_IMAGE_BUBBLE_WIDTH
            let displayWidth = originalWidth;
            let displayHeight = originalHeight;

            if (originalWidth > MAX_IMAGE_BUBBLE_WIDTH) {
                displayWidth = MAX_IMAGE_BUBBLE_WIDTH;
                displayHeight = MAX_IMAGE_BUBBLE_WIDTH * aspectRatio;
            }
            // Optional: Nếu ảnh quá nhỏ, bạn có thể đặt một kích thước tối thiểu để dễ nhìn
            // else if (originalWidth < screenWidth * 0.3) {
            //     displayWidth = screenWidth * 0.3;
            //     displayHeight = (screenWidth * 0.3) * aspectRatio;
            // }

            setImageDimensions({ width: displayWidth, height: displayHeight });
            setIsLoadingImage(false);
        }, (error) => {
            console.error('Failed to get image size:', error);
            // Fallback: hiển thị một kích thước mặc định hoặc placeholder khi lỗi
            setImageDimensions({ width: MAX_IMAGE_BUBBLE_WIDTH * 0.8, height: MAX_IMAGE_BUBBLE_WIDTH * 0.6 }); // Ví dụ kích thước mặc định
            setIsLoadingImage(false);
        });
    }, [imageUrl]);

    if (isLoadingImage || imageDimensions.width === 0) {
        // Hiển thị placeholder khi đang tải hoặc không lấy được kích thước
        return (
            <View style={[
                styles.chatImagePlaceholder,
                { width: MAX_IMAGE_BUBBLE_WIDTH * 0.6, height: MAX_IMAGE_BUBBLE_WIDTH * 0.6 } // Kích thước placeholder
            ]}>
                <ActivityIndicator size="small" color="#0000ff" />
            </View>
        );
    }

    return (
        <Image
            source={{ uri: imageUrl }}
            style={[
                styles.chatImageBase,
                { width: imageDimensions.width, height: imageDimensions.height }
            ]}
            // resizeMode không cần thiết nếu width/height đã được tính toán chính xác
            // Tuy nhiên, nếu bạn muốn đảm bảo không bị lỗi hiển thị, có thể dùng 'cover' hoặc 'contain'
            // tùy thuộc vào cách bạn muốn xử lý các trường hợp ngoại lệ (ảnh không đúng tỉ lệ, v.v.)
            // resizeMode="contain" // Hoặc 'cover' tùy thuộc vào cách bạn muốn ảnh hiển thị trong khung đã tính
        />
    );
};

const styles = StyleSheet.create({
    chatImageBase: {
        borderRadius: 15,
        overflow: 'hidden', // Đảm bảo bo góc hoạt động tốt
    },
    chatImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e0e0', // Màu nền placeholder
        borderRadius: 15,
    }
});

export default ImageMessage;