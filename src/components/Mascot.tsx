import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle } from 'react-native';

type Props = {
  size?: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

export function Mascot({ size = 220, style, imageStyle }: Props) {
  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Image
        source={require('../../assets/mascot/mascot.png')}
        style={[{ width: size, height: size }, imageStyle]}
        resizeMode="contain"
      />
    </View>
  );
}
