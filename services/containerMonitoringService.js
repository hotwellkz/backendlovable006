import { supabase } from '../config/supabase.js';
import axios from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;
const HEALTH_CHECK_TIMEOUT = 10000;

export const checkContainerHealth = async (containerId, containerUrl) => {
  let retries = 0;
  
  const performHealthCheck = async () => {
    try {
      console.log(`Performing health check for container ${containerId} at ${containerUrl}`);
      
      const response = await axios.get(containerUrl, {
        timeout: HEALTH_CHECK_TIMEOUT
      });
      
      if (response.status === 200) {
        console.log(`Container ${containerId} is healthy`);
        await updateContainerStatus(containerId, 'running', 'Container is healthy and running');
        return true;
      }
    } catch (error) {
      console.error(`Health check failed for container ${containerId}:`, error.message);
      
      if (retries < MAX_RETRIES) {
        retries++;
        console.log(`Retrying health check (${retries}/${MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return performHealthCheck();
      }
      
      await handleContainerError(containerId, error);
      return false;
    }
  };
  
  return performHealthCheck();
};

export const handleContainerError = async (containerId, error) => {
  console.error(`Container error for ${containerId}:`, error);
  
  const errorMessage = error.response?.data?.error || error.message || 'Unknown error occurred';
  
  await updateContainerStatus(containerId, 'error', `Container failed: ${errorMessage}`);
  
  // Добавляем метрику об ошибке
  await supabase
    .from('container_metrics')
    .insert({
      container_id: containerId,
      error_count: 1,
      error_type: error.name || 'UnknownError',
      error_severity: 'critical'
    });
};

export const updateContainerStatus = async (containerId, status, logs) => {
  const { error } = await supabase
    .from('docker_containers')
    .update({ 
      status,
      container_logs: logs,
      updated_at: new Date().toISOString()
    })
    .eq('id', containerId);

  if (error) {
    console.error('Error updating container status:', error);
    throw error;
  }
};
