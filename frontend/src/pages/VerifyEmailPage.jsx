import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useUserStore } from "../stores/useUserStore";
import { Loader, CheckCircle, XCircle } from "lucide-react";

const VerifyEmailPage = () => {
	const { token } = useParams();
	const navigate = useNavigate();
	const { verifyEmail } = useUserStore();
	const [status, setStatus] = useState("verifying"); // verifying, success, error
	const hasVerified = useRef(false);

	useEffect(() => {
		const verify = async () => {
			if (hasVerified.current) return;
			hasVerified.current = true;

			try {
				const success = await verifyEmail(token);
				if (success) {
					setStatus("success");
					setTimeout(() => {
						navigate("/login");
					}, 3000);
				} else {
					setStatus("error");
				}
			} catch (error) {
				setStatus("error");
			}
		};

		if (token) {
			verify();
		} else {
			setStatus("error");
		}
	}, [token, verifyEmail, navigate]);

	return (
		<div className='flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
			<motion.div
				className='sm:mx-auto sm:w-full sm:max-w-md'
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.8 }}
			>
				<div className='bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center'>
					{status === "verifying" && (
						<>
							<Loader className='mx-auto h-12 w-12 text-emerald-500 animate-spin mb-4' />
							<h2 className='text-2xl font-bold text-emerald-400 mb-2'>Verifying your email...</h2>
							<p className='text-gray-400'>Please wait while we verify your account.</p>
						</>
					)}

					{status === "success" && (
						<>
							<CheckCircle className='mx-auto h-12 w-12 text-emerald-500 mb-4' />
							<h2 className='text-2xl font-bold text-emerald-400 mb-2'>Email Verified!</h2>
							<p className='text-gray-400 mb-4'>Your email has been successfully verified. Redirecting to login...</p>
						</>
					)}

					{status === "error" && (
						<>
							<XCircle className='mx-auto h-12 w-12 text-red-500 mb-4' />
							<h2 className='text-2xl font-bold text-red-400 mb-2'>Verification Failed</h2>
							<p className='text-gray-400 mb-6'>
								The verification link is invalid or has expired.
							</p>
							<button
								onClick={() => navigate("/resend-verification")}
								className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition duration-150 ease-in-out'
							>
								Resend Verification Email
							</button>
						</>
					)}
				</div>
			</motion.div>
		</div>
	);
};

export default VerifyEmailPage;
