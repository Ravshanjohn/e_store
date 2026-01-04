import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET

export const generateToken = async (id, res) => {
  const token = jwt.sign({ id }, JWT_SECRET, {expiresIn: "7d"});

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === 'production',
  });

  return token 
}

