const LoadingSpinner = () => {
	return (
		<div
			aria-live="polite"
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
		>
			<div className="relative w-12 h-12">
				<div className="w-full h-full border-2 border-emerald-500 rounded-full" />
				<div className="absolute inset-0 border-2 border-t-2 border-t-red-400 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin" />
			</div>
		</div>
	);
};

export default LoadingSpinner;
