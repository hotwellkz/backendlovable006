const handleContainerError = (error, containerId) => {
  console.error(`Container error (${containerId}):`, error);
  
  // Классификация ошибок
  if (error.code === 'ECONNREFUSED') {
    return {
      type: 'connection',
      message: 'Не удалось подключиться к Docker daemon',
      details: error.message
    };
  }
  
  if (error.statusCode === 404) {
    return {
      type: 'not_found',
      message: 'Контейнер не найден',
      details: error.message
    };
  }
  
  if (error.statusCode === 409) {
    return {
      type: 'conflict',
      message: 'Конфликт при работе с контейнером',
      details: error.message
    };
  }
  
  return {
    type: 'unknown',
    message: 'Произошла неизвестная ошибка',
    details: error.message
  };
};

const logContainerError = async (supabase, error, containerId, userId) => {
  try {
    // Обновляем статус контейнера
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({
        status: 'error',
        container_logs: JSON.stringify({
          error: error.message,
          timestamp: new Date().toISOString(),
          type: error.type
        })
      })
      .eq('container_id', containerId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating container status:', updateError);
    }

    // Добавляем метрику об ошибке
    const { error: metricsError } = await supabase
      .from('container_metrics')
      .insert({
        container_id: containerId,
        error_count: 1
      });

    if (metricsError) {
      console.error('Error updating metrics:', metricsError);
    }
  } catch (err) {
    console.error('Error in logContainerError:', err);
  }
};

export { handleContainerError, logContainerError };
