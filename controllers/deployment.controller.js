import { supabase } from '../config/supabase.js';
import { createAndStartContainer, getContainerLogs } from '../services/dockerService.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;
    const BUILD_TIMEOUT = 300000; // 5 минут максимум на сборку
    let timeoutId;

    console.log('Starting deployment process for user:', userId);

    // ... keep existing code (checking existing projects)

    try {
      // Создаем и запускаем Docker контейнер
      const containerResult = await createAndStartContainer(
        userId,
        deployment.id,
        framework,
        files
      );

      // Получаем URL для демонстрации (используем новый домен)
      const deploymentUrl = `https://docker-jy4o.onrender.com/container/${deployment.id}`;

      // Обновляем финальный статус
      const { error: finalUpdateError } = await supabase
        .from('deployed_projects')
        .update({ 
          status: 'deployed',
          project_url: deploymentUrl,
          last_deployment: new Date().toISOString(),
          container_logs: await getContainerLogs(containerResult.containerId)
        })
        .eq('id', deployment.id);

      // ... keep existing code (error handling and response)

    } catch (error) {
      console.error('Error during container operations:', error);
      
      // ... keep existing code (error handling)
    }

  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};
