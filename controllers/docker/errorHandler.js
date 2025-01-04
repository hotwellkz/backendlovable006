import { supabase } from '../../config/supabase.js';

export const handleContainerError = async (containerId, error) => {
  try {
    console.error(`Ошибка для контейнера ${containerId}:`, error);
    
    const { error: updateError } = await supabase
      .from('docker_containers')
      .update({ 
        status: 'error',
        container_logs: `Ошибка: ${error.message}`
      })
      .eq('id', containerId);

    if (updateError) {
      console.error('Ошибка при обновлении статуса ошибки:', updateError);
    }
  } catch (e) {
    console.error('Ошибка при обработке ошибки контейнера:', e);
  }
};
