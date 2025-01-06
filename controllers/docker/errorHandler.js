const handleContainerError = (error, containerId) => {
  console.error(`Ошибка контейнера (${containerId}):`, error);
  
  // Расширенная классификация ошибок
  if (error.code === 'ECONNREFUSED') {
    return {
      type: 'connection',
      message: 'Не удалось подключиться к Docker daemon',
      details: error.message,
      severity: 'critical'
    };
  }
  
  if (error.statusCode === 404) {
    return {
      type: 'not_found',
      message: 'Контейнер не найден',
      details: error.message,
      severity: 'warning'
    };
  }
  
  if (error.statusCode === 409) {
    return {
      type: 'conflict',
      message: 'Конфликт при работе с контейнером',
      details: error.message,
      severity: 'error'
    };
  }

  if (error.code === 'ENOSPC') {
    return {
      type: 'resources',
      message: 'Недостаточно ресурсов для создания контейнера',
      details: 'Нет свободного места на диске или достигнут лимит контейнеров',
      severity: 'critical'
    };
  }

  if (error.code === 'ETIMEDOUT') {
    return {
      type: 'timeout',
      message: 'Превышено время ожидания операции',
      details: 'Операция с контейнером заняла слишком много времени',
      severity: 'error'
    };
  }
  
  return {
    type: 'unknown',
    message: 'Произошла неизвестная ошибка',
    details: error.message,
    severity: 'error'
  };
};

const logContainerError = async (supabase, error, containerId, userId) => {
  try {
    console.log(`Логирование ошибки для контейнера ${containerId}:`, {
      type: error.type,
      severity: error.severity,
      message: error.message,
      details: error.details
    });

    // Обновляем статус контейнера с более детальной информацией
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({
        status: 'error',
        container_logs: JSON.stringify({
          error: error.message,
          type: error.type,
          severity: error.severity,
          details: error.details,
          timestamp: new Date().toISOString()
        })
      })
      .eq('container_id', containerId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Ошибка обновления статуса контейнера:', updateError);
    }

    // Добавляем метрику об ошибке с дополнительной информацией
    const { error: metricsError } = await supabase
      .from('container_metrics')
      .insert({
        container_id: containerId,
        error_count: 1,
        error_type: error.type,
        error_severity: error.severity
      });

    if (metricsError) {
      console.error('Ошибка обновления метрик:', metricsError);
    }

    // Логируем критические ошибки отдельно для мониторинга
    if (error.severity === 'critical') {
      console.error('КРИТИЧЕСКАЯ ОШИБКА:', {
        containerId,
        userId,
        error: {
          type: error.type,
          message: error.message,
          details: error.details
        }
      });
    }
  } catch (err) {
    console.error('Ошибка в logContainerError:', err);
  }
};

export { handleContainerError, logContainerError };
