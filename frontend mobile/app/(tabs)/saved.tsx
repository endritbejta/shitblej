import { Text, View, ScrollView } from 'react-native';
import React from 'react';
import ProductCard from '../../components/productCard'; // Adjust the import as needed

const savedItems = Array.from({ length: 10 }, (_, i) => ({
  _id: `prod-${i + 1}`,
  name: `Product ${i + 1}`,
  description: `This is a short description of product ${i + 1}.`,
  price: (19.99 + i * 5).toFixed(2),
  image: `https://via.placeholder.com/300x200.png?text=Item+${i + 1}`,
  condition: i % 2 === 0 ? 'New' : 'Used',
}));

const Saved = () => {
  return (
    <ScrollView className="flex-1 bg-white px-4 pt-6">
      <Text className="text-xl font-bold mb-4">Saved Items</Text>

      <View className="flex flex-row flex-wrap gap-4">
        {savedItems.map((item) => (
          <ProductCard
            key={item._id}
            id={item._id}
            name={item.name}
            description={item.description}
            price={item.price}
            image={item.image}
            condition={item.condition}
            classes="w-full"
          />
        ))}
      </View>
    </ScrollView>
  );
};

export default Saved;
