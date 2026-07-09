import { Text, View, Image } from 'react-native';
import React from 'react';

const User = () => {
  return (
    <View className="flex-1 items-center justify-center bg-white px-4">
      {/* Placeholder profile image */}
      <View className="w-32 h-32 rounded-full bg-gray-200 mb-4 overflow-hidden">
        <Image
          source={{ uri: 'https://via.placeholder.com/150' }}
          className="w-full h-full"
          resizeMode="cover"
        />
      </View>

      {/* User info */}
      <Text className="text-xl font-bold text-gray-800 mb-1">John Doe</Text>
      <Text className="text-gray-500 mb-4">johndoe@example.com</Text>

      {/* Extra info */}
      <View className="w-full border-t border-gray-200 pt-4 space-y-2">
        <Text className="text-gray-700">Username: johndoe123</Text>
        <Text className="text-gray-700">Location: New York, USA</Text>
        <Text className="text-gray-700">Joined: Jan 12, 2022</Text>
      </View>
    </View>
  );
};

export default User;
