import axios from 'axios';

const DOCKER_HOST = process.env.DOCKER_HOST || 'docker-jy4o.onrender.com';
const DOCKER_PORT = process.env.DOCKER_PORT || '2375';

const dockerClient = axios.create({
  baseURL: `http://${DOCKER_HOST}:${DOCKER_PORT}`,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
});

// Добавляем интерцептор для логирования
dockerClient.interceptors.request.use(request => {
  console.log('Docker API Request:', {
    method: request.method,
    url: request.url,
    headers: request.headers,
    data: request.data,
  });
  return request;
});

dockerClient.interceptors.response.use(
  response => {
    console.log('Docker API Response:', {
      status: response.status,
      data: response.data,
    });
    return response;
  },
  error => {
    console.error('Docker API Error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    throw error;
  }
);

export { dockerClient };
