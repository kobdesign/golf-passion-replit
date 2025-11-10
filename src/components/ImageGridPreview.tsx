import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface ImageGridPreviewProps {
  images: string[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

const ImageGridPreview = ({ images, onRemove, disabled }: ImageGridPreviewProps) => {
  const count = images.length;

  if (count === 0) return null;

  return (
    <div className="relative border rounded-lg overflow-hidden bg-muted">
      {/* Single Image */}
      {count === 1 && (
        <div className="relative">
          <img
            src={images[0]}
            alt="Preview 1"
            className="w-full max-h-[400px] object-contain"
          />
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 rounded-full shadow-lg h-8 w-8"
            onClick={() => onRemove(0)}
            disabled={disabled}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Two Images */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-1">
          {images.map((img, idx) => (
            <div key={idx} className="relative aspect-square">
              <img
                src={img}
                alt={`Preview ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 rounded-full shadow-lg h-7 w-7"
                onClick={() => onRemove(idx)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Three Images */}
      {count === 3 && (
        <div className="grid grid-cols-2 gap-1">
          <div className="relative row-span-2 aspect-square">
            <img
              src={images[0]}
              alt="Preview 1"
              className="w-full h-full object-cover"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 rounded-full shadow-lg h-7 w-7"
              onClick={() => onRemove(0)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          {images.slice(1).map((img, idx) => (
            <div key={idx + 1} className="relative aspect-square">
              <img
                src={img}
                alt={`Preview ${idx + 2}`}
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 rounded-full shadow-lg h-7 w-7"
                onClick={() => onRemove(idx + 1)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Four or More Images */}
      {count >= 4 && (
        <div className="grid grid-cols-2 gap-1">
          {images.slice(0, 4).map((img, idx) => (
            <div key={idx} className="relative aspect-square">
              <img
                src={img}
                alt={`Preview ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 rounded-full shadow-lg h-7 w-7"
                onClick={() => onRemove(idx)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
              {idx === 3 && count > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">+{count - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGridPreview;
