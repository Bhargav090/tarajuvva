/** Admin hero image UI disabled — heroes use static frontend assets. */
export default function HeroImagesTab() {
  return null;
}

/*
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { ImagePlus, Check, Upload } from 'lucide-react';
import { useAdminHeroImages } from '../../hooks/useHeroImage';
import { getHeroImageRequirements, validateHeroImageDimensions } from '../../utils/heroImage';
import { uploadUrl } from '../../utils/uploadUrl';
import Button from '../../components/ui/Button';
import { Spinner } from '../../components/ui/Skeleton';

const COPY = {
  home: {
    title: 'Homepage hero image',
    description: 'Upload for the homepage hero beside the headline.',
    activateSuccess: 'Now showing on homepage',
    activateLabel: 'Show on homepage',
    empty: 'No hero images yet. Upload one above.',
  },
  reimagine: {
    title: 'Reimagine hero image',
    description: 'Upload an image or GIF for the Reimagine page hero beside “Send the old. Get the new.”',
    activateSuccess: 'Now showing on Reimagine page',
    activateLabel: 'Show on Reimagine page',
    empty: 'No Reimagine hero images yet. Upload one above.',
  },
};

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function HeroImagesTab({ context = 'home' }) {
  const fileRef = useRef(null);
  const { images, loading, uploading, upload, activate } = useAdminHeroImages(context);
  const [preview, setPreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [validating, setValidating] = useState(false);

  const requirements = getHeroImageRequirements(context);
  const copy = COPY[context] || COPY.home;
  const { aspectRatios, minWidth, minHeight, displayWidth, displayHeight, maxFileSizeMb, formatLabels } =
    requirements;
  const active = images.find((img) => img.is_active);

  const clearPending = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setPendingFile(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const onFilePick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidating(true);
    const err = await validateHeroImageDimensions(file, context);
    setValidating(false);

    if (err) {
      toast.error(err);
      clearPending();
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const onUpload = async () => {
    if (!pendingFile) return;
    const result = await upload(pendingFile);
    if (result.ok) {
      toast.success('Hero image uploaded');
      clearPending();
    } else {
      toast.error(result.message);
    }
  };

  const onActivate = async (id) => {
    const result = await activate(id);
    if (result.ok) toast.success(copy.activateSuccess);
    else toast.error(result.message);
  };

  return (
    <div className="max-w-4xl">
      ...
    </div>
  );
}
*/
