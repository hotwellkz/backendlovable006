import { docker } from '../config/docker.js';
import { supabase } from '../config/supabase.js';

export const createAndStartContainer = async (userId, projectId, framework, files) => {
  try {
    console.log('Starting container creation for user:', userId);

    // Сохраняем файлы в Supabase Storage
    console.log('Saving files to Supabase Storage...');
    const uploadedFiles = [];
    
    for (const file of files) {
      const filePath = `${userId}/${projectId}/${file.path}`;
      const fileContent = new TextEncoder().encode(file.content);
      
      console.log(`Uploading file: ${filePath}`);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('project_files')
        .upload(filePath, fileContent, {
          contentType: 'text/plain',
          upsert: true
        });

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        throw uploadError;
      }

      // Получаем публичную ссылку
      const { data: { publicUrl } } = await supabase.storage
        .from('project_files')
        .getPublicUrl(filePath);

      uploadedFiles.push({
        path: file.path,
        url: publicUrl
      });
    }

    console.log('Files uploaded successfully:', uploadedFiles);

    // Создаем временную директорию для файлов проекта
    const containerName = `app-${projectId.slice(0, 8)}`;
    
    // Подготавливаем конфигурацию контейнера
    const containerConfig = {
      Image: 'node:18-alpine',
      name: containerName,
      Tty: true,
      OpenStdin: true,
      ExposedPorts: {
        '3000/tcp': {}
      },
      HostConfig: {
        PortBindings: {
          '3000/tcp': [{ HostPort: '3000' }]
        },
        RestartPolicy: {
          Name: 'on-failure',
          MaximumRetryCount: 3
        },
        NetworkMode: 'bridge',
        Memory: 512 * 1024 * 1024,
        MemorySwap: 1024 * 1024 * 1024,
        CpuShares: 512
      },
      Env: [
        `PROJECT_ID=${projectId}`,
        `USER_ID=${userId}`,
        'NODE_ENV=production',
        'PORT=3000',
        `BACKEND_URL=https://backendlovable006.onrender.com`,
        // Передаем список файлов и их URL
        `PROJECT_FILES=${JSON.stringify(uploadedFiles)}`
      ],
      WorkingDir: '/app',
      // Обновляем команду запуска для скачивания файлов
      Cmd: ["/bin/sh", "-c", `
        apk add --no-cache curl && 
        mkdir -p /app && 
        cd /app && 
        for file in $(echo $PROJECT_FILES | jq -r '.[] | @base64'); do
          _jq() {
            echo ${file} | base64 --decode | jq -r ${1}
          }
          curl -o "$(_jq '.path')" "$(_jq '.url')"
        done && 
        npm install && 
        npm start
      `]
    };

    // Проверяем подключение к Docker
    console.log('Verifying Docker connection...');
    await docker.ping();
    console.log('Docker connection verified');

    // Создаем контейнер
    console.log('Creating container with config:', JSON.stringify(containerConfig, null, 2));
    const container = await docker.createContainer(containerConfig);
    console.log('Container created:', container.id);
    
    // Обновляем статус в базе данных
    await supabase
      .from('docker_containers')
      .update({ 
        container_id: container.id,
        status: 'created',
        container_logs: 'Container created successfully'
      })
      .eq('project_id', projectId);

    // Запускаем контейнер
    console.log('Starting container:', container.id);
    await container.start();
    console.log('Container started successfully');

    // Получаем информацию о контейнере
    const containerInfo = await container.inspect();
    console.log('Container info:', {
      id: containerInfo.Id,
      state: containerInfo.State,
      network: containerInfo.NetworkSettings
    });

    // Формируем URL для доступа к контейнеру
    const containerUrl = `https://docker-jy4o.onrender.com/container/${containerInfo.Id}`;
    console.log('Container URL:', containerUrl);

    // Обновляем статус после запуска
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'running',
        container_url: containerUrl,
        container_logs: 'Container started successfully'
      })
      .eq('project_id', projectId);

    return {
      containerId: container.id,
      containerName,
      containerUrl,
      status: 'running'
    };

  } catch (error) {
    console.error('Error in createAndStartContainer:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Обновляем статус с ошибкой
    await supabase
      .from('docker_containers')
      .update({ 
        status: 'error',
        container_logs: `Error: ${error.message}`
      })
      .eq('project_id', projectId);

    throw error;
  }
};

export const stopAndRemoveContainer = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);

    // Останавливаем контейнер
    await container.stop();
    console.log('Container stopped:', containerId);

    // Удаляем контейнер
    await container.remove();
    console.log('Container removed:', containerId);

    return true;
  } catch (error) {
    console.error('Error in stopAndRemoveContainer:', error);
    throw error;
  }
};

export const getContainerLogs = async (containerId) => {
  try {
    const container = docker.getContainer(containerId);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail: 100,
      follow: false
    });

    return logs.toString('utf8');
  } catch (error) {
    console.error('Error getting container logs:', error);
    throw error;
  }
};
