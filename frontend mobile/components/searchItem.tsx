import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';

interface SearchItemProps {
  name: string;
  productId: string;
}

const SearchItem: React.FC<SearchItemProps> = ({ name, productId }) => {
    console.log('productID fomr searchItem: ', productId)
  return (
    <Link href={`/products/${productId}`} className="flex-row w-full border-b-[1px] border-b-black items-center p-3  mb-2 justify-between">
        <View className='flex-row justify-between items-center'>
            <Text className="text-black flex-1">{name}</Text>
            <Ionicons name="chevron-forward" size={20} color="green"  className='ml-auto'/>
        </View>
    </Link>
  );
};

export default SearchItem;
