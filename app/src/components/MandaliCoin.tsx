import React from 'react';
import { View, Text, ViewStyle, Platform } from 'react-native';

interface MandaliCoinProps {
  size?: number;
  style?: ViewStyle;
  color?: string;
}

const MandaliCoin: React.FC<MandaliCoinProps> = ({ size = 20, style, color = '#f59e0b' }) => {
  return (
    <View style={[{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: size * 0.08,
      borderColor: '#d97706',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 1,
      elevation: 2,
      // Alignment fix: move coin slightly down to match text baseline center
      transform: [{ translateY: size * 0.02 }]
    }, style]}>
      <Text style={{
        color: 'white',
        fontSize: size * 0.65,
        fontWeight: '900',
        textAlign: 'center',
        textAlignVertical: 'center',
        includeFontPadding: false,
        backgroundColor: 'transparent',
        // Adjust position slightly for different OS
        ...Platform.select({
          ios: { marginTop: -size * 0.05 },
          android: { marginTop: -size * 0.1 }
        })
      }}>M</Text>
    </View>
  );
};

export default MandaliCoin;
