import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as exifr from 'exifr';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

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
  const { user } = useAuth();
  const [codes, setCodes] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loadingCodes, setLoadingCodes] = useState(false);

  // Fetch codes from Supabase
  const fetchCodes = useCallback(async () => {
    console.log('[PhotographerContext] fetchCodes called, user:', user?.id);
    if (!user) {
      console.log('[PhotographerContext] No user, skipping fetchCodes');
      return;
    }

    setLoadingCodes(true);
    try {
      // Get photographer profile first
      console.log('[PhotographerContext] Fetching photographer profile...');
      const { data: profile, error: profileError } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      console.log('[PhotographerContext] Photographer profile result:', { profile, profileError });

      if (profileError || !profile) {
        console.log('[PhotographerContext] No photographer profile found, clearing codes');
        setCodes([]);
        return;
      }

      console.log('[PhotographerContext] Photographer profile found, fetching codes...');

      // Fetch codes and related photos through code_photos
      console.log('[PhotographerContext] Querying photo_codes with relationships...');
      const { data: codesData, error: codesError } = await supabase
        .from('photo_codes')
        .select(`
          *,
          code_photos (
            photos (
              id,
              title,
              description,
              status,
              file_url,
              watermarked_url,
              is_sample,
              created_at
            )
          )
        `)
        .order('created_at', { ascending: false });

      console.log('[PhotographerContext] Codes query result:', { codesData, codesError });

      if (codesError) {
        console.error('[PhotographerContext] Codes query failed:', codesError);
        throw codesError;
      }

      const buildPublicUrl = (bucket, path) => {
        if (!path) return null;
        if (typeof path === 'string' && path.startsWith('http')) return path;
        const { data } = supabase.storage.from(bucket).getPublicUrl(path);
        return data?.publicUrl || null;
      };

      const buildSignedUrl = async (bucket, path) => {
        if (!path) return null;
        if (typeof path === 'string' && path.startsWith('http')) return path;
        const { data, error } = await supabase.storage
          .from(bucket)
          .createSignedUrl(path, 60 * 60); // 1 hour

        if (error) {
          console.error('[PhotographerContext] Failed to create signed URL:', error);
          return null;
        }

        return data?.signedUrl || null;
      };

      // Transform data to match the expected format
      console.log('[PhotographerContext] Transforming codes data...');
      const transformedCodes = await Promise.all(codesData.map(async (code) => {
        const photos = code.code_photos?.map(cp => cp.photos).filter(Boolean) || [];
        console.log(`[PhotographerContext] Code ${code.code}: found ${photos.length} photos`);
        return {
          id: code.id,
          code: code.code,
          status: photos.length > 0 ? 'published' : 'pending_upload',
          createdAt: new Date(code.created_at),
          sharedAt: code.shared_at ? new Date(code.shared_at) : null,
          uploadedAt: code.uploaded_at ? new Date(code.uploaded_at) : null,
          publishedAt: code.published_at ? new Date(code.published_at) : null,
          expiresAt: new Date(code.expires_at),
          tags: [], // Could be stored separately if needed
          note: '', // Could be stored separately if needed
          photos: await Promise.all(
            photos.map(async (photo) => {
              const originalUrl = await buildSignedUrl('photos-original', photo.file_url);
              const blurredUrl = buildPublicUrl('photos', photo.watermarked_url);

              return {
                id: photo.id,
                preview_url: originalUrl || blurredUrl || null,
                original_url: originalUrl,
                blurred_url: blurredUrl,
                watermarked: !originalUrl && Boolean(blurredUrl),
                isSample: photo.is_sample || false,
                exif: null,
                file: null,
              };
            })
          ),
          views: 0, // Would need to be tracked separately
          unlocks: code.is_redeemed ? 1 : 0,
          unlockedAt: code.redeemed_at ? new Date(code.redeemed_at) : null,
        };
      }));

      console.log('[PhotographerContext] Final transformed codes:', transformedCodes);
      setCodes(transformedCodes);
    } catch (error) {
      console.error('[PhotographerContext] Failed to fetch codes:', error);
      console.error('[PhotographerContext] Error details:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      setCodes([]);
    } finally {
      console.log('[PhotographerContext] fetchCodes completed');
      setLoadingCodes(false);
    }
  }, [user]);

  // Load codes when user changes
  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  // Generate a new code (now handled by GenerateCodeModal, just refresh data)
  const createCode = useCallback((metadata = {}) => {
    // Codes are now created in GenerateCodeModal and stored in Supabase
    // Just refresh the data
    fetchCodes();

    // Return a placeholder for compatibility
    const placeholderCode = {
      id: Date.now().toString(),
      code: 'GENERATING...',
      status: 'pending_upload',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      tags: metadata.tags || [],
      note: metadata.note || '',
      photos: [],
      views: 0,
      unlocks: 0,
    };

    return placeholderCode;
  }, [fetchCodes]);

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

  const deleteCode = useCallback(async (codeId) => {
    if (!codeId) return;

    try {
      console.log('[PhotographerContext] Deleting code:', codeId);

      // Remove linked code photos first to avoid FK issues
      const { error: codePhotosError } = await supabase
        .from('code_photos')
        .delete()
        .eq('code_id', codeId);

      if (codePhotosError) {
        throw codePhotosError;
      }

      const { error: deleteError } = await supabase
        .from('photo_codes')
        .delete()
        .eq('id', codeId);

      if (deleteError) {
        throw deleteError;
      }

      setCodes((prev) => prev.filter((code) => code.id !== codeId));
      addNotification({
        type: 'success',
        message: 'Code deleted successfully',
      });
    } catch (error) {
      console.error('[PhotographerContext] Failed to delete code:', error);
      addNotification({
        type: 'error',
        message: 'Failed to delete code. Please try again.',
      });
      throw error;
    }
  }, [addNotification]);

  const value = {
    codes,
    uploads,
    notifications,
    loadingCodes,
    createCode,
    uploadPhotos,
    matchPhotosToCode,
    getAutoMatchSuggestions,
    addNotification,
    removeNotification,
    getCodesByStatus,
    extendCode,
    invalidateCode,
    fetchCodes,
    deleteCode,
  };

  return (
    <PhotographerContext.Provider value={value}>
      {children}
    </PhotographerContext.Provider>
  );
};
