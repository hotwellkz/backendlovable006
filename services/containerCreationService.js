import { docker } from '../config/docker.js';
import { supabase } from '../config/supabase.js';
import { checkContainerHealth, handleContainerError } from './containerMonitoringService.js';

export const createContainer = async (userId, projectId, framework, files) => {
  try {
    console.log('Starting container creation for user:', userId);
    
    const containerConfig = await prepareContainerConfig(userId, projectId, framework, files);
    const container = await docker.createContainer(containerConfig);
    
    await updateContainerRecord(container.id, projectId, 'created');
    
    console.log('Starting container:', container.id);
    await container.start();
    
    const containerInfo = await container.inspect();
    const containerUrl = `https://docker-jy4o.onrender.com/container/${containerInfo.Id}`;
    
    // Проверяем здоровье контейнера после запуска
    const isHealthy = await checkContainerHealth(container.id, containerUrl);
    
    if (!isHealthy) {
      throw new Error('Container health check failed');
    }
    
    return {
      containerId: container.id,
      containerUrl,
      status: 'running'
    };
    
  } catch (error) {
    console.error('Error in createContainer:', error);
    throw error;
  }
};

const prepareContainerConfig = async (userId, projectId, framework, files) => {
  const containerName = `app-${projectId.slice(0, 8)}`;
  const uploadedFiles = await uploadFilesToStorage(userId, projectId, files);
  
  return {
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
      `PROJECT_FILES=${JSON.stringify(uploadedFiles)}`
    ],
    WorkingDir: '/app',
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
};

const uploadFilesToStorage = async (userId, projectId, files) => {
  const uploadedFiles = [];
  
  for (const file of files) {
    const filePath = `${userId}/${projectId}/${file.path}`;
    const fileContent = new TextEncoder().encode(file.content);
    
    console.log(`Uploading file: ${filePath}`);
    const { error: uploadError } = await supabase.storage
      .from('project_files')
      .upload(filePath, fileContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    const { data: { publicUrl } } = await supabase.storage
      .from('project_files')
      .getPublicUrl(filePath);

    uploadedFiles.push({
      path: file.path,
      url: publicUrl
    });
  }
  
  return uploadedFiles;
};

const updateContainerRecord = async (containerId, projectId, status) => {
  const { error } = await supabase
    .from('docker_containers')
    .update({ 
      container_id: containerId,
      status,
      container_logs: `Container ${status} successfully`
    })
    .eq('project_id', projectId);

  if (error) {
    console.error('Error updating container record:', error);
    throw error;
  }
};
