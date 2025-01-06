import { dockerClient } from '../config/docker.js';

export const createAndStartContainer = async (userId, deploymentId, framework, files) => {
  try {
    console.log('Creating container for deployment:', deploymentId);

    // Создаем конфигурацию контейнера
    const containerConfig = {
      Image: `node:18-alpine`,
      Cmd: ["/bin/sh", "-c", "npm install && npm start"],
      WorkingDir: "/app",
      ExposedPorts: {
        "3000/tcp": {}
      },
      HostConfig: {
        PortBindings: {
          "3000/tcp": [{ HostPort: "3000" }]
        }
      },
      Labels: {
        user_id: userId,
        deployment_id: deploymentId,
        framework: framework
      }
    };

    // Создаем контейнер
    const createResponse = await dockerClient.post('/containers/create', containerConfig);
    const containerId = createResponse.data.Id;
    
    console.log('Container created:', containerId);

    // Запускаем контейнер
    await dockerClient.post(`/containers/${containerId}/start`);
    console.log('Container started:', containerId);

    return { containerId };
  } catch (error) {
    console.error('Error in createAndStartContainer:', error);
    throw error;
  }
};

export const getContainerLogs = async (containerId) => {
  try {
    const response = await dockerClient.get(`/containers/${containerId}/logs?stdout=1&stderr=1`);
    return response.data;
  } catch (error) {
    console.error('Error getting container logs:', error);
    return 'Не удалось получить логи контейнера';
  }
};
