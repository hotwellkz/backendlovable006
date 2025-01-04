export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://lovable.dev', 'https://www.lovable.dev', 'https://lovable006.netlify.app', 'https://backendlovable006.onrender.com', 'https://671f63f8-d15e-4c5b-beea-9ea6ba6a0ea0.lovableproject.com', 'https://lovable006.netlify.app'] 
    : ['http://localhost:5173', 'http://localhost:3000', 'https://backendlovable006.onrender.com', 'https://lovable006.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-info', 'apikey', 'Access-Control-Allow-Origin'],
  exposedHeaders: ['Access-Control-Allow-Origin'],
  credentials: true,
  maxAge: 86400
};
