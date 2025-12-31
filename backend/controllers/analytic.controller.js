import { database } from "../lib/db.js";

export const getAnalyticsData = async () => {
	const {data: totalUsers, error: totalUsersError } = await database.rpc('get_all_users');
	if(totalUsersError) throw totalUsersError;
	if(!totalUsers) return 'Users not found'

	const {data: totalProducts, error: totalProductsError} = await database.rpc('get_all_products');
	if(totalProductsError) throw totalProductsError;
	if(!totalProducts) return 'Products not found';


	const {data: totalRevenue, error: totalRevenueError} = await database.rpc('get_revenue');
	if(totalRevenueError) throw totalRevenueError;
	if(!totalRevenue) return 'Error with get_revenue';

	const {data: totalSales, error: totalSalesError} = await database.rpc('get_total_sales');
	if(totalSalesError) throw totalSalesError;
	if(!totalSales) return 'Total sales not found';

	return {
		users: totalUsers,
		products: totalProducts,
		totalSales,
		totalRevenue,
	};
};

export const totalRevenueByMonth = async (req, res) => {
	try {
		const { data, error } = await database.rpc("revenue_by_month");
		if (error) return res.status(500).json({ message: error.message });
		return res.status(200).json(data);
	} catch (error) {
		console.error("Error with totalRevenueByMonth controller", error.message);
		return res.status(500).json({ message: "Internal server error"})
	}
}
//revenue_by_day

export const totalRevenueByDay = async (req, res) => {
	try {
		const { data, error } = await database.rpc("revenue_by_day");
		if (error) return res.status(500).json({ message: error.message });
		return res.status(200).json(data);
	} catch (error) {
		console.error("Error with totalRevenueByDay controller", error.message);
		return res.status(500).json({ message: "Internal server error"})
	}
}

