import { database } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";


export const signup = async (req, res) => {
	try {
		const { email, password, name } = req.body;

		if(!password || !email || !name ) return res.status(400).json({ message: "Please fill all forms" });

		if(password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters long"})

		const trimmedEmail = email.toLowerCase().trim();

		const {data: userExists, error: userExistsError } = await database.from('users').select('id').eq('email', trimmedEmail);

		if(userExistsError) throw userExistsError;

		if (userExists.length > 0) {
			return res.status(400).json({ message: "User already exists" });
		};

		const hashedPassword = await bcrypt.hash(password, 10);

		const { data: newUser, error: newUserError } = await database.from('users').insert([{ name, email: trimmedEmail, password: hashedPassword }]).select('id, name, email, role, is_verified');

		if(newUserError) throw newUserError;

		res.status(201).json({ user: newUser[0], message: "User created successfully" });
	} catch (error) {
		console.log("Error in signup controller", error.message);
		res.status(500).json({ message: error.message });
	}
};

export const login = async (req, res) => {
	try {
		const { email, password } = req.body;

		if(!password || !email ) return res.status(400).json({ message: "Please fill all forms" });

		const trimmedEmail = email.toLowerCase().trim();

		const { data: users, error } = await database.from('users').select('*').eq('email', trimmedEmail);

		if(error) throw error;
		
		if(!users || users.length === 0){
			return res.status(401).json({ message: "Invalid email or password"});
		}
		
		const user = users[0];	

		
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
		
		res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
				role: user.role,
				is_verified: user.is_verified
      },
      message: "Logged in successfully"
    });
	} catch (error) {
		console.log("Error in login controller", error.message);
		res.status(500).json({ message: error.message });
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

		return res.json({ message: "Logged out successfully" });
	} catch (error) {
		console.log("Error in logout controller", error.message);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};



