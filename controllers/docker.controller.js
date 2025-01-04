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
        status: 'creating',
      })
      .select()
      .single();

    if (error) {
      console.error('Ошибка при создании контейнера:', error);
      throw error;
    }

    // В реальном приложении здесь будет логика создания Docker контейнера
    // Пока просто имитируем успешное создание
    setTimeout(async () => {
      const { error: updateError } = await supabase
        .from('docker_containers')
        .update({ 
          status: 'running',
          container_id: `container_${container.id.slice(0, 8)}`,
          container_url: `https://container-${container.id.slice(0, 8)}.lovable.dev`,
          port: 3000
        })
        .eq('id', container.id);

      if (updateError) {
        console.error('Ошибка при обновлении статуса контейнера:', updateError);
      }
    }, 5000);

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

    const { error } = await supabase
      .from('docker_containers')
      .delete()
      .eq('id', containerId);

    if (error) {
      console.error('Ошибка при удалении контейнера:', error);
      throw error;
    }

    res.json({ 
      success: true, 
      message: 'Контейнер успешно удален' 
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      error: 'Ошибка при удалении контейнера',
      details: error.message 
    });
  }
};
