// pages/products/[id].tsx
import React, { useEffect, useState } from 'react';
import { View, Text, Button, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const Product = () => {
  const { id } = useLocalSearchParams();  // Get the 'id' from route parameters
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`http://192.168.1.239:3000/api/v1/products/${id}`);
        const resource = await response.json();
        setProduct(resource.data);
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Loading state
  if (loading) {
    return (
        <View className='bg-background'>
          <TouchableOpacity onPress={() => router.back()} className="p-2">
            <MaterialIcons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#0000ff" />
          </View>
        </View>
    );
  }

  // Not found state
  if (!product) {
    return (
      <View className="flex-1 bg-background">
        <TouchableOpacity onPress={() => router.back()} className="p-2">
          <MaterialIcons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View className="flex-1 justify-center items-center">
          <MaterialIcons name="warning" size={48} color="#f59e0b" />
          <Text className="mt-4 text-lg font-semibold text-gray-700">Product not found.</Text>
        </View>
      </View>
    );
  }

  // Success state
  return (
    <View className="flex-1 bg-background">
      <TouchableOpacity onPress={() => router.back()} className="p-2 left-2 z-10">
        <MaterialIcons name="arrow-back" size={24} color="#4b7b6f" />
      </TouchableOpacity>
      <View className="p-4 py-0 flex-1">
        {/* Product Image */}
        {product.image && (
          <Image
            source={{ uri: product.image }}
            className="w-full h-64 rounded-xl mb-4"
            resizeMode="cover"
          />
        )}

        {/* Product Details */}
        <Text className="text-2xl font-bold text-gray-800">{product.name}</Text>
        <Text className="text-xl text-green-600 mt-2">${product.price}</Text>
        <Text className="text-sm text-gray-600 mt-3">{product.description}</Text>
        <View className="mt-4">
          <Button title="Buy Now" onPress={() => alert("Product added to cart")} />
        </View>
      </View>
    </View>
  );
};

export default Product;
