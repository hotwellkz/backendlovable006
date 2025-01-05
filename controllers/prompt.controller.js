import { handlePromptProcessing } from '../services/promptService.js';
import { supabase } from '../config/supabase.js';
import os from 'os';

export const handlePrompt = async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Логируем системную информацию
    const systemInfo = {
      freeMem: (os.freemem() / 1024 / 1024).toFixed(2) + ' MB',
      totalMem: (os.totalmem() / 1024 / 1024).toFixed(2) + ' MB',
      cpuLoad: os.loadavg(),
      uptime: os.uptime(),
      platform: os.platform(),
      arch: os.arch()
    };
    console.log('Системная информация:', systemInfo);

    // Проверяем авторизацию
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Некорректный формат заголовка авторизации',
        details: 'Требуется заголовок в формате: Bearer <token>'
      });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Ошибка проверки токена:', authError);
      return res.status(401).json({ 
        error: 'Недействительный токен авторизации',
        details: authError?.message
      });
    }

    const { prompt, framework, userId } = req.body;

    if (user.id !== userId) {
      return res.status(403).json({ 
        error: 'Доступ запрещен',
        details: 'ID пользователя не соответствует токену'
      });
    }

    // Обрабатываем промпт и получаем структурированный ответ
    const response = await handlePromptProcessing(prompt, framework, userId);

    // Создаем запись о развертывании
    const { data: deployment, error: deployError } = await supabase
      .from('deployed_projects')
      .insert({
        user_id: userId,
        framework: framework,
        status: 'preparing'
      })
      .select()
      .single();

    if (deployError) {
      throw deployError;
    }

    // Создаем Docker контейнер
    const { data: container, error: containerError } = await supabase
      .from('docker_containers')
      .insert({
        user_id: userId,
        project_id: deployment.id,
        framework: framework,
        status: 'initializing'
      })
      .select()
      .single();

    if (containerError) {
      throw containerError;
    }

    const executionTime = Date.now() - startTime;
    console.log('Запрос успешно обработан:', {
      userId,
      framework,
      executionTime: executionTime + 'ms',
      deploymentId: deployment.id,
      containerId: container.id
    });

    res.json({
      ...response,
      success: true,
      executionTime,
      deploymentId: deployment.id,
      containerId: container.id
    });
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('Критическая ошибка:', {
      error: error.message,
      stack: error.stack,
      executionTime: executionTime + 'ms'
    });
    
    res.status(500).json({
      error: 'Ошибка при обработке запроса',
      details: error.message,
      executionTime
    });
  }
};
