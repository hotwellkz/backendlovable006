export const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://lovable.dev', 
        'https://www.lovable.dev', 
        'https://lovable006.netlify.app', 
        'https://backendlovable006.onrender.com', 
        'https://671f63f8-d15e-4c5b-beea-9ea6ba6a0ea0.lovableproject.com'
      ] 
    : true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'apikey'],
  credentials: true, // Убедитесь, что это нужно
  maxAge: 86400 // Время кэширования preflight-запросов
};

// Логирование для отладки
console.log('CORS настроен для:', process.env.NODE_ENV === 'production' ? 'production' : 'development');
console.log('CORS origin:', process.env.NODE_ENV === 'production' 
  ? [
      'https://lovable.dev', 
      'https://www.lovable.dev', 
      'https://lovable006.netlify.app', 
      'https://backendlovable006.onrender.com', 
      'https://671f63f8-d15e-4c5b-beea-9ea6ba6a0ea0.lovableproject.com'
    ] 
  : 'any origin');
