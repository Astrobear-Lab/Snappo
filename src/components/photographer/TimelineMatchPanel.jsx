import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useMemo, useEffect } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';

const TimelineMatchPanel = () => {
  const { user } = useAuth();
  const { uploads, codes, uploadPhotos, fetchCodes } = usePhotographer();

  const [isDragging, setIsDragging] = useState(false);
  const [photoCodeMap, setPhotoCodeMap] = useState({}); // { photoId: codeId }
  const [activeId, setActiveId] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useState(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-match photos to nearest code based on time
  const autoMatchPhotos = useCallback(() => {
    const newMap = {};
    const sortedCodes = [...codes]
      .filter(c => c.status === 'pending_upload')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    uploads.forEach(upload => {
      if (!upload.exif?.DateTimeOriginal) return;

      const photoTime = new Date(upload.exif.DateTimeOriginal);
      let closestCode = null;
      let minDiff = Infinity;

      sortedCodes.forEach(code => {
        const codeTime = new Date(code.createdAt);
        const diff = Math.abs(photoTime - codeTime);

        // Match if within 4 hours
        if (diff < 4 * 60 * 60 * 1000 && diff < minDiff) {
          minDiff = diff;
          closestCode = code;
        }
      });

      if (closestCode) {
        newMap[upload.id] = closestCode.id;
      }
    });

    setPhotoCodeMap(newMap);
  }, [uploads, codes]);

  // Auto-match on initial load and when uploads/codes change
  useEffect(() => {
    autoMatchPhotos();
  }, [autoMatchPhotos]);

  // Group photos by code
  const timelineItems = useMemo(() => {
    const items = [];

    // Add codes with matched photos
    const sortedCodes = [...codes]
      .filter(c => c.status === 'pending_upload')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sortedCodes.forEach(code => {
      const matchedPhotos = uploads.filter(u => photoCodeMap[u.id] === code.id);
      items.push({
        type: 'code',
        code,
        photos: matchedPhotos,
        time: new Date(code.createdAt),
      });
    });

    // Add unmatched photos
    const unmatchedPhotos = uploads.filter(u => !photoCodeMap[u.id]);
    if (unmatchedPhotos.length > 0) {
      items.push({
        type: 'unmatched',
        photos: unmatchedPhotos,
        time: null,
      });
    }

    return items;
  }, [codes, uploads, photoCodeMap]);

  // Handle file upload
  const handleFileInput = (e) => {
    const files = Array.from(e.target.files).filter(file =>
      file.type.startsWith('image/')
    );
    if (files.length > 0) {
      uploadPhotos(files);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('image/')
      );

      if (files.length > 0) {
        uploadPhotos(files);
      }
    },
    [uploadPhotos]
  );

  // Drag handlers
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const photoId = active.id;
      const newCodeId = over.id === 'unmatched' ? null : over.id;

      setPhotoCodeMap(prev => {
        const newMap = { ...prev };
        if (newCodeId) {
          newMap[photoId] = newCodeId;
        } else {
          delete newMap[photoId];
        }
        return newMap;
      });
    }

    setActiveId(null);
  };

  // Upload all matched photos
  const handleUploadAll = async () => {
    if (Object.keys(photoCodeMap).length === 0) {
      alert('No photos matched to codes');
      return;
    }

    setUploading(true);
    try {
      // Get photographer profile
      const { data: profile, error: profileError } = await supabase
        .from('photographer_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Photographer profile not found');
      }

      // Upload each matched photo
      for (const [photoId, codeId] of Object.entries(photoCodeMap)) {
        const upload = uploads.find(u => u.id === photoId);
        if (!upload) continue;

        const fileExt = upload.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const filePath = `user-${user.id}/${fileName}`;

        // Upload to storage
        const { data: originalData, error: originalError } = await supabase.storage
          .from('photos-original')
          .upload(`${filePath}.${fileExt}`, upload.file);

        if (originalError) throw originalError;

        const { data: watermarkedData, error: watermarkedError } = await supabase.storage
          .from('photos')
          .upload(`${filePath}-watermarked.${fileExt}`, upload.file);

        if (watermarkedError) throw watermarkedError;

        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('photos')
          .getPublicUrl(`${filePath}-watermarked.${fileExt}`);

        // Create photo record
        const { data: photoData, error: photoError } = await supabase
          .from('photos')
          .insert([
            {
              photographer_id: profile.id,
              file_url: originalData.path,
              watermarked_url: publicUrlData.publicUrl,
              title: upload.file.name,
              file_size: upload.file.size,
              status: 'approved',
            },
          ])
          .select()
          .single();

        if (photoError) throw photoError;

        // Check if this is the first photo for this code
        const { data: existingPhotos } = await supabase
          .from('code_photos')
          .select('id')
          .eq('code_id', codeId)
          .limit(1);

        const isFirstPhoto = !existingPhotos || existingPhotos.length === 0;

        // Link to code
        const { error: linkError } = await supabase
          .from('code_photos')
          .insert([
            {
              code_id: codeId,
              photo_id: photoData.id,
            },
          ]);

        if (linkError) throw linkError;

        // Set uploaded_at and published_at timestamps if this is the first photo
        if (isFirstPhoto) {
          const now = new Date().toISOString();
          const { error: updateError } = await supabase
            .from('photo_codes')
            .update({
              uploaded_at: now,
              published_at: now  // Photos are published immediately after upload
            })
            .eq('id', codeId);

          if (updateError) console.error('Failed to update timestamps:', updateError);
        }
      }

      // Refresh codes
      await fetchCodes();

      // Clear photo map
      setPhotoCodeMap({});

      alert('All photos uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload photos: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const activePhoto = activeId ? uploads.find(u => u.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="bg-white rounded-3xl shadow-lg p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Timeline Upload & Match
          </h2>
          <p className="text-gray-600">
            Photos are auto-matched by time. Drag to adjust.
          </p>
        </div>

        {/* Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative mb-6 border-2 border-dashed rounded-2xl p-8 transition-all ${
            isDragging
              ? 'border-teal bg-teal/5 scale-105'
              : 'border-gray-300 hover:border-teal/50'
          }`}
        >
          <div className="text-center">
            <div className="text-6xl mb-4">📸</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              Drop photos here
            </h3>
            <p className="text-gray-600 mb-4">or click to browse</p>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInput}
              className="hidden"
              id="timeline-photo-upload"
            />
            <label htmlFor="timeline-photo-upload">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="inline-block px-6 py-3 bg-teal text-white font-semibold rounded-xl hover:bg-teal/90 transition-colors"
              >
                Browse Files
              </motion.div>
            </label>
          </div>
        </div>

        {/* Timeline */}
        {timelineItems.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">
                Timeline ({Object.keys(photoCodeMap).length} matched)
              </h3>
              {Object.keys(photoCodeMap).length > 0 && (
                <motion.button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  whileHover={{ scale: uploading ? 1 : 1.05 }}
                  whileTap={{ scale: uploading ? 1 : 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : `Upload All (${Object.keys(photoCodeMap).length})`}
                </motion.button>
              )}
            </div>

            {/* Timeline Items - Will be implemented in next step with drag & drop */}
            <div className="space-y-4">
              {timelineItems.map((item, index) => (
                <TimelineItem
                  key={item.type === 'code' ? item.code.id : 'unmatched'}
                  item={item}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {uploads.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">🎯</div>
            <p className="text-gray-600">
              Upload photos to get started
            </p>
          </div>
        )}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activePhoto ? (
          <div className="w-20 h-20 rounded-lg overflow-hidden shadow-2xl border-2 border-teal">
            <img
              src={activePhoto.url}
              alt="Dragging"
              className="w-full h-full object-cover opacity-80"
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

// Draggable Photo Component
const DraggablePhoto = ({ photo }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: photo.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`aspect-square rounded-lg overflow-hidden bg-gray-200 ${
        isDragging ? 'opacity-50' : 'hover:ring-2 hover:ring-teal'
      } transition-all`}
    >
      <img
        src={photo.url}
        alt="Photo"
        className="w-full h-full object-cover"
      />
    </div>
  );
};

// Droppable Zone Component
const DroppableZone = ({ id, children, isOver }) => {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`transition-all ${
        isOver ? 'ring-2 ring-teal bg-teal/5' : ''
      }`}
    >
      {children}
    </div>
  );
};

// Timeline Item Component with drag & drop
const TimelineItem = ({ item, formatTime }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: item.type === 'code' ? item.code.id : 'unmatched',
  });

  if (item.type === 'code') {
    return (
      <div className="relative pl-8 border-l-2 border-gray-200">
        <div className="absolute left-0 top-2 w-4 h-4 -ml-2 bg-teal rounded-full border-2 border-white shadow"></div>

        <div
          ref={setNodeRef}
          className={`bg-gray-50 rounded-xl p-4 transition-all ${
            isOver ? 'ring-2 ring-teal bg-teal/5' : ''
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-500 mb-1">
                {formatTime(item.time)}
              </div>
              <div className="flex items-center gap-2">
                <h4 className="font-mono text-lg font-bold text-gray-800">
                  {item.code.code}
                </h4>
                {item.code.note && (
                  <span className="text-sm text-gray-600">- {item.code.note}</span>
                )}
              </div>
            </div>
            <span className="text-sm text-gray-500">
              {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Draggable Photos */}
          {item.photos.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {item.photos.map(photo => (
                <DraggablePhoto key={photo.id} photo={photo} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              Drop photos here
            </div>
          )}
        </div>
      </div>
    );
  }

  // Unmatched photos
  return (
    <div className="relative pl-8 border-l-2 border-gray-200">
      <div className="absolute left-0 top-2 w-4 h-4 -ml-2 bg-gray-400 rounded-full border-2 border-white shadow"></div>

      <div
        ref={setNodeRef}
        className={`bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 transition-all ${
          isOver ? 'ring-2 ring-yellow-400 bg-yellow-100' : ''
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🔍</span>
          <h4 className="font-bold text-gray-800">
            Unmatched Photos ({item.photos.length})
          </h4>
        </div>

        {item.photos.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {item.photos.map(photo => (
              <DraggablePhoto key={photo.id} photo={photo} />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-gray-400">
            No unmatched photos
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineMatchPanel;
