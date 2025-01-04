import { supabase } from '../config/supabase.js';

export const createContainer = async (req, res) => {
  try {
    console.log('Создание нового контейнера:', req.body);
    const { userId, projectId, framework } = req.body;

    if (!userId || !projectId || !framework) {
      console.error('Отсутствуют обязательные параметры');
      return res.status(400).json({ error: 'Отсутствуют обязательные параметры' });
    }

    // Создаем запись о контейнере
    const { data: container, error } = await supabase
      .from('docker_containers')
      .insert({
        user_id: userId,
        project_id: projectId,
        framework,
        status: 'initializing', // Новый начальный статус
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании контейнера:', error);
      throw error;
    }

    // В реальном приложении здесь будет логика создания Docker контейнера
    // Имитируем процесс создания и запуска
    setTimeout(async () => {
      // Обновляем статус на 'creating'
      await supabase
        .from('docker_containers')
        .update({ 
          status: 'creating',
          container_logs: 'Creating container environment...'
        })
        .eq('id', container.id);

      // Имитируем процесс настройки
      setTimeout(async () => {
        // Обновляем статус на 'starting'
        await supabase
          .from('docker_containers')
          .update({ 
            status: 'starting',
            container_id: `container_${container.id.slice(0, 8)}`,
            container_logs: 'Starting container services...'
          })
          .eq('id', container.id);

        // Финальное обновление - контейнер запущен
        setTimeout(async () => {
          const { error: updateError } = await supabase
            .from('docker_containers')
            .update({ 
              status: 'running',
              container_url: `https://container-${container.id.slice(0, 8)}.lovable.dev`,
              port: 3000,
              container_logs: 'Container is running successfully'
            })
            .eq('id', container.id);

          if (updateError) {
            console.error('Ошибка при обновлении статуса контейнера:', updateError);
          }
        }, 2000);
      }, 2000);
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

export const getContainerStatus = async (req, res) => {
  try {
    const { containerId } = req.params;
    console.log('Получение статуса контейнера:', containerId);

    const { data: container, error } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('id', containerId)
      .single();

    if (error) {
      console.error('Ошибка при получении статуса:', error);
      throw error;
    }

    res.json({ 
      success: true, 
      status: container.status,
      url: container.container_url,
      logs: container.container_logs
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при получении статуса контейнера',
      details: error.message 
    });
  }
};

export const deleteContainer = async (req, res) => {
  try {
    const { containerId } = req.params;
    console.log('Удаление контейнера:', containerId);

    // Сначала получаем информацию о контейнере
    const { data: container, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('id', containerId)
      .single();

    if (fetchError) {
      console.error('Ошибка при получении информации о контейнере:', fetchError);
      throw fetchError;
    }

    // Проверяем, что контейнер существует
    if (!container) {
      return res.status(404).json({ 
        error: 'Контейнер не найден' 
      });
    }

    // Обновляем статус на 'stopping'
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'stopping',
        container_logs: 'Stopping container services...'
      })
      .eq('id', containerId);

    // Имитируем процесс остановки
    setTimeout(async () => {
      const { error } = await supabase
        .from('docker_containers')
        .delete()
        .eq('id', containerId);

      if (error) {
        console.error('Ошибка при удалении контейнера:', error);
        throw error;
      }
    }, 2000);

    res.json({ 
      success: true, 
      message: 'Контейнер останавливается и будет удален' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении контейнера',
      details: error.message 
    });
  }
};
