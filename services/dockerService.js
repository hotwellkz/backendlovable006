import { docker } from '../config/docker.js';
import { createContainer } from './containerCreationService.js';
import { handleContainerError } from './containerMonitoringService.js';

export const createAndStartContainer = async (userId, projectId, framework, files) => {
  try {
    return await createContainer(userId, projectId, framework, files);
  } catch (error) {
    await handleContainerError(projectId, error);
    throw error;
  }
};

export const stopAndRemoveContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    await container.stop();
    await container.remove();
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
      tail: 100,
      follow: false
    });
    return logs.toString('utf8');
  } catch (error) {
    console.error('Error getting container logs:', error);
    throw error;
  }
};
