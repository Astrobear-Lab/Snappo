/**
 * Image processing utilities for Snappo
 */

/**
 * Applies blur effect to an image file
 * @param {File} file - The original image file
 * @param {number} blurAmount - Blur intensity (default: 20)
 * @returns {Promise<Blob>} - The blurred image as a Blob
 */
export const blurImage = async (file, blurAmount = 20) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Apply blur filter and draw image
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(img, 0, 0);

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blurred image'));
          }
        },
        file.type || 'image/jpeg',
        0.9 // quality
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    // Load the image
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Resizes an image to a maximum dimension while maintaining aspect ratio
 * @param {File} file - The original image file
 * @param {number} maxDimension - Maximum width or height (default: 1920)
 * @returns {Promise<Blob>} - The resized image as a Blob
 */
export const resizeImage = async (file, maxDimension = 1920) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > height && width > maxDimension) {
        height = (height * maxDimension) / width;
        width = maxDimension;
      } else if (height > maxDimension) {
        width = (width * maxDimension) / height;
        height = maxDimension;
      }

      // Set canvas size
      canvas.width = width;
      canvas.height = height;

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create resized image'));
          }
        },
        file.type || 'image/jpeg',
        0.9
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * Creates a thumbnail from an image file
 * @param {File} file - The original image file
 * @param {number} size - Thumbnail size (default: 200)
 * @returns {Promise<Blob>} - The thumbnail as a Blob
 */
export const createThumbnail = async (file, size = 200) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Create square thumbnail
      const minDimension = Math.min(img.width, img.height);
      const sx = (img.width - minDimension) / 2;
      const sy = (img.height - minDimension) / 2;

      canvas.width = size;
      canvas.height = size;

      // Draw cropped and resized image
      ctx.drawImage(img, sx, sy, minDimension, minDimension, 0, 0, size, size);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        },
        'image/jpeg',
        0.8
      );
    };

    img.onerror = () => {
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
};
