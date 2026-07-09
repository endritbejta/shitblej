import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Link } from 'react-router-dom';
import { FaPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function HeroBanner() {
    const { t } = useTranslation();
    
    const slides = [
        {
            id: 1,
            image: "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2071&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
            titleKey: "hero.slide1_title",
            descriptionKey: "hero.slide1_description",
            buttonTextKey: "hero.shop_now",
            buttonLink: "/collections/all"
        },
        {
            id: 2,
            image: "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1600&q=80",
            titleKey: "hero.slide2_title",
            descriptionKey: "hero.slide2_description",
            buttonTextKey: "hero.start_selling",
            buttonLink: "/sell",
            showIcon: true
        }
    ];

    return (
        <div className="w-full h-[500px] relative group">
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={0}
                slidesPerView={1}
                navigation
                pagination={{ clickable: true }}
                autoplay={{ delay: 5000, disableOnInteraction: false }}
                loop={true}
                className="w-full h-full"
            >
                {slides.map((slide) => (
                    <SwiperSlide key={slide.id}>
                        <div className="relative w-full h-full">
                            {/* Background Image */}
                            <div 
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                                style={{ backgroundImage: `url(${slide.image})` }}
                            >
                                {/* Overlay for better text contrast if needed, though island handles it */}
                                <div className="absolute inset-0 bg-black/10"></div>
                            </div>

                            {/* Content Island */}
                            <div className="absolute inset-0 flex items-center justify-center md:justify-start md:px-20 lg:px-12">
                                <div className="bg-white dark:bg-zinc-900/90 backdrop-blur-sm p-8 md:p-10 rounded-2xl shadow-2xl max-w-[90%] md:max-w-lg mx-4 transform transition-transform hover:scale-[1.02] duration-300">
                                    <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white mb-4 leading-tight">
                                        {t(slide.titleKey)}
                                    </h2>
                                    <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                                        {t(slide.descriptionKey)}
                                    </p>
                                    <Link 
                                        to={slide.buttonLink}
                                        className="inline-flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-green-500/30 transition-all transform hover:-translate-y-1"
                                    >
                                        {slide.showIcon && <FaPlus />}
                                        {t(slide.buttonTextKey)}
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
            
            {/* Custom CSS for Swiper dots to match theme */}
            <style>{`
                .swiper-button-next, .swiper-button-prev {
                    color: white;
                    text-shadow: 0 2px 4px rgba(0,0,0,0.3);
                    width: 20px;
                    height: 20px;
                    mix-blend-mode: difference;
                }
                .swiper-button-next::after, .swiper-button-prev::after {
                    font-size: 18px;
                }
                .swiper-pagination-bullet-active {
                    background-color: #22c55e !important;
                }
                .swiper-pagination-bullet {
                    background-color: white;
                    opacity: 0.8;
                }
            `}</style>
        </div>
    );
}
