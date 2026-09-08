import {
    Sparkles,
    User,
    Gem,
    Baby,
    Home,
    Cpu,
    Film,
    Palette,
    Trophy,
} from 'lucide-react';

// Product Categories. `icon` is a lucide component (single icon family across
// the app); `children` powers the header mega-menu.
export const CATEGORIES = [
    { id: 'ladies', label: 'Ladies', icon: Sparkles, children: ['Dresses', 'Tops', 'Shoes', 'Bags', 'Accessories'] },
    { id: 'men', label: 'Men', icon: User, children: ['Shirts', 'Jackets', 'Shoes', 'Watches', 'Accessories'] },
    { id: 'designer-items', label: 'Designer Items', icon: Gem, children: ['Handbags', 'Sunglasses', 'Jewelry', 'Shoes', 'Watches'] },
    { id: 'children', label: 'Children', icon: Baby, children: ['Toys', 'Clothing', 'Strollers', 'Shoes', 'Books'] },
    { id: 'home', label: 'Home', icon: Home, children: ['Furniture', 'Decor', 'Kitchen', 'Lighting', 'Textiles'] },
    { id: 'electronics', label: 'Electronics', icon: Cpu, children: ['Phones', 'Laptops', 'Audio', 'Cameras', 'Gaming'] },
    { id: 'entertainment', label: 'Entertainment', icon: Film, children: ['Instruments', 'Vinyl', 'Books', 'Movies', 'Games'] },
    { id: 'hobby-collector', label: 'Hobby & Collector Items', icon: Palette, children: ['Vintage', 'Models', 'Coins', 'Art', 'Trading Cards'] },
    { id: 'sport', label: 'Sport', icon: Trophy, children: ['Bikes', 'Fitness', 'Outdoor', 'Team Sports', 'Winter'] },
];

// Product Conditions
export const CONDITIONS = [
    { id: 'new', label: 'Brand New' },
    { id: 'like-new', label: 'Like New' },
    { id: 'excellent', label: 'Excellent' },
    { id: 'good', label: 'Good' },
    { id: 'fair', label: 'Fair' },
    { id: 'poor', label: 'For Parts' },
];

// Clothing Sizes
export const CLOTHING_SIZES = [
    { id: 'xs', label: 'XS' },
    { id: 's', label: 'S' },
    { id: 'm', label: 'M' },
    { id: 'l', label: 'L' },
    { id: 'xl', label: 'XL' },
    { id: 'xxl', label: 'XXL' },
    { id: 'xxxl', label: 'XXXL' },
];

// Shoe Sizes (US)
export const SHOE_SIZES = [
    { id: '6', label: 'US 6' },
    { id: '6.5', label: 'US 6.5' },
    { id: '7', label: 'US 7' },
    { id: '7.5', label: 'US 7.5' },
    { id: '8', label: 'US 8' },
    { id: '8.5', label: 'US 8.5' },
    { id: '9', label: 'US 9' },
    { id: '9.5', label: 'US 9.5' },
    { id: '10', label: 'US 10' },
    { id: '10.5', label: 'US 10.5' },
    { id: '11', label: 'US 11' },
    { id: '11.5', label: 'US 11.5' },
    { id: '12', label: 'US 12' },
    { id: '13', label: 'US 13' },
    { id: '14', label: 'US 14' },
];

// Colors
export const COLORS = [
    { id: 'black', label: 'Black', hex: '#000000' },
    { id: 'white', label: 'White', hex: '#FFFFFF' },
    { id: 'gray', label: 'Gray', hex: '#808080' },
    { id: 'red', label: 'Red', hex: '#FF0000' },
    { id: 'blue', label: 'Blue', hex: '#0000FF' },
    { id: 'green', label: 'Green', hex: '#00FF00' },
    { id: 'yellow', label: 'Yellow', hex: '#FFFF00' },
    { id: 'orange', label: 'Orange', hex: '#FFA500' },
    { id: 'purple', label: 'Purple', hex: '#800080' },
    { id: 'pink', label: 'Pink', hex: '#FFC0CB' },
    { id: 'brown', label: 'Brown', hex: '#A52A2A' },
    { id: 'beige', label: 'Beige', hex: '#F5F5DC' },
];

// Brands (Popular ones)
export const BRANDS = [
    'Apple',
    'Samsung',
    'Nike',
    'Adidas',
    'Sony',
    'LG',
    'Dell',
    'HP',
    'Lenovo',
    'Canon',
    'Nikon',
    'Zara',
    'H&M',
    'Uniqlo',
    'IKEA',
    'Other',
];

// Sort Options
export const SORT_OPTIONS = [
    { id: 'newest', label: 'Newest First' },
    { id: 'oldest', label: 'Oldest First' },
    { id: 'price-low', label: 'Price: Low to High' },
    { id: 'price-high', label: 'Price: High to Low' },
    { id: 'popular', label: 'Most Popular' },
];

// Price Ranges
export const PRICE_RANGES = [
    { id: 'under-25', label: 'Under $25', min: 0, max: 25 },
    { id: '25-50', label: '$25 - $50', min: 25, max: 50 },
    { id: '50-100', label: '$50 - $100', min: 50, max: 100 },
    { id: '100-250', label: '$100 - $250', min: 100, max: 250 },
    { id: '250-500', label: '$250 - $500', min: 250, max: 500 },
    { id: 'over-500', label: 'Over $500', min: 500, max: null },
];

// Locations (Kosovo cities)
export const LOCATIONS = [
    'Prishtina',
    'Prizren',
    'Peja',
    'Gjakova',
    'Gjilan',
    'Mitrovica',
    'Ferizaj',
    'Vushtrri',
    'Podujeva',
    'Other',
];

// Trending search terms surfaced in the search overlay.
export const TRENDING_SEARCHES = [
    'Vintage camera',
    'Designer bags',
    'Sneakers',
    'PlayStation',
    'Denim jacket',
    'LEGO',
    'Road bike',
    'Vinyl records',
];

// Curated collections used on the homepage and search overlay.
//
// No `w=` here on purpose. SmartImage builds a responsive srcset from these
// URLs (see lib/imageUrl.js), and a width baked in here would cap every
// candidate at that size - these were pinned at w=1200 and downloading
// 64-168 KiB each into tiles that are at most half the container wide.
export const FEATURED_COLLECTIONS = [
    {
        id: 'designer-items',
        title: 'Designer Edit',
        subtitle: 'Authenticated luxury',
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&auto=format&fit=crop',
    },
    {
        id: 'electronics',
        title: 'Tech & Gadgets',
        subtitle: 'Phones, consoles, audio',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&auto=format&fit=crop',
    },
    {
        id: 'hobby-collector',
        title: "Collector's Corner",
        subtitle: 'Rare & vintage finds',
        image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?q=80&auto=format&fit=crop',
    },
    {
        id: 'sport',
        title: 'Sport & Outdoor',
        subtitle: 'Gear that moves',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&auto=format&fit=crop',
    },
];

// App Configuration
export const APP_CONFIG = {
    name: 'SHITBLEJ',
    defaultLanguage: 'en',
    supportedLanguages: ['en', 'sq', 'sr'],
    currency: 'USD',
    maxImageUpload: 10,
    maxImageSize: 5 * 1024 * 1024, // 5MB
};
