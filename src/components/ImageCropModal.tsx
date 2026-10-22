import { useState, useRef, useCallback, useEffect } from 'react';
import { Modal, Button, Slider, Result } from 'antd';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Props {
  open: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, filename: string) => void;
  aspectRatio?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

export default function ImageCropModal({
  open,
  imageFile,
  onClose,
  onCropComplete,
  aspectRatio = 1,
}: Props) {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [imgSrc, setImgSrc] = useState('');
  // file che il browser non riesce a leggere come immagine (es. un .txt rinominato .jpg)
  const [imgError, setImgError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Load image when file changes
  useEffect(() => {
    setImgError(false);
    if (imageFile) {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImgSrc(reader.result?.toString() || '');
      });
      reader.readAsDataURL(imageFile);
    } else {
      setImgSrc('');
    }
  }, [imageFile]);

  const onImageLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const { width, height } = e.currentTarget;
      const initial = centerAspectCrop(width, height, aspectRatio);
      setCrop(initial);
      // senza toccare il riquadro onComplete non scatta: "Conferma" chiudeva senza caricare nulla
      setCompletedCrop({
        unit: 'px',
        x: (initial.x / 100) * width,
        y: (initial.y / 100) * height,
        width: (initial.width / 100) * width,
        height: (initial.height / 100) * height,
      });
    },
    [aspectRatio],
  );

  const getCroppedImg = useCallback(async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    const pixelRatio = window.devicePixelRatio || 1;

    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight,
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.9,
      );
    });
  }, [completedCrop]);

  const handleConfirm = async () => {
    const croppedBlob = await getCroppedImg();
    if (croppedBlob && imageFile) {
      onCropComplete(croppedBlob, imageFile.name);
    }
    handleClose();
  };

  const handleClose = () => {
    setCrop(undefined);
    setCompletedCrop(undefined);
    setScale(1);
    setImgSrc('');
    setImgError(false);
    onClose();
  };

  return (
    <Modal
      title="Ritaglia immagine profilo"
      open={open}
      onCancel={handleClose}
      width={600}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Annulla
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} disabled={imgError || !completedCrop}>
          Conferma
        </Button>,
      ]}
      destroyOnHidden
    >
      <div className="flex flex-col items-center">
        {imgError && (
          <Result
            status="warning"
            title="Il file non è un'immagine leggibile"
            subTitle="Scegli una foto JPG, PNG, WEBP o GIF."
          />
        )}
        {imgSrc && !imgError && (
          <>
            <div className="mb-4 w-full">
              <label className="block text-sm mb-1">Zoom</label>
              <Slider
                min={0.5}
                max={3}
                step={0.1}
                value={scale}
                onChange={setScale}
              />
            </div>
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={aspectRatio}
                circularCrop
              >
                <img
                  ref={imgRef}
                  src={imgSrc}
                  alt="Anteprima della foto da ritagliare"
                  style={{ transform: `scale(${scale})`, maxWidth: '100%' }}
                  onLoad={onImageLoad}
                  onError={() => setImgError(true)}
                />
              </ReactCrop>
            </div>
            <p className="text-gray-500 text-sm mt-4">
              Trascina per posizionare l'area di ritaglio
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
