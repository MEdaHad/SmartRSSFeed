export const retryChunkLoad = async (chunkId: string, maxRetries = 3) => {
  let retries = 0;
  
  const loadChunk = async (): Promise<any> => {
    try {
      const chunk = await import(/* webpackChunkName: "[request]" */ `../../${chunkId}`);
      return chunk;
    } catch (error) {
      if (retries < maxRetries) {
        retries++;
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retries) * 1000));
        return loadChunk();
      }
      throw error;
    }
  };

  return loadChunk();
}; 