import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { Feather } from '@expo/vector-icons';

interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: number;
  image: string;
  category?: string;
  condition?: string;
  size?: string;
  brand?: string;
  classes?: string;
}

const ProductCard: React.FC<ProductCardProps> = ({ id, name, price, image, classes, condition }) => {
  return (
    <Link
      href={`/products/${id}`}
      className={`self-stretch w-[47.5%] ${classes} box-border rounded-xl flex flex-col`}
    >
      <View className="w-full flex-1 h-full">
        <View className="w-full relative">
          <Image
            source={{ uri: `${image}?w=200&auto=format` }}
            className="w-full min-w-[100%] bg-gray-200"
            style={{ width: '100%', height: 200, borderRadius: 8, objectFit: 'cover' }}
          />
          {/* Heart Icon */}
          <TouchableOpacity
            className="absolute bottom-[5px] right-[5px] rounded-full p-2 bg-white shadow-slate-300"
            onPress={() => {
              // Like logic here
              console.log(`Liked product ${id}`);
            }}
          >
            <Feather name="heart" size={15} color="black" className='text-white'/>
          </TouchableOpacity>
        </View>

        <Text className="text-lg font-semibold text-gray-800 mt-2 w-full">{name}</Text>
        <Text className="text-sm text-gray-600 mt-1 w-full">{condition}</Text>
        <Text className="text-xl font-bold self-center text-center mt-auto text-chestnut-300">
          ${price}
        </Text>
      </View>
    </Link>
  );
};

export default ProductCard;
