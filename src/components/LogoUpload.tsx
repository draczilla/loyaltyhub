import { useState } from 'react';
import { Upload, X, Loader, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LogoUploadProps {
  currentLogoUrl: string | null;
  onLogoUpdate: (url: string | null) => void;
  businessId: string;
}

export default function LogoUpload({ currentLogoUrl, onLogoUpdate, businessId }: LogoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<string | null>(currentLogoUrl);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a PNG, JPG, or SVG file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      return;
    }

    setUploading(true);

    try {
      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId}-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onLogoUpdate(publicUrl);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = () => {
    setPreview(null);
    onLogoUpdate(null);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-400">Company Logo</label>

      {preview ? (
        <div className="relative w-32 h-32 rounded-lg border-2 border-zinc-700 overflow-hidden group">
          <img
            src={preview}
            alt="Company logo"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <label className="p-2 bg-blue-500 hover:bg-blue-600 rounded-lg cursor-pointer transition">
              <Upload className="w-4 h-4 text-white" />
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                onChange={handleFileSelect}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <button
              onClick={handleRemoveLogo}
              className="p-2 bg-red-500 hover:bg-red-600 rounded-lg transition"
              title="Remove logo"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <label className="w-32 h-32 border-2 border-dashed border-zinc-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition group">
          {uploading ? (
            <>
              <Loader className="w-8 h-8 text-orange-400 animate-spin mb-2" />
              <span className="text-sm text-gray-400">Uploading...</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-8 h-8 text-gray-500 group-hover:text-orange-400 mb-2 transition" />
              <span className="text-sm text-gray-400 group-hover:text-orange-400 transition">Upload Logo</span>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
        </label>
      )}

      <p className="text-xs text-gray-500">PNG, JPG, or SVG. Max 2MB.</p>

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
