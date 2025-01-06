export const handleContainerError = (error, containerId) => {
  console.error(`Container error for ${containerId}:`, error);

  const baseError = {
    containerId,
    timestamp: new Date().toISOString(),
  };

  if (error.response) {
    // Ошибка от Docker API
    return {
      ...baseError,
      type: 'docker_api_error',
      message: error.response.data?.message || error.message,
      status: error.response.status,
      details: error.response.data,
      severity: error.response.status >= 500 ? 'critical' : 'error'
    };
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ECONNRESET') {
    return {
      ...baseError,
      type: 'connection_error',
      message: 'Не удалось подключиться к Docker демону',
      details: error.message,
      severity: 'critical'
    };
  }

  return {
    ...baseError,
    type: 'unknown_error',
    message: error.message || 'Неизвестная ошибка',
    details: error,
    severity: 'error'
  };
};

export const logContainerError = async (supabase, error, containerId, userId) => {
  try {
    const { data, error: dbError } = await supabase
      .from('container_metrics')
      .insert({
        container_id: containerId,
        error_type: error.type,
        error_severity: error.severity,
        error_count: 1
      });

    if (dbError) {
      console.error('Failed to log container error:', dbError);
    }
  } catch (e) {
    console.error('Error while logging container error:', e);
  }
};
