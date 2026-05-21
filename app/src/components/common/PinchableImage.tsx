import React, { memo, useState, useMemo } from 'react';
import { View, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { StyleProp, ImageStyle, ViewStyle } from 'react-native';

const AnimatedImage = Reanimated.createAnimatedComponent(Image);

interface PinchableImageProps {
    source: any;
    style?: StyleProp<ImageStyle>;
    containerStyle?: StyleProp<ViewStyle>;
    minScale?: number;
    maxScale?: number;
    id: string;
}

const PinchableImage: React.FC<PinchableImageProps> = ({
    id,
    source,
    style,
    containerStyle,
    minScale = 1,
    maxScale = 4,
}) => {
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);

    // Track initial gesture coordinates
    const startFocalX = useSharedValue(0);
    const startFocalY = useSharedValue(0);

    // Track the dimensions of the layout surface
    const viewWidth = useSharedValue(0);
    const viewHeight = useSharedValue(0);

    const [isHighQuality, setIsHighQuality] = useState(false);

    const optimizedSource = useMemo(() => {
        if (!source?.uri) return source;
        const transformedUrl = isHighQuality
            ? source.uri.replace('/upload/', '/upload/w_1200,c_limit,f_auto,q_auto:good,dpr_auto/')
            : source.uri.replace('/upload/', '/upload/w_600,c_fill,f_auto,q_auto:good,dpr_auto/');
        return { uri: transformedUrl };
    }, [source?.uri, isHighQuality]);

    // Measure the visual container size when elements render
    const onLayout = (event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        viewWidth.value = width;
        viewHeight.value = height;
    };

    const pinchGesture = Gesture.Pinch()
        .onBegin((e) => {
            // 1. Lock initial touch positions relative to the screen layout
            startFocalX.value = e.focalX;
            startFocalY.value = e.focalY;
        })
        .onUpdate((e) => {
            // 2. Establish scale clamps
            const nextScale = Math.min(maxScale, Math.max(minScale, e.scale));
            scale.value = nextScale;

            // 3. Map origin coordinates relative to the center of the image container
            const originX = startFocalX.value - viewWidth.value / 2;
            const originY = startFocalY.value - viewHeight.value / 2;

            // 4. Instagram Math: Scale from center origin + track active drag/pan offset
            translateX.value = originX * (1 - nextScale) + (e.focalX - startFocalX.value);
            translateY.value = originY * (1 - nextScale) + (e.focalY - startFocalY.value);

            if (nextScale > 1.5 && !isHighQuality) {
                runOnJS(setIsHighQuality)(true);
            }
        })
        .onEnd(() => {
            // Snap cleanly back to default layout state
            scale.value = withTiming(1, { duration: 150 });
            translateX.value = withTiming(0, { duration: 150 });
            translateY.value = withTiming(0, { duration: 150 });
            runOnJS(setIsHighQuality)(false);
        });

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { translateY: translateY.value },
            { scale: scale.value },
        ],
    }));

    return (
        <GestureDetector gesture={pinchGesture}>
            <View
                onLayout={onLayout}
                style={[styles.overflowFix, containerStyle]}
                collapsable={false}
            >
                <AnimatedImage
                    source={optimizedSource}
                    recyclingKey={id}
                    style={[style, animatedStyle]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={100}
                />
            </View>
        </GestureDetector>
    );
};

const styles = StyleSheet.create({
    overflowFix: {
        overflow: 'visible', // Ensures the image can render outside its borders smoothly when scaling
        zIndex: 99,         // Layers the active component cleanly over neighboring lists
    },
});

export default memo(PinchableImage);