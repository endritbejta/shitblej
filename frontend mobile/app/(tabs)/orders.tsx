import { Text, View, FlatList } from 'react-native';
import React from 'react';

const sampleOrders = Array.from({ length: 15 }, (_, i) => ({
  id: `ORD-${1000 + i}`,
  product: `Product ${i + 1}`,
  date: `2025-04-${(10 + i).toString().padStart(2, '0')}`,
  status: i % 2 === 0 ? 'Delivered' : 'Processing',
}));

const Orders = () => {
  return (
    <View className="flex-1 bg-white px-4 pt-6">
      <Text className="text-xl font-bold mb-4">My Orders</Text>
      <FlatList
        data={sampleOrders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="bg-gray-100 p-4 rounded-lg mb-3">
            <Text className="font-semibold mb-1">{item.id}</Text>
            <Text>{item.product}</Text>
            <Text>{item.date}</Text>
            <Text className={item.status === 'Delivered' ? 'text-green-600' : 'text-orange-500'}>
              {item.status}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

export default Orders;
