export const config = {
  dbHost: 'localhost',
  dbUser: 'root',
  dbPassword: '',
  dbDatabase: '',
  origin: 'http://localhost:3001',
  crossOrigin: 'http://localhost:5173',
  secretJwt: 'secureString',
  hmacKey: 'saltString',
  tokenExpirationTime: 60 * 60 * 24,
};