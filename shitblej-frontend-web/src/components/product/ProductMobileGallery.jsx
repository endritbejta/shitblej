import { ArrowLeft } from "lucide-react";
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

export default function ProductMobileGallery({ images, productName, onBack }) {
    return (
        <>
            {/* Back Button */}
            <button 
                onClick={onBack}
                className="fixed top-4 left-4 z-10 p-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm rounded-full shadow-lg text-gray-900 dark:text-white"
            >
                <ArrowLeft className="h-5 w-5" />
            </button>

            {/* Image Gallery */}
            <div className="fixed top-0 left-0 right-0 h-[50vh] z-0 overflow-hidden bg-black">
                <div 
                    className="w-full h-full"
                >
                    <Swiper
                        modules={[Pagination]}
                        pagination={{ 
                            clickable: true,
                            bulletClass: 'swiper-pagination-bullet',
                            bulletActiveClass: 'swiper-pagination-bullet-active'
                        }}
                        className="h-full w-full product-detail-swiper"
                    >
                        {images.map((img, index) => (
                            <SwiperSlide key={index}>
                                <img src={img} alt={`${productName} ${index + 1}`} className="w-full h-full object-cover" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </>
    );
}
