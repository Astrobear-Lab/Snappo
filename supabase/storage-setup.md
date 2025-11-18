# Supabase Storage Setup

## Create Storage Buckets

Run these steps in your Supabase Dashboard:

### 1. Go to Storage
Navigate to: **Storage** → **Create a new bucket**

### 2. Create `photos` bucket
- **Name**: `photos`
- **Public**: ✅ Yes (for watermarked images)
- **File size limit**: 10 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp`

### 3. Create `photos-original` bucket
- **Name**: `photos-original`
- **Public**: ❌ No (private, only accessible after purchase)
- **File size limit**: 20 MB
- **Allowed MIME types**: `image/jpeg, image/png, image/webp, image/heic`

### 4. Set up Storage Policies

#### For `photos` bucket (public watermarked):

**Select Policy:**
```sql
CREATE POLICY "Public can view photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'photos');
```

**Insert Policy:**
```sql
CREATE POLICY "Photographers can upload photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.photographer_profiles
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'active')
  )
);
```

**Update Policy:**
```sql
CREATE POLICY "Photographers can update own photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'photos' AND
  auth.uid() = owner
);
```

**Delete Policy:**
```sql
CREATE POLICY "Photographers can delete own photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'photos' AND
  auth.uid() = owner
);
```

#### For `photos-original` bucket (private):

**Select Policy:**
```sql
CREATE POLICY "Photographers and buyers can view original photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'photos-original' AND
  (
    -- Photo owner (photographer)
    auth.uid() = owner OR
    -- Photo buyer
    EXISTS (
      SELECT 1 FROM public.photo_codes pc
      JOIN public.photos p ON pc.photo_id = p.id
      WHERE pc.is_purchased = true
      AND pc.purchased_by = auth.uid()
      AND storage.filename(name) LIKE '%' || p.id::text || '%'
    )
  )
);
```

**Insert Policy:**
```sql
CREATE POLICY "Photographers can upload original photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'photos-original' AND
  auth.role() = 'authenticated' AND
  EXISTS (
    SELECT 1 FROM public.photographer_profiles
    WHERE user_id = auth.uid()
    AND status IN ('pending', 'active')
  )
);
```

---

## Testing

After setup, test with:

```javascript
// Upload test
const { data, error } = await supabase.storage
  .from('photos')
  .upload('test/image.jpg', file);

// Get public URL
const { data: publicURL } = supabase.storage
  .from('photos')
  .getPublicUrl('test/image.jpg');
```

---

## Optional: CDN Configuration

For better performance, consider:
1. Enable **Supabase CDN** (automatic)
2. Configure custom domain
3. Set up CloudFlare in front

---

## Folder Structure

```
photos/
├── user-{uuid}/
│   ├── watermarked/
│   │   ├── {photo-id}-watermarked.jpg
│   │   └── {photo-id}-thumb.jpg
│   └── ...

photos-original/
├── user-{uuid}/
│   ├── {photo-id}-original.jpg
│   └── ...
```
