import React, { useEffect, useState, useCallback } from 'react';
import { View, TextInput, Text, ActivityIndicator, ScrollView } from 'react-native';
import { debounce } from 'lodash';
import SearchItem from './searchItem';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);


  // Function to fetch products from the backend
  const fetchProducts = async (query: string) => {
    setLoading(true);

    try {
      const response = await fetch(`http://192.168.1.239:3000/api/v1/products?name=${query}`);
      const data = await response.json();

      if (data.success) {
        setSearchResults(data.data);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Memoize the debounced version of the fetchProducts function
  const debouncedFetchProducts = useCallback(
    debounce((query) => fetchProducts(query), 1000),
    [] // Empty array ensures this function is created only once
  );

  // Update searchTerm and call debounced fetchProducts
  const handleSearchChange = (text: string) => {
    setSearchTerm(text);
    debouncedFetchProducts(text);
  };

  return (
    <View className="relative mb-4 ">
      <TextInput
        className="border-none p-2 border-2 text-black rounded-xl"
        placeholder="Search for products..."
        placeholderTextColor="#9ca3af" // Tailwind's gray-400
        value={searchTerm}
        onChangeText={handleSearchChange}
      />


      {loading && <ActivityIndicator size="large" className="mt-4" />}

      {searchResults.length > 0 && (
        <View className="bottom-0 translate-y-[100%] absolute left-0 right-0 bg-white border-t border-gray-300 z-10">
          <ScrollView className="max-h-60">
            {searchResults.map((product) => (
              <SearchItem
                key={product._id}
                name={product.name}
                productId={product._id}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {searchResults.length === 0 && !loading && searchTerm && (
        <Text className="text-center mt-4 text-gray-500">No products found.</Text>
      )}
    </View>
  );
};

export default Search;
