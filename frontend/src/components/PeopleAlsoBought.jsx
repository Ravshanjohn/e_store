import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
// import axios from "../lib/axios";
// import toast from "react-hot-toast";
import LoadingSpinner from "./LoadingSpinner";

const PeopleAlsoBought = () => {
	// const [recommendations, setRecommendations] = useState([]);
	const [isLoading, setIsLoading] = useState(false);

	// useEffect(() => {
	// 	const fetchRecommendations = async () => {
	// 		try {
	// 			const res = await axios.get("/products/recommendations");
	// 			setRecommendations(res.data);
	// 		} catch (error) {
	// 			toast.error(error.response.data.message || "An error occurred while fetching recommendations");
	// 		} finally {
	// 			setIsLoading(false);
	// 		}
	// 	};

	// 	fetchRecommendations();
	// }, []);

	if (isLoading) return <LoadingSpinner />;

	return (
		<div className='mt-8'>
			<h3 className='text-2xl font-semibold text-emerald-400'>People also bought</h3>
			<div className='mt-6 text-gray-400'>
				Recommendations are not available.
			</div>
		</div>
	);
};
export default PeopleAlsoBought;
