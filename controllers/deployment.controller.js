import { supabase } from '../config/supabase.js';
import { createAndStartContainer, getContainerLogs } from '../services/dockerService.js';
import { calculateBuildTimeout, shouldRetryBuild } from '../utils/deploymentUtils.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;

    // Добавляем валидацию входных данных
    if (!userId || !files || !framework) {
      console.error('Missing required fields:', { userId, filesCount: files?.length, framework });
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userId, files, or framework'
      });
    }

    if (!Array.isArray(files) || files.length === 0) {
      console.error('Files must be a non-empty array');
      return res.status(400).json({
        success: false,
        error: 'Files must be a non-empty array'
      });
    }

    const MAX_RETRIES = 3;
    let currentRetry = 0;
    let timeoutId;

    console.log('Starting deployment process for user:', userId, 'framework:', framework, 'files count:', files.length);

    // Проверяем существующий проект
    const { data: existingProject, error: existingError } = await supabase
      .from('deployed_projects')
      .select('*')
      .eq('user_id', userId)
      .eq('framework', framework)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing project:', existingError);
      return res.status(500).json({
        success: false,
        error: 'Error checking existing project'
      });
    }

    let deployment;

    if (existingProject) {
      console.log('Updating existing project:', existingProject.id);
      const { data: updatedProject, error: updateError } = await supabase
        .from('deployed_projects')
        .update({
          status: 'preparing',
          container_logs: 'Обновление существующего проекта...',
          last_deployment: new Date().toISOString()
        })
        .eq('id', existingProject.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating existing project:', updateError);
        return res.status(500).json({
          success: false,
          error: 'Error updating existing project'
        });
      }

      deployment = updatedProject;
    } else {
      console.log('Creating new project for framework:', framework);
      const { data: newProject, error: createError } = await supabase
        .from('deployed_projects')
        .insert({
          user_id: userId,
          framework: framework,
          status: 'preparing',
          container_logs: 'Создание нового проекта...'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating new project:', createError);
        return res.status(500).json({
          success: false,
          error: 'Error creating new project'
        });
      }

      deployment = newProject;
    }

    console.log('Working with deployment:', deployment.id);

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

          return res.status(408).json({ 
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

        if (!containerResult || !containerResult.containerId) {
          throw new Error('Failed to create container: Invalid container result');
        }

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

        return res.json({ 
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

    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};
