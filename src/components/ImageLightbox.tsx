import { useState, useEffect } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize, Loader2 } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ImageLightbox = ({ images, initialIndex = 0, open, onOpenChange }: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setCurrentIndex(initialIndex);
    setIsImageLoading(true);
    setImageError(false);
  }, [initialIndex, open]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    setIsImageLoading(true);
    setImageError(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    setIsImageLoading(true);
    setImageError(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowLeft") {
        handlePrevious();
      }
      if (e.key === "ArrowRight") {
        handleNext();
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, images.length]);

  if (images.length === 0) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange} shouldScaleBackground={false} dismissible={true}>
      <DrawerContent className="h-[100vh] w-full p-0 bg-black border-0 outline-none">
        <div className="relative w-full h-full">
          <TransformWrapper
            key={images[currentIndex]}
            initialScale={1}
            minScale={0.5}
            maxScale={4}
            wheel={{ step: 0.2 }}
            doubleClick={{ mode: "toggle", step: 0.7 }}
            pinch={{ step: 5 }}
            panning={{ velocityDisabled: false }}
          >
            {({ zoomIn, zoomOut, resetTransform, centerView }) => (
              <>
                {/* Zoomable Image Container */}
                <TransformComponent
                  wrapperClass="w-full h-screen !cursor-grab active:!cursor-grabbing"
                  contentClass="w-full h-full flex items-center justify-center"
                  wrapperStyle={{ width: '100%', height: '100vh' }}
                >
                  <div className="relative w-screen h-screen flex items-center justify-center bg-black">
                    {isImageLoading && !imageError && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Loader2 className="h-12 w-12 text-white animate-spin" />
                      </div>
                    )}
                    {imageError ? (
                      <div className="text-white text-center p-8">
                        <p className="text-lg mb-2">ไม่สามารถโหลดรูปภาพได้</p>
                        <p className="text-sm text-white/60">กรุณาลองอีกครั้ง</p>
                      </div>
                    ) : (
                      <img
                        src={images[currentIndex]}
                        alt={`Full size ${currentIndex + 1}`}
                        className="w-screen h-screen object-contain select-none"
                        style={{ willChange: 'transform' }}
                        loading="eager"
                        decoding="async"
                        draggable={false}
                        onLoad={() => setIsImageLoading(false)}
                        onError={() => {
                          setIsImageLoading(false);
                          setImageError(true);
                        }}
                      />
                    )}
                  </div>
                </TransformComponent>

                {/* Controls Overlay - Outside Transform */}
                <div className="pointer-events-none absolute inset-0 z-50">
                  {/* Close Button - Top Left */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="pointer-events-auto absolute top-4 left-4 text-white hover:bg-white/20 rounded-full bg-black/60 backdrop-blur-sm"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-6 w-6" />
                  </Button>

                  {/* Zoom Controls - Top Right */}
                  <div className="pointer-events-auto absolute top-4 right-4 flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full bg-black/60 backdrop-blur-sm"
                      onClick={() => zoomIn()}
                      title="ซูมเข้า"
                    >
                      <ZoomIn className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full bg-black/60 backdrop-blur-sm"
                      onClick={() => zoomOut()}
                      title="ซูมออก"
                    >
                      <ZoomOut className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full bg-black/60 backdrop-blur-sm"
                      onClick={() => {
                        resetTransform();
                        setTimeout(() => centerView(1), 0);
                      }}
                      title="รีเซ็ต"
                    >
                      <Maximize className="h-5 w-5" />
                    </Button>
                  </div>

                  {/* Navigation Buttons (only show if multiple images) */}
                  {images.length > 1 && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="pointer-events-auto absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full bg-black/60 backdrop-blur-sm h-12 w-12"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePrevious();
                        }}
                      >
                        <ChevronLeft className="h-8 w-8" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="pointer-events-auto absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 rounded-full bg-black/60 backdrop-blur-sm h-12 w-12"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNext();
                        }}
                      >
                        <ChevronRight className="h-8 w-8" />
                      </Button>

                      {/* Counter */}
                      <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm backdrop-blur-sm">
                        {currentIndex + 1} / {images.length}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </TransformWrapper>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ImageLightbox;
