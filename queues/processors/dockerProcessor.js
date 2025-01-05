import { supabase } from '../../config/supabase.js';

export const processDockerOperations = async (job) => {
  const { operation, userId, containerId } = job.data;
  console.log('Processing Docker operation:', { operation, userId, containerId });

  try {
    switch (operation) {
      case 'create':
        return await createContainer(userId);
      case 'delete':
        return await deleteContainer(containerId);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  } catch (error) {
    console.error('Docker operation error:', error);
    throw error;
  }
};

async function createContainer(userId) {
  const { data: container, error } = await supabase
    .from('docker_containers')
    .insert({
      user_id: userId,
      status: 'creating',
      container_logs: 'Initializing container...'
    })
    .select()
    .single();

  if (error) throw error;
  
  console.log('Container created:', container);
  return container;
}

async function deleteContainer(containerId) {
  const { error } = await supabase
    .from('docker_containers')
    .delete()
    .eq('id', containerId);

  if (error) throw error;
  
  console.log('Container deleted:', containerId);
  return { success: true };
}
