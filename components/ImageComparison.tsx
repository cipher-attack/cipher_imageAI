import React, { useState, useRef, useEffect } from 'react';

interface ImageComparisonProps {
  beforeImage: string;
  afterImage: string;
}

export const ImageComparison: React.FC<ImageComparisonProps> = ({ beforeImage, afterImage }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
        
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });
        
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const { left, width } = containerRef.current.getBoundingClientRect();
    let clientX;
    if ('touches' in e) {
       clientX = e.touches[0].clientX;
    } else {
       clientX = (e as React.MouseEvent).clientX;
    }
    
    const position = ((clientX - left) / width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, position)));
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[400px] rounded-xl overflow-hidden cursor-ew-resize select-none border border-slate-700 shadow-2xl bg-black"
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      {/* After Image (Background) */}
      <img src={afterImage} alt="After" className="absolute top-0 left-0 w-full h-full object-contain select-none pointer-events-none" />
      
      {/* Before Image (Foreground - Clipped) */}
      <div 
        className="absolute top-0 left-0 h-full overflow-hidden border-r-2 border-white/50 select-none pointer-events-none"
        style={{ width: `${sliderPosition}%` }}
      >
        <div style={{ width: width || '100%', height: '100%' }}>
            <img 
                src={beforeImage} 
                alt="Before" 
                className="w-full h-full object-contain bg-white" 
                style={{ width: width ? `${width}px` : '100%' }}
            />
        </div>
      </div>
      
      {/* Slider Handle */}
      <div 
        className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,255,255,0.5)] z-10 pointer-events-none"
        style={{ left: `calc(${sliderPosition}% - 16px)` }}
      >
        <div className="w-6 h-6 rounded-full bg-black/80 flex items-center justify-center">
            <div className="w-1 h-3 bg-white mx-0.5"></div>
            <div className="w-1 h-3 bg-white mx-0.5"></div>
        </div>
      </div>
      
      <div className="absolute top-4 left-4 bg-black/80 border border-white/20 backdrop-blur text-white text-xs px-2 py-1 rounded select-none font-mono">ORIGINAL</div>
      <div className="absolute top-4 right-4 bg-cyber-primary/90 text-black font-bold text-xs px-2 py-1 rounded select-none font-mono shadow-[0_0_10px_rgb(var(--color-primary))]">CIPHER ENHANCED</div>
    </div>
  );
};