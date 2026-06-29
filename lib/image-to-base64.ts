import { Platform } from 'react-native';

export async function imageUriToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        resolve(dataUrl.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  const { readAsStringAsync, EncodingType } = await import('expo-file-system/legacy');
  return readAsStringAsync(uri, { encoding: EncodingType.Base64 });
}
