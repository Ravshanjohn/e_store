import { database } from "../lib/db.js";
import bcrypt from "bcryptjs";
import { generateToken } from "../lib/utils.js";
import crypto from "crypto";
import { sendWelcomeEmail, sendPasswordResetEmail, sendResetSuccessEmail, sendVerificationEmail } from "../email/email.js";

export const signup = async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;

    if (!email || !password || !first_name || !last_name)
      return res.status(400).json({ message: "Please fill all forms" });

    if (password.length < 6)
      return res.status(400).json({ message: "Password must be at least 6 characters long" });

    const trimmedEmail = email.toLowerCase().trim();

    // Check if user exists
    const { data: userExists, error: userExistsError } = await database
      .from('users')
      .select('id, is_verified')
      .eq('email', trimmedEmail)

    if (userExistsError) throw userExistsError;

		
    if (userExists.length > 0){
			if(userExists[0].is_verified){
				return res.status(400).json({ message: "User already exists"})
			} else{
				return res.status(400).json({ message: "User is not verified. Please check your email" });
			}
		} 

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { data: newUser, error: newUserError } = await database
      .from('users')
      .insert([{ first_name, last_name, email: trimmedEmail, password: hashedPassword }])
      .select('id, first_name, last_name, email, role, is_verified');

    if (newUserError) throw newUserError;

    // Generate verificationToken
    const token = crypto.randomBytes(20).toString("hex");

    // Check email sending limits
    const { data: canSend, error: canSendError } = await database.rpc('can_send_email', {
      p_user_id: newUser[0].id,
      p_email_type: 'verification_email',
			p_email: trimmedEmail
    });

    if (canSendError) throw canSendError;

    if (canSend === true) {
      // Send verification email
      const isSent = await sendVerificationEmail(trimmedEmail, token);
      if (!isSent)
        return res.status(400).json({ message: "Message is not sent (Error in signup controller)" });
    } else {
      return res.status(400).json({ message: 'Email limit reached or cooldown active' });
    }

    // Insert token record
    const expires = new Date();
    expires.setHours(expires.getHours() + 8); // 8 hours

    await database.from('tokens').insert({
      user_id: newUser[0].id,
      token,
      expires,
			token_type: 'verification',
      revoked: false
    });

    return res.status(201).json({
      user: newUser[0],
      message: "User created successfully. Please verify your email"
    });
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

		//Token 
		const token = await generateToken(user.id, res); 
		const expires = new Date();
		expires.setDate(expires.getDate() + 7); // 7days
		
		await database.from('tokens').update({revoked: true,}).eq('user_id', user.id).eq('revoked', false);

		await database.from('tokens').insert({
			'user_id': user.id,
			token,
			expires,
			token_type: 'cookies',
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

//Email for verification
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
      p_email_type: 'verification_email',
			p_email: email
    });

    if (canSendError) throw canSendError;

    if (canSend) {
			//Verification token
      const token = crypto.randomBytes(20).toString("hex"); 
			const expires = new Date();
			expires.setHours(expires.getHours() + 8); // 8 hours

			const {error: sendTokenError } = await database.from('tokens').insert({
				user_id: user.id,
				token,
				expires,
				token_type: 'verification',
				revoked: false
			});

			if(sendTokenError) throw sendTokenError;

			//Send email with token
      const isSent = await sendVerificationEmail(email, token);

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

export const forgotPassword = async (req, res) => {
	try {
		const {email} = req.body;
		
		const trimmedEmail = email.toLowerCase().trim();
		
		const {data, error} = await database.from('users').select('id, email').eq("email", trimmedEmail);
		
		if(error) throw error;
		
		//Check user does exist
		if(data.length === 0) return res.status(200).json({message: "If an account with that email exists, a password reset link has been sent."});
		
		const { data: canSend, error: canSendError } = await database.rpc('can_send_email', {
			p_user_id: data[0].id,
      p_email_type: 'reset_password',
			p_email: data[0].email
    });
		
    if (canSendError) throw canSendError;
		
		// Generating token
		const token = crypto.randomBytes(20).toString("hex");
		const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour
		
    const {error:sendTokenError} = await database.from('tokens').insert({
			user_id: data[0].id,
      token,
      expires,
			token_type: 'reset_password',
      revoked: false
    });
		
		if(sendTokenError) throw sendTokenError;
		
		const resetUrl = `${process.env.CLIENT_URL}/reset-password/${token}`;
		
		//Send email
    if (canSend === true) {
			// Send verification email
      const isSent = await sendPasswordResetEmail(data[0].email, resetUrl);
      if (!isSent)
        return res.status(400).json({ message: "Message is not sent (Error in signup controller)" });
		} else {
			return res.status(400).json({ message: 'Email limit reached or cooldown active' });
    };
		
		return res.status(200).json({message: "If an account with that email exists, a password reset link has been sent."});
	} catch (error) {
		console.error(error);
    return res.status(500).json({ message: 'Internal server error', error: error.message });
	}
};

export const resetPassword = async (req, res) => {
	try {
		const {token} = req.params;
		const {newPassword} = req.body;

		if(newPassword.length < 6){
			return res.status(400).json({message: "Password must be at least 6 characters long"});
		}
		if(!newPassword){
			return res.status(400).json({message: "Please fill all fields"});
		}

		const{data, error} = await database.from('tokens').select('user_id, expires, revoked').eq("token_type", 'reset_password').eq("token", token);
		if (error || data.length === 0) return res.status(400).json({ message: "Expired or Invalid token" });

		const tokenData = data[0]
		if(tokenData.revoked) return res.status(400).json({message: "Invalid token"})
		const expiresAt = new Date(tokenData.expires).getTime();
		const now = Date.now();

		if (now >= expiresAt) return res.status(400).json({ message: "Expired or Invalid token" });

		//Find user
		const {data: user, error: userError} = await database.from('users').select('email,id').eq("id", tokenData.user_id).single();
		if(userError) throw userError
		//Hash && Update password
		const hashedPassword = await bcrypt.hash(newPassword, 10);
		const{error: updatePasswordError} = await database.from('users').update({password: hashedPassword, updated_at: new Date()}).eq('id', user.id);
		if(updatePasswordError) throw updatePasswordError;

		const isSent = await sendResetSuccessEmail(user.email);
		if (!isSent) throw new Error("Failed to send reset success email");
		//Revoke token
		const {error: revokeError} = await database.from('tokens').update({ revoked: true }).eq('token', token);
		if(revokeError) throw revokeError;

		return res.status(200).json({message: "Password updated successfully"})
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

export const verifyAccount = async (req, res) => {
	try {
		const { token } = req.params;

		// fetching mathced token
		const { data, error } = await database
			.from('tokens')
			.select('token, expires, user_id, revoked')
			.eq('token', token)
			.eq('token_type', 'verification')
			.single(); 
		
		if(data.revoked === true){
			return res.status(400).json({message: "Invalid token"})
		}

		if (error || !data) {
			return res.status(400).json({ message: "Expired or Invalid token" });
		}

		const expiresAt = new Date(data.expires).getTime();
		const now = Date.now();

		if (now >= expiresAt) {
			return res.status(400).json({ message: "Expired or Invalid token" });
		};

		//get user
		const{data: findUser, error: findUserError} = await database.from('users').select('email, is_verified').eq('id', data.user_id).single();
		if(findUserError) throw findUserError;

		if(findUser.is_verified) return res.status(200).json({ message: "User already verified" });
		//Update users
		const {error: verifiedError} = await database.from('users').update({is_verified: true}).eq('id', data.user_id);
		if(verifiedError) throw verifiedError;
		//Revoke token
		const {error: revokeError} = await database.from('tokens').update({ revoked: true }).eq('token', token);
		if(revokeError) return revokeError;

		const isSent = await sendWelcomeEmail(findUser.email);
		if (!isSent) throw new Error("Failed to send welcome email");

		return res.status(200).json({ message: "Email verified successfully" });
	} catch (error) {
		console.error(error);
		return res.status(500).json({ message: 'Internal server error', error: error.message });
	}
};

export const checkAuthStatus = async (req, res) => {
	try {
		res.status(200).json(req.user);
	} catch (error) {
		console.error("Error checking auth status:", error);
		return res.status(500).json({ message: "Server error", error: error.message });
	}
};





