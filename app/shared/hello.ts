export interface StudioHealthResponse {
  product: 'jaraoke-studio';
  appName: string;
  greeting: string;
  status: 'ok';
}

export const getSharedGreeting = (productName: string): string => {
  return `Hello from ${productName}`;
};
