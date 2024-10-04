 

export const BUCKET_URL = 'https://storage.googleapis.com/swacch-bharat-ap';

export const fetchBucketContents = async () => {
    try {
      const response = await fetch(`${BUCKET_URL}?prefix=`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bucket contents: ${response.statusText}`);
      }
  
      const data = await response.text();
      return data;
    } catch (error) {
      throw new Error(`Error fetching bucket contents: ${error}`);
    }
  };