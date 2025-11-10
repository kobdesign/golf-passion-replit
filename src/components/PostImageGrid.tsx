import { Maximize2 } from "lucide-react";

interface PostImageGridProps {
  images: Array<{ url: string }>;
  onImageClick: (index: number) => void;
}

const PostImageGrid = ({ images, onImageClick }: PostImageGridProps) => {
  const count = images.length;

  if (count === 0) return null;

  return (
    <>
      {/* Single Image */}
      {count === 1 && (
        <div 
          className="relative cursor-pointer group"
          onClick={() => onImageClick(0)}
        >
          <img
            src={images[0].url}
            alt="Post content"
            className="w-full rounded-lg object-contain max-h-[500px] bg-muted"
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
              e.currentTarget.classList.add('opacity-50');
            }}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
            <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
        </div>
      )}

      {/* Two Images */}
      {count === 2 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {images.map((img, idx) => (
            <div 
              key={idx}
              className="relative cursor-pointer group aspect-square"
              onClick={() => onImageClick(idx)}
            >
              <img
                src={img.url}
                alt={`Post content ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  e.currentTarget.classList.add('opacity-50');
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Three Images */}
      {count === 3 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          <div 
            className="relative cursor-pointer group row-span-2 aspect-square"
            onClick={() => onImageClick(0)}
          >
            <img
              src={images[0].url}
              alt="Post content 1"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
                e.currentTarget.classList.add('opacity-50');
              }}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
            </div>
          </div>
          {images.slice(1).map((img, idx) => (
            <div 
              key={idx + 1}
              className="relative cursor-pointer group aspect-square"
              onClick={() => onImageClick(idx + 1)}
            >
              <img
                src={img.url}
                alt={`Post content ${idx + 2}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  e.currentTarget.classList.add('opacity-50');
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Four or More Images */}
      {count >= 4 && (
        <div className="grid grid-cols-2 gap-1 rounded-lg overflow-hidden">
          {images.slice(0, 4).map((img, idx) => (
            <div 
              key={idx}
              className="relative cursor-pointer group aspect-square"
              onClick={() => onImageClick(idx)}
            >
              <img
                src={img.url}
                alt={`Post content ${idx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.src = '/placeholder.svg';
                  e.currentTarget.classList.add('opacity-50');
                }}
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                <Maximize2 className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
              </div>
              {idx === 3 && count > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-3xl font-bold">+{count - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default PostImageGrid;
