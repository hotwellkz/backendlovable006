import { supabase } from '../../config/supabase.js';
import { handleContainerError } from './errorHandler.js';

export const createContainer = async (req, res) => {
  try {
    console.log('Создание нового контейнера:', req.body);
    const { userId, projectId, framework } = req.body;

    if (!userId || !projectId || !framework) {
      console.error('Отсутствуют обязательные параметры:', { userId, projectId, framework });
      return res.status(400).json({ 
        error: 'Отсутствуют обязательные параметры',
        details: { userId, projectId, framework }
      });
    }

    const { data: container, error: createError } = await supabase
      .from('docker_containers')
      .insert({
        user_id: userId,
        project_id: projectId,
        framework,
        status: 'initializing',
        container_logs: 'Инициализация контейнера...'
      })
      .select()
      .single();

    if (createError) {
      console.error('Ошибка при создании контейнера в БД:', createError);
      throw createError;
    }

    console.log('Контейнер успешно создан в БД:', container);

    // Имитируем процесс создания и запуска
    setTimeout(async () => {
      try {
        await updateContainerStatus(container.id, 'creating', 'Создание окружения контейнера...');
        setTimeout(async () => {
          try {
            await startContainer(container.id);
          } catch (error) {
            await handleContainerError(container.id, error);
          }
        }, 2000);
      } catch (error) {
        await handleContainerError(container.id, error);
      }
    }, 2000);

    res.json({ 
      success: true, 
      containerId: container.id,
      message: 'Контейнер создается' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при создании контейнера',
      details: error.message 
    });
  }
};

async function updateContainerStatus(containerId, status, logs) {
  const { error } = await supabase
    .from('docker_containers')
    .update({ 
      status,
      container_logs: logs
    })
    .eq('id', containerId);

  if (error) throw error;
}

async function startContainer(containerId) {
  const { error: updateError } = await supabase
    .from('docker_containers')
    .update({ 
      status: 'starting',
      container_id: `container_${containerId.slice(0, 8)}`,
      container_logs: 'Запуск сервисов контейнера...'
    })
    .eq('id', containerId);

  if (updateError) throw updateError;

  setTimeout(async () => {
    const { error: finalError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'running',
        container_url: `https://container-${containerId.slice(0, 8)}.lovable.dev`,
        port: 3000,
        container_logs: 'Контейнер успешно запущен'
      })
      .eq('id', containerId);

    if (finalError) throw finalError;
  }, 2000);
}
