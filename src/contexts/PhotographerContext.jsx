import { createContext, useContext, useState, useCallback } from 'react';
import * as exifr from 'exifr';

const PhotographerContext = createContext({});

export const usePhotographer = () => {
  const context = useContext(PhotographerContext);
  if (!context) {
    throw new Error('usePhotographer must be used within a PhotographerProvider');
  }
  return context;
};

// Mock data generator
export const generateMockCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
};

// Generate mock EXIF data for demo photos
const generateMockExif = (cameraModel, index) => {
  const cameras = {
    canon: {
      Make: 'Canon',
      Model: 'Canon EOS R5',
      LensModel: 'RF24-70mm F2.8 L IS USM',
    },
    sony: {
      Make: 'Sony',
      Model: 'ILCE-7M4',
      LensModel: 'FE 24-70mm F2.8 GM',
    },
    nikon: {
      Make: 'Nikon',
      Model: 'Z9',
      LensModel: 'NIKKOR Z 24-70mm f/2.8 S',
    },
  };

  const camera = cameras[cameraModel] || cameras.canon;
  const baseDate = new Date(Date.now() - 24 * 60 * 60 * 1000 - index * 60 * 60 * 1000);

  return {
    ...camera,
    DateTimeOriginal: baseDate,
    ISO: [100, 200, 400, 800, 1600][index % 5],
    FNumber: [1.8, 2.8, 4, 5.6, 8][index % 5],
    ExposureTime: [1/1000, 1/500, 1/250, 1/125, 1/60][index % 5],
    FocalLength: [24, 35, 50, 70, 85][index % 5],
    ImageWidth: 6000,
    ImageHeight: 4000,
    WhiteBalance: 0,
    Flash: 0,
    ColorSpace: 1,
    // GPS data for some photos
    ...(index % 2 === 0 ? {
      latitude: 37.7749 + (Math.random() - 0.5) * 0.1,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.1,
    } : {}),
  };
};

const generateMockCodes = () => [
  {
    id: '1',
    code: 'A3F2K9',
    status: 'pending_upload',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
    tags: ['wedding', 'outdoor'],
    note: 'Sarah & Tom ceremony',
    photos: [],
    views: 0,
    unlocks: 0,
  },
  {
    id: '2',
    code: 'B7H4M2',
    status: 'published',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 19 * 60 * 60 * 1000),
    tags: ['portrait'],
    note: 'Birthday photoshoot',
    photos: [
      {
        id: 'p1',
        url: 'https://picsum.photos/seed/1/800/600',
        watermarked: true,
        exif: generateMockExif('canon', 0),
        file: { size: 3456789 },
      },
      {
        id: 'p2',
        url: 'https://picsum.photos/seed/2/800/600',
        watermarked: true,
        exif: generateMockExif('sony', 1),
        file: { size: 4123456 },
      },
    ],
    views: 12,
    unlocks: 0,
  },
  {
    id: '3',
    code: 'C9P5N8',
    status: 'unlocked',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    tags: ['event'],
    note: 'Corporate gala',
    photos: [
      {
        id: 'p3',
        url: 'https://picsum.photos/seed/3/800/600',
        watermarked: false,
        exif: generateMockExif('nikon', 2),
        file: { size: 5234567 },
      },
      {
        id: 'p4',
        url: 'https://picsum.photos/seed/4/800/600',
        watermarked: false,
        exif: generateMockExif('canon', 3),
        file: { size: 3987654 },
      },
      {
        id: 'p5',
        url: 'https://picsum.photos/seed/5/800/600',
        watermarked: false,
        exif: generateMockExif('sony', 4),
        file: { size: 4567890 },
      },
    ],
    views: 45,
    unlocks: 1,
    unlockedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
  {
    id: '4',
    code: 'D2K7L4',
    status: 'expired',
    createdAt: new Date(Date.now() - 76 * 60 * 60 * 1000),
    expiresAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
    tags: [],
    note: '',
    photos: [],
    views: 2,
    unlocks: 0,
  },
];

export const PhotographerProvider = ({ children }) => {
  const [codes, setCodes] = useState(generateMockCodes());
  const [uploads, setUploads] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Generate a new code
  const createCode = useCallback((metadata = {}) => {
    const newCode = {
      id: Date.now().toString(),
      code: generateMockCode(),
      status: 'pending_upload',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // 72 hours
      tags: metadata.tags || [],
      note: metadata.note || '',
      photos: [],
      views: 0,
      unlocks: 0,
    };

    setCodes((prev) => [newCode, ...prev]);
    addNotification({
      type: 'success',
      message: `Code ${newCode.code} created successfully`,
    });

    return newCode;
  }, []);

  // Upload photos
  const uploadPhotos = useCallback(async (files) => {
    console.log(`📸 Uploading ${files.length} photo(s)...`);

    const newUploadsPromises = files.map(async (file, idx) => {
      console.log(`\n🔍 Processing file: ${file.name}`);
      console.log(`   Type: ${file.type}, Size: ${(file.size / 1024).toFixed(2)} KB`);

      // Extract EXIF data
      let exifData = null;
      try {
        exifData = await exifr.parse(file, {
          // Request all available fields
          tiff: true,
          exif: true,
          gps: true,
          interop: true,
          ifd0: true,
          ifd1: true,
          iptc: false,
          jfif: false,
        });

        if (exifData) {
          console.log(`   ✅ EXIF data extracted successfully!`);
          console.log(`   Camera: ${exifData.Make || 'N/A'} ${exifData.Model || 'N/A'}`);
          console.log(`   Date: ${exifData.DateTimeOriginal || 'N/A'}`);
          console.log(`   ISO: ${exifData.ISO || 'N/A'}`);
          console.log(`   Full EXIF data:`, exifData);
        } else {
          console.log(`   ⚠️ No EXIF data found in this file`);
          console.log(`   This is normal for screenshots, edited images, or images from social media`);
        }
      } catch (error) {
        console.error(`   ❌ Error extracting EXIF data from ${file.name}:`, error);
      }

      return {
        id: `upload-${Date.now()}-${idx}`,
        file,
        url: URL.createObjectURL(file),
        uploadedAt: new Date(),
        matched: false,
        codeId: null,
        exif: exifData,
      };
    });

    const newUploads = await Promise.all(newUploadsPromises);
    console.log(`\n✨ Upload complete! ${newUploads.length} photo(s) processed`);
    console.log(`Photos with EXIF: ${newUploads.filter(u => u.exif).length}`);

    setUploads((prev) => [...prev, ...newUploads]);
    return newUploads;
  }, []);

  // Match photos to code
  const matchPhotosToCode = useCallback((photoIds, codeId) => {
    setUploads((prev) =>
      prev.map((upload) =>
        photoIds.includes(upload.id)
          ? { ...upload, matched: true, codeId }
          : upload
      )
    );

    setCodes((prev) =>
      prev.map((code) => {
        if (code.id === codeId) {
          const matchedPhotos = uploads
            .filter((u) => photoIds.includes(u.id))
            .map((u) => ({
              id: u.id,
              url: u.url,
              watermarked: true,
              exif: u.exif,
              file: u.file,
            }));

          return {
            ...code,
            photos: [...code.photos, ...matchedPhotos],
            status: 'published',
          };
        }
        return code;
      })
    );

    addNotification({
      type: 'success',
      message: `${photoIds.length} photo${photoIds.length > 1 ? 's' : ''} matched successfully`,
    });
  }, [uploads]);

  // Auto-match suggestions
  const getAutoMatchSuggestions = useCallback((upload) => {
    // Try to match based on filename or timestamp
    return codes
      .filter((code) => {
        // Check if code is in filename
        if (upload.file.name.toUpperCase().includes(code.code)) {
          return true;
        }

        // Check if upload time is within 2 hours of code creation
        const timeDiff = Math.abs(upload.uploadedAt - code.createdAt);
        const twoHours = 2 * 60 * 60 * 1000;
        return timeDiff < twoHours && code.status === 'pending_upload';
      })
      .slice(0, 3); // Top 3 suggestions
  }, [codes]);

  // Add notification
  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { ...notification, id }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Get codes by status
  const getCodesByStatus = useCallback((status) => {
    return codes.filter((code) => code.status === status);
  }, [codes]);

  // Extend code expiration
  const extendCode = useCallback((codeId, hours = 24) => {
    setCodes((prev) =>
      prev.map((code) =>
        code.id === codeId
          ? {
              ...code,
              expiresAt: new Date(code.expiresAt.getTime() + hours * 60 * 60 * 1000),
            }
          : code
      )
    );

    addNotification({
      type: 'success',
      message: `Code extended by ${hours} hours`,
    });
  }, []);

  // Mark code as invalid
  const invalidateCode = useCallback((codeId) => {
    setCodes((prev) =>
      prev.map((code) =>
        code.id === codeId ? { ...code, status: 'expired' } : code
      )
    );

    addNotification({
      type: 'info',
      message: 'Code marked as invalid',
    });
  }, []);

  const value = {
    codes,
    uploads,
    notifications,
    createCode,
    uploadPhotos,
    matchPhotosToCode,
    getAutoMatchSuggestions,
    addNotification,
    removeNotification,
    getCodesByStatus,
    extendCode,
    invalidateCode,
  };

  return (
    <PhotographerContext.Provider value={value}>
      {children}
    </PhotographerContext.Provider>
  );
};
