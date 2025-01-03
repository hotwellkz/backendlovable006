import { supabase } from '../config/supabase.js';

export const handleDeployment = async (req, res) => {
  try {
    const { userId, files, framework } = req.body;

    // Создаем запись о развертывании
    const { data: deployment, error: deploymentError } = await supabase
      .from('deployed_projects')
      .insert({
        user_id: userId,
        framework: framework,
        status: 'deploying'
      })
      .select()
      .single();

    if (deploymentError) throw deploymentError;

    // Здесь будет логика развертывания файлов
    // Для демонстрации используем Netlify
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

    if (updateError) throw updateError;

    res.json({ 
      success: true, 
      deploymentUrl,
      deploymentId: deployment.id
    });
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to deploy project'
    });
  }
};
