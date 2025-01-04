import { handleContainerError, logContainerError } from './errorHandler.js';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const getContainerStatus = async (req, res) => {
  const { containerId, userId } = req.params;

  try {
    console.log(`Checking status for container ${containerId}`);
    
    const { data: container, error: containerError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('container_id', containerId)
      .eq('user_id', userId)
      .single();

    if (containerError) {
      console.error('Error fetching container:', containerError);
      throw containerError;
    }

    if (!container) {
      throw new Error('Container not found');
    }

    // Получаем метрики контейнера с расширенной информацией
    const { data: metrics, error: metricsError } = await supabase
      .from('container_metrics')
      .select('*')
      .eq('container_id', container.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (metricsError && metricsError.code !== 'PGRST116') {
      console.error('Error fetching metrics:', metricsError);
    }

    // Добавляем расширенную информацию о статусе
    const statusInfo = {
      status: container.status,
      url: container.container_url,
      logs: container.container_logs,
      metrics: metrics || null,
      lastUpdate: container.updated_at,
      health: {
        isHealthy: container.status === 'running',
        lastCheck: new Date().toISOString(),
        errorCount: metrics?.error_count || 0
      }
    };

    console.log(`Container ${containerId} status:`, statusInfo);
    res.json(statusInfo);

  } catch (error) {
    console.error('Error in getContainerStatus:', error);
    
    const handledError = handleContainerError(error, containerId);
    await logContainerError(supabase, handledError, containerId, userId);
    
    res.status(500).json({
      error: handledError.message,
      details: handledError.details,
      type: handledError.type,
      severity: handledError.severity
    });
  }
};
