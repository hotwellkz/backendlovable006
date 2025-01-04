import { supabase } from '../../config/supabase.js';

export const deleteContainer = async (req, res) => {
  try {
    const { containerId } = req.params;
    console.log('Удаление контейнера:', containerId);

    const { data: container, error: fetchError } = await supabase
      .from('docker_containers')
      .select('*')
      .eq('id', containerId)
      .single();

    if (fetchError) {
      console.error('Ошибка при получении информации о контейнере:', fetchError);
      throw fetchError;
    }

    if (!container) {
      return res.status(404).json({ 
        error: 'Контейнер не найден' 
      });
    }

    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'stopping',
        container_logs: 'Остановка сервисов контейнера...'
      })
      .eq('id', containerId);

    if (updateError) {
      console.error('Ошибка при обновлении статуса на stopping:', updateError);
      throw updateError;
    }

    setTimeout(async () => {
      try {
        const { error: deleteError } = await supabase
          .from('docker_containers')
          .delete()
          .eq('id', containerId);

        if (deleteError) {
          console.error('Ошибка при удалении контейнера:', deleteError);
          throw deleteError;
        }

        console.log('Контейнер успешно удален:', containerId);
      } catch (error) {
        console.error('Ошибка при удалении контейнера:', error);
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
