import config from '../config';
import * as JWT from 'jsonwebtoken';

export default function generateToken(email: string, role = 'user'): string {
  return JWT.sign({ email, role }, config.jwtSecret, { expiresIn: '30d', algorithm: 'HS256' } as JWT.SignOptions);
}

export function verifyToken(token: string): { email: string, role: string } {
  const data = JWT.verify(token, config.jwtSecret) as string;
  return data as unknown as { email: string, role: string };
}
