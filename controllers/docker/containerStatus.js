import { supabase } from '../../config/supabase.js';

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
