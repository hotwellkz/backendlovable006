export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://lovable.dev', 'https://www.lovable.dev', 'https://lovable006.netlify.app', 'https://backendlovable006.onrender.com'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'https://lovable.dev'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400
};
