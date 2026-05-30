import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';

const MAX_BYTES = 4 * 1024 * 1024;

export default function DropZone({ files, onAdd, onRemove, maxFiles = 5, variant = 'default' }) {
  const onDrop = useCallback(accepted => {
    const remaining = maxFiles - files.length;
    onAdd(accepted.slice(0, remaining).map(f => Object.assign(f, { preview: URL.createObjectURL(f) })));
  }, [files, maxFiles, onAdd]);

  const onDropRejected = useCallback(rejections => {
    const tooLarge = rejections.some(r => r.errors.some(e => e.code === 'file-too-large'));
    if (tooLarge) toast.error('Each file must be 4MB or less.');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    accept: { 'image/*': [] },
    maxFiles,
    maxSize: MAX_BYTES,
  });

  if (variant === 'compact') {
    return (
      <div className="space-y-3">
        <div
          {...getRootProps()}
          className={`border border-dashed px-4 py-5 cursor-pointer transition-all duration-200 ${
            isDragActive
              ? 'border-black bg-[var(--tj-bg-soft)]'
              : 'border-black/40 hover:border-black hover:bg-[var(--tj-bg-soft)]'
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex items-center gap-3">
            <Upload size={18} className="text-black/50 shrink-0" />
            <p className="text-sm text-black/55">
              {isDragActive ? 'Drop your file here' : 'Drop / pick a file (max 4MB)'}
            </p>
          </div>
        </div>
        {files.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative group overflow-hidden aspect-square bg-[var(--tj-bg-soft)] border border-black">
                <img src={f.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={11} className="text-white" strokeWidth={3} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-black bg-[var(--tj-bg-soft)]'
            : 'border-black/30 hover:border-black hover:bg-[var(--tj-bg-soft)]'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border border-black flex items-center justify-center">
            <Upload size={22} className="text-black" />
          </div>
          <div>
            <p className="font-display font-bold text-sm text-[#0a0a0a]">
              {isDragActive ? 'Drop your images here' : 'Upload garment photos'}
            </p>
            <p className="text-black/45 text-xs mt-1 font-mono-tj uppercase tracking-wider">
              Drag & drop or click — up to {maxFiles} images (max 4MB each)
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative group overflow-hidden aspect-square bg-[var(--tj-bg-soft)] border border-black">
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={11} className="text-white" strokeWidth={3} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
