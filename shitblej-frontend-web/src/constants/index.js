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

// Price Ranges
export const PRICE_RANGES = [
    { id: 'under-25', label: 'Under $25', min: 0, max: 25 },
    { id: '25-50', label: '$25 - $50', min: 25, max: 50 },
    { id: '50-100', label: '$50 - $100', min: 50, max: 100 },
    { id: '100-250', label: '$100 - $250', min: 100, max: 250 },
    { id: '250-500', label: '$250 - $500', min: 250, max: 500 },
    { id: 'over-500', label: 'Over $500', min: 500, max: null },
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
export const FEATURED_COLLECTIONS = [
    {
        id: 'designer-items',
        title: 'Designer Edit',
        subtitle: 'Authenticated luxury',
        image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1200&auto=format&fit=crop',
    },
    {
        id: 'electronics',
        title: 'Tech & Gadgets',
        subtitle: 'Phones, consoles, audio',
        image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?q=80&w=1200&auto=format&fit=crop',
    },
    {
        id: 'hobby-collector',
        title: "Collector's Corner",
        subtitle: 'Rare & vintage finds',
        image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?q=80&w=1200&auto=format&fit=crop',
    },
    {
        id: 'sport',
        title: 'Sport & Outdoor',
        subtitle: 'Gear that moves',
        image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?q=80&w=1200&auto=format&fit=crop',
    },
];
