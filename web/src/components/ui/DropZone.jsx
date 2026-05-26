import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

export default function DropZone({ files, onAdd, onRemove, maxFiles = 5 }) {
  const onDrop = useCallback(accepted => {
    const remaining = maxFiles - files.length;
    onAdd(accepted.slice(0, remaining).map(f => Object.assign(f, { preview: URL.createObjectURL(f) })));
  }, [files, maxFiles, onAdd]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': [] }, maxFiles,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-[#a8c74a] bg-[#a8c74a]/5'
            : 'border-[#241621]/20 hover:border-[#a8c74a]/50 hover:bg-[#a8c74a]/3'
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#a8c74a]/10 flex items-center justify-center">
            <Upload size={22} className="text-[#a8c74a]" />
          </div>
          <div>
            <p className="font-semibold text-[#241621] font-display text-sm">
              {isDragActive ? 'Drop your images here' : 'Upload garment photos'}
            </p>
            <p className="text-[#241621]/45 text-xs mt-1 font-body">
              Drag & drop or click — up to {maxFiles} images
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative group rounded-xl overflow-hidden aspect-square bg-white">
              <img src={f.preview} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-[#e34334] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
