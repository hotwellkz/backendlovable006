import { supabase } from '../config/supabase.js';
import { createAndStartContainer, getContainerLogs } from '../services/dockerService.js';
import { calculateBuildTimeout, shouldRetryBuild } from '../utils/deploymentUtils.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;
    const MAX_RETRIES = 3;
    let currentRetry = 0;
    let timeoutId;

    console.log('Starting deployment process for user:', userId);

    // Создаем новую запись о развертывании
    const { data: deployment, error: deploymentError } = await supabase
      .from('deployed_projects')
      .insert({
        user_id: userId,
        framework: framework,
        status: 'preparing',
        container_logs: 'Создание нового проекта...'
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment record:', deploymentError);
      throw deploymentError;
    }

    console.log('Created new deployment record:', deployment.id);

    // Рассчитываем таймаут на основе размера и сложности проекта
    const BUILD_TIMEOUT = calculateBuildTimeout(files, framework);
    console.log(`Calculated build timeout: ${BUILD_TIMEOUT}ms for framework: ${framework}`);

    const attemptBuild = async (retryCount) => {
      // Очищаем предыдущий таймаут если есть
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Устанавливаем новый таймаут
      timeoutId = setTimeout(async () => {
        console.error(`Deployment timeout reached for: ${deployment.id} (attempt ${retryCount + 1})`);
        
        if (shouldRetryBuild(retryCount, MAX_RETRIES)) {
          console.log(`Retrying build (attempt ${retryCount + 2}/${MAX_RETRIES})`);
          await attemptBuild(retryCount + 1);
        } else {
          await supabase
            .from('deployed_projects')
            .update({ 
              status: 'error',
              last_deployment: new Date().toISOString(),
              container_logs: `Превышено время ожидания сборки после ${MAX_RETRIES} попыток`
            })
            .eq('id', deployment.id);

          res.status(408).json({ 
            success: false, 
            error: `Превышено время ожидания сборки после ${MAX_RETRIES} попыток`
          });
        }
      }, BUILD_TIMEOUT);

      try {
        // Обновляем статус для текущей попытки
        await supabase
          .from('deployed_projects')
          .update({ 
            container_logs: `Попытка сборки ${retryCount + 1}/${MAX_RETRIES}...`
          })
          .eq('id', deployment.id);

        // Запускаем создание и старт контейнера
        const containerResult = await createAndStartContainer(
          userId,
          deployment.id,
          framework,
          files
        );

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

        if (finalUpdateError) {
          console.error('Error updating final deployment status:', finalUpdateError);
          throw finalUpdateError;
        }

        clearTimeout(timeoutId);

        console.log('Deployment completed successfully:', deploymentUrl);

        res.json({ 
          success: true, 
          deploymentUrl,
          deploymentId: deployment.id,
          containerId: containerResult.containerId
        });

      } catch (error) {
        console.error(`Error during container operations (attempt ${retryCount + 1}):`, error);
        
        if (shouldRetryBuild(retryCount, MAX_RETRIES)) {
          console.log(`Retrying after error (attempt ${retryCount + 2}/${MAX_RETRIES})`);
          await attemptBuild(retryCount + 1);
        } else {
          await supabase
            .from('deployed_projects')
            .update({ 
              status: 'error',
              last_deployment: new Date().toISOString(),
              container_logs: `Ошибка после ${MAX_RETRIES} попыток: ${error.message || 'Неизвестная ошибка'}`
            })
            .eq('id', deployment.id);

          throw error;
        }
      }
    };

    // Начинаем первую попытку сборки
    await attemptBuild(0);

  } catch (error) {
    console.error('Deployment error:', error);

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};
