import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ShoppingCart } from "lucide-react";
import { useUserStore } from "../stores/useUserStore";
import { useCartStore } from "../stores/useCartStore";

const ProductCard = ({ product }) => {
	const { user } = useUserStore();
	const { addToCart } = useCartStore();
	const [imageLoaded, setImageLoaded] = useState(false);
	const [imageError, setImageError] = useState(false);

	const handleAddToCart = async () => {
		if (!user) {
			toast.error("Please login to add products to cart", { id: "login" });
			return;
		} else {
			// add to cart
			await addToCart(product);
		}
	};

	

	return (
		<div className='flex w-full h-full relative flex-col overflow-hidden rounded-lg border border-gray-700 shadow-lg bg-gray-900 transition-transform duration-300 hover:scale-105'>
			<div className='relative mx-3 mt-3 h-48 overflow-hidden rounded-xl bg-gray-800'>
				{!imageLoaded && !imageError && (
					<div className='absolute inset-0 flex items-center justify-center'>
						<div className='w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin' />
					</div>
				)}
				{imageError ? (
					<div className='absolute inset-0 flex items-center justify-center bg-gray-800'>
						<div className='text-center text-gray-400'>
							<ShoppingCart size={48} className='mx-auto mb-2 opacity-50' />
							<p className='text-sm'>Image unavailable</p>
						</div>
					</div>
				) : (
					<img
						className={`w-full h-full object-cover transition-opacity duration-300 ${
							imageLoaded ? 'opacity-100' : 'opacity-0'
						}`}
						src={product.image_url}
						alt={product.name || 'product image'}
						onLoad={() => setImageLoaded(true)}
						onError={() => setImageError(true)}
						loading='lazy'
					/>
				)}
				<div className='absolute inset-0 bg-gradient-to-t from-black/60 to-transparent' />
				<span
					className={`absolute top-3 right-3 px-2 py-1 text-xs font-semibold rounded-md shadow-sm ${
						product.stock <= 10 ? 'bg-red-600 text-white' : 'bg-emerald-700 text-white'
					}`}
				>
					{product.stock ?? product.quantity ?? '—'} left
				</span>
			</div>

			<div className='mt-4 px-5 pb-5 flex flex-col flex-1'>
				<h3 className='text-lg font-semibold tracking-tight text-white'>{product.name}</h3>
				<div className='mt-3 mb-4'>
					<span className='text-2xl font-bold text-emerald-400'>${product.sale_price}</span>
				</div>

				<button
					className='flex items-center justify-center gap-2 mt-auto w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-4 focus:ring-emerald-300'
					onClick={handleAddToCart}
				>
					<ShoppingCart size={20} />
					Add to cart
				</button>
			</div>
		</div>
	);
};
export default ProductCard;
