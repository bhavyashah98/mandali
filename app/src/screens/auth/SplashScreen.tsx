import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { MaterialIcons } from '@expo/vector-icons';

const SplashScreen = () => {
    const navigation = useNavigation<any>();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigation.navigate('Login');
        }, 1500);
        return () => clearTimeout(timer);
    }, [navigation]);

    return (
        <View className="flex-1 bg-background items-center justify-center overflow-hidden">
            {/* Background Splash Glow (simulated with a large blurry circle) */}
            <View style={styles.glowCircle} />

            {/* Background Organic Shape */}
            <View style={styles.svgContainer}>
                <Svg style={{ opacity: 0.3 }} width={300} height={300} viewBox="-100 -100 200 200">
                    <Path
                        fill="#ffb0cc"
                        d="M44.7,-76.4C58.1,-69.2,69.2,-58.1,77.3,-44.7C85.4,-31.3,90.5,-15.7,89.3,-0.7C88.1,14.3,80.6,28.6,71.5,41.2C62.4,53.8,51.7,64.7,39.1,72.4C26.5,80.1,13.2,84.6,-0.7,85.8C-14.6,87,-29.2,84.9,-42.1,77.4C-55,69.9,-66.2,57,-74.6,42.5C-83,28.1,-88.6,12.1,-88.2,-3.7C-87.8,-19.5,-81.4,-35.1,-71.2,-47.8C-61,-60.5,-47.1,-70.3,-33.1,-77.1C-19.1,-83.9,-4.9,-87.7,10.2,-86C25.3,-84.3,31.3,-83.6,44.7,-76.4Z"
                    />
                </Svg>
            </View>

            {/* Center Layout */}
            <View className="items-center z-10">
                {/* Icon Motif */}
                <View className="relative items-center justify-center mb-8">
                    {/* Outer Ring */}
                    <View className="w-32 h-32 rounded-full border-4 items-center justify-center" style={{ borderColor: 'rgba(179,0,105,0.2)' }}>
                        {/* Inner Symbol */}
                        <LinearGradient
                            colors={['#b30069', '#df0e84']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="w-24 h-24 rounded-full items-center justify-center shadow-lg shadow-primary"
                        >
                            <MaterialIcons name="diversity-3" size={48} color="white" />
                        </LinearGradient>
                    </View>

                    {/* Floating Decorative Elements */}
                    <View className="absolute -top-4 -right-4 w-8 h-8 rounded-full bg-secondary-container opacity-20" />
                    <View className="absolute -bottom-2 -left-6 w-12 h-12 rounded-full opacity-10" style={{ backgroundColor: '#69df54' }} />
                </View>

                {/* App Branding */}
                <View className="items-center">
                    <Text className="text-primary font-headline-bold-italic" style={styles.headline}>
                        Mandali
                    </Text>
                    <Text className="text-on-surface-variant font-body-medium uppercase mt-3" style={styles.tagline}>
                        Your group's companion
                    </Text>
                </View>
            </View>

            {/* Progress Indicator */}
            <View className="absolute bottom-24 flex-row space-x-2">
                <View className="w-2 h-2 rounded-full bg-primary" style={{ opacity: 0.4 }} />
                <View className="w-2 h-2 rounded-full bg-primary" style={{ opacity: 0.2 }} />
                <View className="w-2 h-2 rounded-full bg-primary" style={{ opacity: 0.1 }} />
            </View>

            {/* Footer Visual */}
            <LinearGradient
                colors={['rgba(247, 243, 237, 0)', 'rgba(247, 243, 237, 0.8)']}
                className="absolute bottom-0 w-full h-32"
                pointerEvents="none"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    glowCircle: {
        position: 'absolute',
        width: 600,
        height: 600,
        borderRadius: 300,
        backgroundColor: 'rgba(223, 14, 132, 0.05)',
        alignSelf: 'center',
    },
    svgContainer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 0,
        opacity: 0.3,
    },
    headline: {
        fontSize: 60,
        letterSpacing: -1,
        lineHeight: 72,
    },
    tagline: {
        fontSize: 18,
        letterSpacing: 1.8,
        opacity: 0.8,
    }
});

export default SplashScreen;
