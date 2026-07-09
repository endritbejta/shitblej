import { Tabs } from 'expo-router';
import HomeIcon from '../../assets/icons/home';
import UserIcon from '../../assets/icons/user';
import SearchIcon from '../../assets/icons/search';
import BookmarkIcon from '../../assets/icons/bookmark';
import MyOrdersIcon from '../../assets/icons/orders';

export default function _layout() {
  return (
    <Tabs
      screenOptions={{
        animation:"fade",
        tabBarStyle: {
          backgroundColor: '#FAF9F6',
          paddingBottom: 0,
        },
        tabBarActiveTintColor: '#4b7b6f',   // Match icon color
        tabBarInactiveTintColor: 'black',   // Default text/icon color when not active
        tabBarLabelStyle: {
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name='index'
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <HomeIcon width={24} height={24} color={color} fill={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="user"
        options={{
          title: 'User',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <UserIcon width={24} height={24} color={color} fill={color === '#4b7b6f' ? '#4b7b6f' : 'none'} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <MyOrdersIcon width={24} height={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: 'Saved',
          headerShown: false,
          tabBarIcon: ({ color }) => (
            <BookmarkIcon width={24} height={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
