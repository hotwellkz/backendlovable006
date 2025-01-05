import Docker from 'dockerode';
import { supabase } from '../config/supabase.js';

const docker = new Docker({ 
  host: process.env.DOCKER_HOST || 'http://localhost',
  port: process.env.DOCKER_PORT || 2375
});

export const createAndStartContainer = async (userId, projectId, framework, files) => {
  try {
    console.log('Starting container creation for user:', userId);

    // Создаем временную директорию для файлов проекта
    const containerName = `app-${projectId.slice(0, 8)}`;
    
    // Подготавливаем конфигурацию контейнера
    const containerConfig = {
      Image: framework === 'react' ? 'node:18' : 'node:18',
      name: containerName,
      ExposedPorts: {
        '3000/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: '3000' }]
        }
      },
      Env: [
        `PROJECT_ID=${projectId}`,
        `USER_ID=${userId}`
      ]
    };

    // Создаем контейнер
    console.log('Creating container with config:', containerConfig);
    const container = await docker.createContainer(containerConfig);
    
    // Обновляем статус в базе данных
    await supabase
      .from('docker_containers')
      .update({ 
        container_id: container.id,
        status: 'created',
        container_logs: 'Container created successfully'
      })
      .eq('project_id', projectId);

    // Запускаем контейнер
    console.log('Starting container:', container.id);
    await container.start();

    // Обновляем статус после запуска
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'running',
        container_logs: 'Container started successfully'
      })
      .eq('project_id', projectId);

    return {
      containerId: container.id,
      containerName,
      status: 'running'
    };

  } catch (error) {
    console.error('Error in createAndStartContainer:', error);
    
    // Обновляем статус с ошибкой
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'error',
        container_logs: `Error: ${error.message}`
      })
      .eq('project_id', projectId);

    throw error;
  }
};

export const stopAndRemoveContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    
    // Останавливаем контейнер
    await container.stop();
    console.log('Container stopped:', containerId);
    
    // Удаляем контейнер
    await container.remove();
    console.log('Container removed:', containerId);
    
    return true;
  } catch (error) {
    console.error('Error in stopAndRemoveContainer:', error);
    throw error;
  }
};

export const getContainerLogs = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100
    });
    
    return logs.toString('utf8');
  } catch (error) {
    console.error('Error getting container logs:', error);
    throw error;
  }
};
