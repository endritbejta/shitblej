import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';

const Header = () => {
  const router = useRouter();

  return (
    <View className="w-full px-4 flex-row items-center justify-between bg-background">
      {/* Logo + tagline */}
      <View className="flex items-center">
        <Svg height="40" width="120" className='text-[#4b7b6f]'>
          <SvgText
            fill="#4b7b6f"
            stroke="#4b7b6f"
            fontSize="24"
            fontWeight="bold"
            x="0"
            y="28"
          >
            SHITBLEJ
          </SvgText>
        </Svg>
      </View>

      {/* Settings Icon */}
      <TouchableOpacity>
        <Ionicons name="settings-outline" size={24} color="black" />
      </TouchableOpacity>
    </View>
  );
};

export default Header;
