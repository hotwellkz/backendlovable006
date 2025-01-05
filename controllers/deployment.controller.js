import { supabase } from '../config/supabase.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;

    console.log('Starting deployment process for user:', userId);

    // Создаем запись о развертывании
    const { data: deployment, error: deploymentError } = await supabase
      .from('deployed_projects')
      .insert({
        user_id: userId,
        framework: framework,
        status: 'preparing'
      })
      .select()
      .single();

    if (deploymentError) {
      console.error('Error creating deployment record:', deploymentError);
      throw deploymentError;
    }

    console.log('Created deployment record:', deployment.id);

    // Имитация процесса упаковки файлов
    await supabase
      .from('deployed_projects')
      .update({ 
        status: 'packaging',
      })
      .eq('id', deployment.id);

    console.log('Packaging files...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Имитация процесса сборки
    await supabase
      .from('deployed_projects')
      .update({ 
        status: 'building',
      })
      .eq('id', deployment.id);

    console.log('Building project...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Имитация процесса развертывания
    await supabase
      .from('deployed_projects')
      .update({ 
        status: 'deploying',
      })
      .eq('id', deployment.id);

    console.log('Deploying project...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Генерируем URL для демонстрации
    const deploymentUrl = `https://lovable${deployment.id.slice(0, 6)}.netlify.app`;

    // Обновляем статус и URL проекта
    const { error: updateError } = await supabase
      .from('deployed_projects')
      .update({ 
        status: 'deployed',
        project_url: deploymentUrl,
        last_deployment: new Date().toISOString()
      })
      .eq('id', deployment.id);

    if (updateError) {
      console.error('Error updating deployment status:', updateError);
      throw updateError;
    }

    console.log('Deployment completed successfully:', deploymentUrl);

    res.json({ 
      success: true, 
      deploymentUrl,
      deploymentId: deployment.id
    });
  } catch (error) {
    console.error('Deployment error:', error);

    // Обновляем статус на ошибку, если есть ID развертывания
    if (error.deploymentId) {
      await supabase
        .from('deployed_projects')
        .update({ 
          status: 'error',
          last_deployment: new Date().toISOString()
        })
        .eq('id', error.deploymentId);
    }

    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to deploy project'
    });
  }
};
