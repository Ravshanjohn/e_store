const LoadingSpinner = () => {
	return (
		<div className='flex items-center justify-center min-h-screen bg-gray-900'>
			<div className='relative w-10 h-10'>
				<div className="w-full h-full border-2 border-emerald-200 rounded-full"  />
				<div className="absolute inset-0 border-2 border-t-2 border-t-red-700 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"/>
			</div>
		</div>
	);
};

export default LoadingSpinner;
