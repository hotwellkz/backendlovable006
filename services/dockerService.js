import { createContainer } from './containerCreationService.js';
import { docker } from '../config/docker.js';
import { handleContainerError } from './containerMonitoringService.js';

export const createAndStartContainer = async (userId, projectId, framework, files) => {
  try {
    console.log('Создание контейнера для пользователя:', userId);
    return await createContainer(userId, projectId, framework, files);
  } catch (error) {
    console.error('Ошибка при создании контейнера:', error);
    await handleContainerError(projectId, error);
    throw error;
  }
};

export const stopAndRemoveContainer = async (containerId) => {
  try {
    console.log('Остановка и удаление контейнера:', containerId);
    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();
    return true;
  } catch (error) {
    console.error('Ошибка при остановке/удалении контейнера:', error);
    throw error;
  }
};

export const getContainerLogs = async (containerId) => {
  try {
    console.log('Получение логов контейнера:', containerId);
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      follow: false
    });
    return logs.toString('utf8');
  } catch (error) {
    console.error('Ошибка при получении логов контейнера:', error);
    throw error;
  }
};
