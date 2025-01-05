export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://lovable.dev', 'https://www.lovable.dev', 'https://lovable006.netlify.app', 'https://backendlovable006.onrender.com', 'https://671f63f8-d15e-4c5b-beea-9ea6ba6a0ea0.lovableproject.com'] 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-client-info', 'apikey'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};
