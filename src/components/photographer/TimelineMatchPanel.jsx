import { motion } from 'framer-motion';
import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { usePhotographer } from '../../contexts/PhotographerContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { blurImage } from '../../lib/imageUtils';
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
  const [photoAssignments, setPhotoAssignments] = useState({}); // { photoId: { codeId, isAuto, matchedAt } }
  const [activeId, setActiveId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [samplePhotos, setSamplePhotos] = useState({}); // { photoId: boolean }
  const [autoDismissedPhotos, setAutoDismissedPhotos] = useState({});

  const fileInputRef = useRef(null);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Toggle sample status for a photo
  const toggleSample = useCallback((photoId) => {
    setSamplePhotos(prev => ({
      ...prev,
      [photoId]: !prev[photoId]
    }));
  }, []);

  const assignPhotoToCode = useCallback((photoId, codeId, { isAuto = false } = {}) => {
    setPhotoAssignments(prev => {
      const next = { ...prev };

      if (!codeId) {
        if (next[photoId]) {
          delete next[photoId];
        }
        return next;
      }

      next[photoId] = {
        codeId,
        isAuto,
        matchedAt: new Date().toISOString(),
      };

      return next;
    });

    if (codeId) {
      setAutoDismissedPhotos(prev => {
        if (!prev[photoId]) return prev;
        const next = { ...prev };
        delete next[photoId];
        return next;
      });
    }
  }, []);

  const clearAssignment = useCallback((photoId) => {
    setAutoDismissedPhotos(prev => ({
      ...prev,
      [photoId]: true,
    }));
    assignPhotoToCode(photoId, null);
  }, [assignPhotoToCode]);

  // Auto-match photos to nearest code based on capture time
  useEffect(() => {
    if (!uploads.length || !codes.length) return;

    const revivedPhotos = new Set();

    setPhotoAssignments(prev => {
      const next = { ...prev };
      let updated = false;

      const pendingCodes = [...codes]
        .filter(c => c.status === 'pending_upload')
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

      uploads.forEach(upload => {
        if (!upload.exif?.DateTimeOriginal) return;
        if (autoDismissedPhotos[upload.id]) return;

        const existing = next[upload.id];
        if (existing && !existing.isAuto) {
          return; // respect manual placement
        }

        const photoTime = new Date(upload.exif.DateTimeOriginal);
        let closestCode = null;
        let minDiff = Infinity;

        pendingCodes.forEach(code => {
          const codeTime = new Date(code.createdAt);
          const diff = Math.abs(photoTime - codeTime);

          if (diff < 4 * 60 * 60 * 1000 && diff < minDiff) {
            minDiff = diff;
            closestCode = code;
          }
        });

        if (closestCode) {
          if (!existing || existing.codeId !== closestCode.id || !existing.isAuto) {
            next[upload.id] = {
              codeId: closestCode.id,
              isAuto: true,
              matchedAt: new Date().toISOString(),
            };
            revivedPhotos.add(upload.id);
            updated = true;
          }
        } else if (existing && existing.isAuto) {
          delete next[upload.id];
          updated = true;
        }
      });

      // Clean up assignments for codes that are no longer pending
      Object.entries(next).forEach(([photoId, assignment]) => {
        const exists = pendingCodes.some(code => code.id === assignment.codeId);
        if (!exists) {
          delete next[photoId];
          updated = true;
        }
      });

      return updated ? next : prev;
    });
    if (revivedPhotos.size > 0) {
      setAutoDismissedPhotos(prev => {
        const next = { ...prev };
        let changed = false;
        revivedPhotos.forEach(id => {
          if (next[id]) {
            delete next[id];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [uploads, codes, autoDismissedPhotos]);

  // Group photos by code
  const timelineItems = useMemo(() => {
    const items = [];

    // Add codes with matched photos
    const sortedCodes = [...codes]
      .filter(c => c.status === 'pending_upload')
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    sortedCodes.forEach(code => {
      const matchedPhotos = uploads.filter(u => photoAssignments[u.id]?.codeId === code.id);
      items.push({
        type: 'code',
        code,
        photos: matchedPhotos,
        time: new Date(code.createdAt),
      });
    });

    // Add unmatched photos
    const unmatchedPhotos = uploads.filter(u => !photoAssignments[u.id]);
    if (unmatchedPhotos.length > 0) {
      items.push({
        type: 'unmatched',
        photos: unmatchedPhotos,
        time: null,
      });
    }

    return items;
  }, [codes, uploads, photoAssignments]);

  const matchedCount = useMemo(() => Object.keys(photoAssignments).length, [photoAssignments]);
  const autoMatchedCount = useMemo(
    () => Object.values(photoAssignments).filter((assignment) => assignment.isAuto).length,
    [photoAssignments]
  );

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

      if (newCodeId) {
        assignPhotoToCode(photoId, newCodeId, { isAuto: false });
      } else {
        clearAssignment(photoId);
      }
    }

    setActiveId(null);
  };

  // Upload all matched photos
  const handleUploadAll = async () => {
    if (Object.keys(photoAssignments).length === 0) {
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
      for (const [photoId, assignment] of Object.entries(photoAssignments)) {
        const codeId = assignment.codeId;
        if (!codeId) continue;

        const upload = uploads.find(u => u.id === photoId);
        if (!upload) continue;

        const fileExt = upload.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const filePath = `user-${user.id}/${fileName}`;

        // Upload original to private storage
        const { data: originalData, error: originalError } = await supabase.storage
          .from('photos-original')
          .upload(`${filePath}.${fileExt}`, upload.file);

        if (originalError) throw originalError;

        // Create blurred version
        const blurredBlob = await blurImage(upload.file, 40);

        // Upload blurred version to public storage
        const { data: blurredData, error: blurredError } = await supabase.storage
          .from('photos')
          .upload(`${filePath}-blurred.${fileExt}`, blurredBlob);

        if (blurredError) throw blurredError;

        // Create photo record
        const { data: photoData, error: photoError } = await supabase
          .from('photos')
          .insert([
            {
              photographer_id: profile.id,
              file_url: originalData.path,
              watermarked_url: blurredData.path, // Store path, not full URL
              title: upload.file.name,
              file_size: upload.file.size,
              status: 'approved',
              is_sample: samplePhotos[photoId] || false, // Use sample status from state
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
      setPhotoAssignments({});
      setAutoDismissedPhotos({});
      setSamplePhotos({});

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

  const formatCaptureWindow = (photos) => {
    const captureTimes = photos
      .map(photo => (photo.exif?.DateTimeOriginal ? new Date(photo.exif.DateTimeOriginal) : null))
      .filter(Boolean)
      .sort((a, b) => a - b);

    if (captureTimes.length === 0) return null;

    const formatLabel = (date) =>
      new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);

    const first = captureTimes[0];
    const last = captureTimes[captureTimes.length - 1];

    if (first.toDateString() !== last.toDateString()) {
      return `${formatTime(first)} → ${formatTime(last)}`;
    }

    if (first.getTime() === last.getTime()) {
      return formatLabel(first);
    }

    return `${formatLabel(first)} – ${formatLabel(last)}`;
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
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                Timeline Upload & Match
              </h2>
              <p className="text-gray-600">
                Snappo looks at capture times to suggest the right codes — adjust anything before uploading.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                Matched: {matchedCount}
              </span>
              {autoMatchedCount > 0 && (
                <span className="px-3 py-1 rounded-full bg-teal/10 text-sm font-semibold text-teal">
                  Auto: {autoMatchedCount}
                </span>
              )}
            </div>
          </div>
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
              ref={fileInputRef}
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
                Timeline ({matchedCount} matched)
              </h3>
              {matchedCount > 0 && (
                <motion.button
                  onClick={handleUploadAll}
                  disabled={uploading}
                  whileHover={{ scale: uploading ? 1 : 1.05 }}
                  whileTap={{ scale: uploading ? 1 : 0.95 }}
                  className="px-6 py-2 bg-gradient-to-r from-teal to-cyan-500 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : `Upload All (${matchedCount})`}
                </motion.button>
              )}
            </div>

            {/* Timeline Items - Will be implemented in next step with drag & drop */}
            <div className="space-y-4">
              {timelineItems.map((item) => (
                <TimelineItem
                  key={item.type === 'code' ? item.code.id : 'unmatched'}
                  item={item}
                  formatTime={formatTime}
                  formatCaptureWindow={formatCaptureWindow}
                  samplePhotos={samplePhotos}
                  toggleSample={toggleSample}
                  assignments={photoAssignments}
                  onClearAssignment={clearAssignment}
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
const DraggablePhoto = ({ photo, isSample, onSampleToggle, assignment, onClearAssignment }) => {
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
      className={`relative aspect-square rounded-lg overflow-hidden bg-gray-200 ${
        isDragging ? 'opacity-50' : 'hover:ring-2 hover:ring-teal'
      } transition-all`}
    >
      <div {...listeners} {...attributes} className="w-full h-full">
        <img
          src={photo.url}
          alt="Photo"
          className="w-full h-full object-cover"
        />
      </div>

      {assignment && onClearAssignment && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClearAssignment(photo.id);
          }}
          className="absolute top-2 left-2 bg-white/90 text-gray-700 text-xs font-bold px-2 py-1 rounded-full shadow hover:bg-white"
        >
          ✕
        </button>
      )}

      {/* Sample checkbox overlay */}
      <div
        className="absolute top-2 right-2 z-10"
        onClick={(e) => {
          e.stopPropagation();
          onSampleToggle(photo.id);
        }}
      >
        <label className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-lg cursor-pointer hover:bg-white transition-colors">
          <input
            type="checkbox"
            checked={isSample}
            onChange={() => onSampleToggle(photo.id)}
            className="w-4 h-4 text-teal rounded focus:ring-teal cursor-pointer"
            onClick={(e) => e.stopPropagation()}
          />
          <span className="text-xs font-semibold text-gray-700">Sample</span>
        </label>
      </div>

      {assignment?.isAuto && (
        <div className="absolute bottom-2 left-2 text-[11px] font-semibold text-teal bg-white/90 px-2 py-0.5 rounded-full shadow">
          Auto
        </div>
      )}
    </div>
  );
};

// Timeline Item Component with drag & drop
const TimelineItem = ({
  item,
  formatTime,
  formatCaptureWindow,
  samplePhotos,
  toggleSample,
  assignments,
  onClearAssignment,
}) => {
  const { isOver, setNodeRef } = useDroppable({
    id: item.type === 'code' ? item.code.id : 'unmatched',
  });

  if (item.type === 'code') {
    const captureHint = formatCaptureWindow(item.photos);
    const autoPhotos = item.photos.filter(photo => assignments[photo.id]?.isAuto);
    const tags = Array.isArray(item.code.tags)
      ? item.code.tags
      : typeof item.code.tags === 'string'
        ? item.code.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : [];

    return (
      <div className="relative pl-8 border-l-2 border-gray-200">
        <div className="absolute left-0 top-2 w-4 h-4 -ml-2 bg-teal rounded-full border-2 border-white shadow"></div>

        <div
          ref={setNodeRef}
          className={`bg-gray-50 rounded-xl p-4 transition-all ${
            isOver ? 'ring-2 ring-teal bg-teal/5' : ''
          }`}
        >
          <div className="flex flex-col gap-3 mb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                  <span>{formatTime(item.time)}</span>
                  {captureHint && (
                    <span className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                      ⏱ {captureHint}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-mono text-lg font-bold text-gray-800">
                    {item.code.code}
                  </h4>
                  {item.code.note && (
                    <span className="text-sm text-gray-600">{item.code.note}</span>
                  )}
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-500 block">
                  {item.photos.length} photo{item.photos.length !== 1 ? 's' : ''}
                </span>
                {autoPhotos.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal bg-teal/10 px-2 py-0.5 rounded-full mt-1">
                    🤖 Auto matched {autoPhotos.length}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Draggable Photos */}
          {item.photos.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {item.photos.map(photo => (
                <DraggablePhoto
                  key={photo.id}
                  photo={photo}
                  isSample={samplePhotos[photo.id] || false}
                  onSampleToggle={toggleSample}
                  assignment={assignments[photo.id]}
                  onClearAssignment={onClearAssignment}
                />
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
        <p className="text-sm text-gray-600 mb-3">
          These files had no capture time or outside the window. Drag them onto the right timeline card or remove matches using the ✕ icon.
        </p>

        {item.photos.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
            {item.photos.map(photo => (
              <DraggablePhoto
                key={photo.id}
                photo={photo}
                isSample={samplePhotos[photo.id] || false}
                onSampleToggle={toggleSample}
                assignment={assignments[photo.id]}
                onClearAssignment={onClearAssignment}
              />
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
