import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "./ProductCard";

const FeaturedProducts = ({ featuredProducts }) => {
	const [isDragging, setIsDragging] = useState(false);
	const [startX, setStartX] = useState(0);
	const [scrollLeft, setScrollLeft] = useState(0);
	const [canScrollLeft, setCanScrollLeft] = useState(false);
	const [canScrollRight, setCanScrollRight] = useState(true);

	const scrollContainerRef = useRef(null);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (container) {
			const handleScroll = () => {
				const { scrollLeft, scrollWidth, clientWidth } = container;
				const isAtStart = scrollLeft <= 2;
				const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 2;
				
				setCanScrollLeft(!isAtStart);
				setCanScrollRight(!isAtEnd && scrollWidth > clientWidth);
			};

			container.addEventListener("scroll", handleScroll);
			window.addEventListener("resize", handleScroll);
			
			
			handleScroll();
			const timer = setTimeout(handleScroll, 100);
			
			return () => {
				container.removeEventListener("scroll", handleScroll);
				window.removeEventListener("resize", handleScroll);
				clearTimeout(timer);
			};
		}
	}, [featuredProducts]);

	const handleMouseDown = (e) => {
		setIsDragging(true);
		setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
		setScrollLeft(scrollContainerRef.current.scrollLeft);
	};

	const handleMouseMove = (e) => {
		if (!isDragging) return;
		e.preventDefault();
		const x = e.pageX - scrollContainerRef.current.offsetLeft;
		const walk = (x - startX) * 2;
		scrollContainerRef.current.scrollLeft = scrollLeft - walk;
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const handleMouseLeave = () => {
		setIsDragging(false);
	};

	const scroll = (direction) => {
		const container = scrollContainerRef.current;
		if (container) {
			const scrollAmount = direction === "left" ? -container.clientWidth : container.clientWidth;
			container.scrollBy({ left: scrollAmount, behavior: "smooth" });
		}
	};

	return (
		<div className='py-12'>
			<div className='container mx-auto px-4'>
				<h2 className='text-center text-5xl sm:text-6xl font-bold text-emerald-400 mb-8'>Featured</h2>
				<div className='relative'>
					<div 
						ref={scrollContainerRef}
						className='overflow-x-auto scrollbar-hide cursor-grab active:cursor-grabbing'
						onMouseDown={handleMouseDown}
						onMouseMove={handleMouseMove}
						onMouseUp={handleMouseUp}
						onMouseLeave={handleMouseLeave}
						style={{ 
							scrollBehavior: isDragging ? 'auto' : 'smooth',
							userSelect: 'none'
						}}
					>
						<div className='flex gap-6 pb-4 items-stretch'>
							{featuredProducts?.map((product) => (
								<div key={product.id} className='w-full sm:w-1/2 lg:w-1/3 xl:w-1/4 flex-shrink-0 flex'>
									<ProductCard key={product.id} product={product} />
								</div>
							))}
						</div>
					</div>
					<button
						onClick={() => scroll("left")}
						disabled={!canScrollLeft}
						className={`absolute top-1/2 -left-4 transform -translate-y-1/2 p-3 rounded-full transition-all duration-300 z-10 shadow-lg ${
							!canScrollLeft 
								? "bg-gray-600 cursor-not-allowed opacity-50" 
								: "bg-emerald-600 hover:bg-emerald-500 hover:scale-110"
						}`}
					>
						<ChevronLeft className='w-6 h-6 text-white' />
					</button>

					<button
						onClick={() => scroll("right")}
						disabled={!canScrollRight}
						className={`absolute top-1/2 -right-4 transform -translate-y-1/2 p-3 rounded-full transition-all duration-300 z-10 shadow-lg ${
							!canScrollRight 
								? "bg-gray-600 cursor-not-allowed opacity-50" 
								: "bg-emerald-600 hover:bg-emerald-500 hover:scale-110"
						}`}
					>
						<ChevronRight className='w-6 h-6 text-white' />
					</button>
				</div>
			</div>
		</div>
	);
};
export default FeaturedProducts;
