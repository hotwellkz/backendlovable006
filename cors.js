export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://lovable.dev', 'https://www.lovable.dev', 'https://lovable006.netlify.app'] 
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
};
