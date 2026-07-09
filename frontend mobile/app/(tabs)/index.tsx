import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View, Text, ActivityIndicator, useWindowDimensions, Image } from 'react-native';
import { Link } from 'expo-router';
import ProductCard from '../../components/productCard';
import Search from '../../components/search';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category?: string;
  condition?: string;
  size?: string;
  brand?: string;
  classes?: string;
}

export default function Index() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadTriggerVisible, setLoadTriggerVisible] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchProducts = async (currentPage = 1) => {
    if (currentPage > 1) setLoadingMore(true);
    try {
      const response = await fetch(`http://192.168.1.239:3000/api/v1/products?page=${currentPage}&limit=10`);
      const resources = await response.json();

      if (resources.success) {
        setProducts(prev => {
          const merged = [...prev, ...resources.data];
          const unique = Array.from(new Map(merged.map(item => [item._id, item])).values());
          return unique;
        });

        if (resources.pagination?.next) {
          setPage(resources.pagination.next.page);
          setHasMore(true);
        } else {
          setHasMore(false);
        }
      } else {
        console.error('Failed to fetch products');
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setHasMore(false);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Handle search query
  const handleSearch = (query: string) => {
    setLoading(true);
    setProducts([]);  // Clear previous products when searching
    fetchProducts(query);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (loadTriggerVisible && hasMore && !loadingMore) {
      timeoutRef.current = setTimeout(() => {
        fetchProducts(page);
      }, 1000);
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [loadTriggerVisible]);

  if (loading && products.length === 0) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-200">
        <Text className="text-xl text-gray-700">Loading products...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-background flex-1 h-full w-full"
      contentContainerStyle={{ padding: 16 }}
      onScroll={({ nativeEvent }) => {
        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
        const isNearBottom =
          layoutMeasurement.height + contentOffset.y >= contentSize.height - 100;
        setLoadTriggerVisible(isNearBottom);
      }}
      scrollEventThrottle={100}
    >
      <Search onSearch={handleSearch} />
      <Text className="bg-primary-100 text-center p-3 rounded-xl mb-4 !text-yellow-50 font-bold uppercase">
        Welcome to Shaci&apos;s Store!
      </Text>

      <View className="w-full aspect-[4/3] rounded-xl overflow-hidden mb-6 relative">
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1611048268330-53de574cae3b?q=80&w=3272&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' }}
          className="w-full h-full"
        />
        <View className='p-3 absolute bottom-0 left-0 w-full bg-[rgba(255,255,255,0.7)]'>
          <Text className="text-black text-lg font-semibold text-center uppercase">Çpraze dollapin</Text>
          <Text className="text-black text-lg font-semibold text-center uppercase">Mos le sen nto</Text>
        </View>
      </View>      

      <View className="flex flex-row flex-wrap gap-4">
        {products.map(item => (
          <ProductCard
            key={item._id}
            id={item._id}
            name={item.name}
            description={item.description}
            price={item.price}
            image={item.image}
            condition={item.condition}
            classes=""
          />
        ))}
      </View>

      {hasMore && 
        <View className="mt-6 items-center">
            <ActivityIndicator size="large" className='text-pine-300' />  
        </View>
        }     
    </ScrollView>
  );
}
