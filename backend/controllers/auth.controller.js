import { database } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import { sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail } from "../email/email.js";


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

		const token = await generateToken(newUser[0].id, res); 

		// Sending email
		const {data: canSend, error: canSendError} = await database.rpc('can_send_email', {p_user_id: newUser[0].id, p_email_type: 'verification_email'});

		if(canSendError) throw canSendError;

		if(canSend === true){
			const isSent = await sendVerificationEmail(email, token, newUser[0].first_name);

			if(!isSent){
				return res.status(400).json({message: "Message is not sent(Error in signup controller)"});
			};
		}else{
			return res.status(400).json({message: 'Email limit reached or cooldown active'});
		};

		const expires = new Date();
		expires.setDate(expires.getDate() + 7); // 7days
		
		await database.from('tokens').insert({
			user_id: newUser[0].id,
			token,
			expires,
			revoked: false,
		});

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

		const { data, error } = await database.from('users').select('*').eq('email', trimmedEmail).limit(1);

		if(error) throw error;
		
		const user = data?.[0];
		if(!user){
			return res.status(401).json({ message: "Invalid email or password"});
		};

		if(!user.is_verified) return res.status(401).json({message: "User unverified. Please check you email inbox"})
		
		const isPasswordMatch = await bcrypt.compare(password, user.password);

		if(!isPasswordMatch) return res.status(401).json({ message: "Invalid email or password"});

		const token = await generateToken(user.id, res); 

		const expires = new Date();
		expires.setHours(expires.getHours() + 24 * 7); // 7days
		
		await database.from('tokens').update({revoked: true,}).eq('user_id', user.id).eq('revoked', false);

		await database.from('tokens').insert({
			'user_id': user.id,
			token,
			expires,
			revoked: false
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

export const verifyEmail = async (req, res) => {
  try {
    const { email } = req.body;

    const { data: user, error } = await database
      .from('users')
      .select('id, first_name, is_verified')
      .eq('email', email)
      .single();

    if (error) throw error;
    if (!user) return res.status(400).json({ message: "User not registered yet" });
    if (user.is_verified) return res.status(400).json({ message: "User already verified email" });

    // Call SQL function which also increments usage
    const { data: canSend, error: canSendError } = await database.rpc('can_send_email', {
      p_user_id: user.id,
      p_email_type: 'verification_email'
    });

    if (canSendError) throw canSendError;

    if (canSend) {
      const token = generateToken(user.id, res); 
      const isSent = await sendVerificationEmail(email, token, user.first_name);

      if (!isSent) return res.status(400).json({ message: "Message not sent" });

      return res.status(200).json({ message: "Verification email sent successfully" });
    } else {
      return res.status(400).json({ message: 'Email limit reached or cooldown active' });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
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





