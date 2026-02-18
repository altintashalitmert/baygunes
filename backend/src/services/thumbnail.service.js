import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Generate thumbnail for uploaded images
export const generateThumbnail = async (inputPath, outputPath, options = {}) => {
  const { width = 200, height = 200, quality = 80 } = options;
  
  try {
    await sharp(inputPath)
      .resize(width, height, { 
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality })
      .toFile(outputPath);
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Thumbnail generation failed:', error);
    throw error;
  }
};

// Process image upload with thumbnail
export const processImageUpload = async (file, options = {}) => {
  const { generateThumb = true, thumbWidth = 200, thumbHeight = 200 } = options;
  
  const result = {
    originalPath: file.path,
    thumbnailPath: null
  };
  
  if (generateThumb && file.mimetype.startsWith('image/')) {
    try {
      const parsedPath = path.parse(file.path);
      const thumbnailPath = path.join(
        parsedPath.dir,
        `${parsedPath.name}_thumb${parsedPath.ext}`
      );
      
      await generateThumbnail(file.path, thumbnailPath, {
        width: thumbWidth,
        height: thumbHeight
      });
      
      result.thumbnailPath = thumbnailPath;
      result.thumbnailUrl = thumbnailPath.replace(/^.*[\\/]uploads/, '/uploads');
    } catch (error) {
      console.error('Failed to generate thumbnail:', error);
      // Continue without thumbnail
    }
  }
  
  return result;
};

// Get image dimensions
export const getImageDimensions = async (imagePath) => {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    console.error('Failed to get image dimensions:', error);
    return null;
  }
};

// Optimize image for web
export const optimizeImage = async (inputPath, outputPath, options = {}) => {
  const { quality = 85, maxWidth = 1920 } = options;
  
  try {
    await sharp(inputPath)
      .resize(maxWidth, null, { 
        withoutEnlargement: true,
        fit: 'inside'
      })
      .jpeg({ quality, progressive: true })
      .toFile(outputPath);
    
    return { success: true, path: outputPath };
  } catch (error) {
    console.error('Image optimization failed:', error);
    throw error;
  }
};
