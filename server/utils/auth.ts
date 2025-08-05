import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "bharatinvo-secret-key";

export function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth error:", error); // Add logging for debugging
    return res.status(401).json({ message: 'Invalid token' });
  }
}