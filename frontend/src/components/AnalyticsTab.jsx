import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import axios from "../lib/axios";
import { Users, Package, ShoppingCart, DollarSign } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import LoadingSpinner from "./LoadingSpinner.jsx";

const AnalyticsTab = () => {
	const [analyticsData, setAnalyticsData] = useState({
		users: 0,
		products: 0,
		totalSales: 0,
		totalRevenue: 0,
	});
	const [isLoading, setIsLoading] = useState(true);
	const [dailySalesData, setDailySalesData] = useState([]);

	useEffect(() => {
		const fetchAnalyticsData = async () => {
			try {
				const infoSales = await axios.get("/analytics/revenue-by-day");
				// Transform data to ensure proper format for the chart
				const formattedData = infoSales.data.map(item => ({
					day: item.day || item.date || item.order_date,
					revenue: Number(item.revenue) || 0,
					sales: Number(item.sales) || Number(item.total_sales) || 0
				}));
				setDailySalesData(formattedData);
				console.log("Daily Sales Data:", formattedData);
				
				const infoAnalytics = await axios.get("/analytics");
				setAnalyticsData(infoAnalytics.data.analyticsData);
			} catch (error) {
				console.error("Error fetching analytics data:", error);
			} finally {
				setIsLoading(false);
			}
		};

		fetchAnalyticsData();
	}, []);

	if (isLoading) {
		return <LoadingSpinner />;
	}

	return (
		<div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
			<div className='mb-8'>
				<h2 className='text-3xl font-bold text-white mb-2'>Analytics Dashboard</h2>
				<p className='text-gray-400'>Track your store performance and metrics</p>
			</div>
			<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
				<AnalyticsCard
					title='Total Users'
					value={analyticsData.users.toLocaleString()}
					icon={Users}
					color='from-emerald-500 to-teal-700'
				/>
				<AnalyticsCard
					title='Total Products'
					value={analyticsData.products.toLocaleString()}
					icon={Package}
					color='from-emerald-500 to-green-700'
				/>
				<AnalyticsCard
					title='Total Sales'
					value={analyticsData.totalSales.toLocaleString()}
					icon={ShoppingCart}
					color='from-emerald-500 to-cyan-700'
				/>
				<AnalyticsCard
					title='Total Revenue'
					value={`$${analyticsData.totalRevenue.toLocaleString()}`}
					icon={DollarSign}
					color='from-emerald-500 to-lime-700'
				/>
			</div>
			<motion.div
				className='bg-gray-800 rounded-lg p-8 shadow-lg border border-gray-700'
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5, delay: 0.25 }}
			>
				<h3 className='text-xl font-bold text-white mb-6'>Daily Sales & Revenue</h3>
				<div className='bg-gray-900 rounded-lg p-6'>
					<ResponsiveContainer width='100%' height={450}>
						<LineChart data={dailySalesData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
							<defs>
								<linearGradient id='colorSales' x1='0' y1='0' x2='0' y2='1'>
									<stop offset='5%' stopColor='#10B981' stopOpacity={0.3}/>
									<stop offset='95%' stopColor='#10B981' stopOpacity={0}/>
								</linearGradient>
								<linearGradient id='colorRevenue' x1='0' y1='0' x2='0' y2='1'>
									<stop offset='5%' stopColor='#3B82F6' stopOpacity={0.3}/>
									<stop offset='95%' stopColor='#3B82F6' stopOpacity={0}/>
								</linearGradient>
							</defs>
							<CartesianGrid strokeDasharray='3 3' stroke='#374151' vertical={false} />
							<XAxis dataKey='day' stroke='#9CA3AF' style={{ fontSize: '12px' }} />
							<YAxis yAxisId='left' stroke='#10B981' style={{ fontSize: '12px' }} />
							<Tooltip 
								contentStyle={{ 
									backgroundColor: '#111827', 
									border: '1px solid #4B5563',
									borderRadius: '0.5rem',
									boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
								}}
								labelStyle={{ color: '#F3F4F6' }}
								cursor={{ stroke: '#4B5563', strokeWidth: 1 }}
							/>
							<Legend 
								wrapperStyle={{ paddingTop: '20px' }}
								iconType='line'
							/>
							<Line
								yAxisId='left'
								type='monotone'
								dataKey='revenue'
								stroke='#10B981'
								strokeWidth={3}
								dot={{ fill: '#10B981', r: 4 }}
								activeDot={{ r: 6 }}
								name='Revenue'
								fillOpacity={1}
								fill='url(#colorRevenue)'
								isAnimationActive={true}
							/>
							
						</LineChart>
					</ResponsiveContainer>
				</div>
			</motion.div>
		</div>
	);
};
export default AnalyticsTab;

const AnalyticsCard = ({ title, value, icon: Icon, color }) => {
	const colorGradients = {
		'from-emerald-500 to-teal-700': 'from-emerald-600 to-teal-800',
		'from-emerald-500 to-green-700': 'from-emerald-600 to-green-800',
		'from-emerald-500 to-cyan-700': 'from-cyan-600 to-cyan-800',
		'from-emerald-500 to-lime-700': 'from-lime-600 to-lime-800',
	};

	const backgroundGradient = colorGradients[color] || 'from-emerald-600 to-emerald-900';

	return (
		<motion.div
			className={`bg-gray-800 rounded-lg p-6 shadow-lg overflow-hidden relative border border-gray-700 hover:border-gray-600 transition-all`}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.5 }}
			whileHover={{ y: -5, boxShadow: '0 20px 25px -5rgba(0, 0, 0, 0.3)' }}
		>
			<div className='flex justify-between items-center relative z-10'>
				<div>
					<p className='text-gray-400 text-sm mb-1 font-medium'>{title}</p>
					<h3 className='text-white text-4xl font-bold'>{value}</h3>
				</div>
				<div className={`bg-gradient-to-br ${color} p-3 rounded-lg opacity-80`}>
					<Icon className='h-8 w-8 text-white' />
				</div>
			</div>
			<div className={`absolute -bottom-6 -right-6 bg-gradient-to-br ${backgroundGradient} opacity-10 rounded-full w-40 h-40`} />
		</motion.div>
	);
};
