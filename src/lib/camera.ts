import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

/**
 * Camera utility functions for native camera integration
 */

export interface CameraPhoto {
  dataUrl: string;
  format: string;
}

/**
 * Take a photo using the device camera
 */
export async function takePicture(): Promise<CameraPhoto | null> {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
    });

    if (!image.dataUrl) {
      throw new Error('No image data returned');
    }

    return {
      dataUrl: image.dataUrl,
      format: image.format,
    };
  } catch (error) {
    console.error('Error taking picture:', error);
    return null;
  }
}

/**
 * Pick a photo from the device gallery
 */
export async function pickFromGallery(): Promise<CameraPhoto | null> {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: true,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    if (!image.dataUrl) {
      throw new Error('No image data returned');
    }

    return {
      dataUrl: image.dataUrl,
      format: image.format,
    };
  } catch (error) {
    console.error('Error picking from gallery:', error);
    return null;
  }
}

/**
 * Pick multiple photos from gallery
 */
export async function pickMultiplePhotos(maxPhotos: number = 5): Promise<CameraPhoto[]> {
  const photos: CameraPhoto[] = [];
  
  try {
    // Note: Capacitor Camera doesn't support multiple selection natively
    // We'll pick one at a time up to maxPhotos
    for (let i = 0; i < maxPhotos; i++) {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Photos,
      });

      if (image.dataUrl) {
        photos.push({
          dataUrl: image.dataUrl,
          format: image.format,
        });
      }
      
      // Break if user cancels
      if (!image.dataUrl) break;
    }
  } catch (error) {
    console.error('Error picking multiple photos:', error);
  }
  
  return photos;
}

/**
 * Check if camera is available on the device
 */
export async function isCameraAvailable(): Promise<boolean> {
  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera !== 'denied';
  } catch (error) {
    console.error('Error checking camera availability:', error);
    return false;
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermissions(): Promise<boolean> {
  try {
    const permissions = await Camera.requestPermissions();
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Error requesting camera permissions:', error);
    return false;
  }
}

/**
 * Convert data URL to File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  
  return new File([u8arr], filename, { type: mime });
}
