import { database } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import { sendPasswordResetEmail, sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail } from "../email/email.js";


export const signup = async (req, res) => {
	try {
		const { email, password,  first_name, last_name } = req.body;

		if(!password || !email || !first_name || !last_name ) return res.status(400).json({ message: "Please fill all forms" });

		if(password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters long"})

		const trimmedEmail = email.toLowerCase().trim();

		const {data: userExists, error: userExistsError } = await database.from('users').select('id').eq('email', trimmedEmail);

		if(userExistsError) throw userExistsError;

		if (userExists.length > 0) {
			return res.status(400).json({ message: "User already exists" });
		};

		const hashedPassword = await bcrypt.hash(password, 10);

		const { data: newUser, error: newUserError } = await database.from('users').insert([{ first_name, last_name, email: trimmedEmail, password: hashedPassword }]).select('id, first_name, last_name, email, role, is_verified');

		if(newUserError) throw newUserError;

		return res.status(201).json({ user: newUser[0], message: "User created successfully.Please verify your email" });
	} catch (error) {
		console.log("Error in signup controller", error.message);
		return res.status(500).json({ message: error.message });
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if(!password || !email ) return res.status(400).json({ message: "Please fill all forms" });

		const trimmedEmail = email.toLowerCase().trim();

		const { data: user, error } = await database.from('users').select('*').eq('email', trimmedEmail).single();

		if(error) throw error;
		
		if(!user){
			return res.status(401).json({ message: "Invalid email or password"});
		};

		if(!user.is_verified) return res.status(401).json({message: "User unverified. Please check you email inbox"})
		
		const isPasswordMatch = await bcrypt.compare(password, user.password);

		if(!isPasswordMatch) return res.status(401).json({ message: "Invalid email or password"});

		const token = await generateToken(user.id, res); 

		const expires = new Date();
		expires.setHours(expires.getHours() + 24 * 7); // 7days
		
		
		await database.from('tokens').insert({
			user_id: user.id,
			token,
			expires,
			revoked: false,
		});
		
		return res.status(200).json({
      user: {
        id: user.id,
        first_name: user.first_name,
				last_name: user.last_name,
        email: user.email,
				role: user.role,
				is_verified: user.is_verified
      },
      message: "Logged in successfully"
    });
	} catch (error) {
		console.log("Error in login controller", error.message);
		return res.status(500).json({ message: error.message });
	}
};

export const logout = async (req, res) => {
	try {
		const token = req.cookies?.jwt;

		if(token){
			await database.from('tokens').update({ revoked: true }).eq('token', token);
		};
		await res.cookie("jwt", '', { httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: "strict",
			maxAge: 0,
		});

		return res.status(200).json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};





