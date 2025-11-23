import React, { useCallback, useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { left, top, width, height } = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - left - width / 2) / 20; // Sensitivity
    const y = -(e.clientY - top - height / 2) / 20;
    setRotate({ x: y, y: x });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onFileSelect(e.dataTransfer.files[0]);
      }
    },
    [onFileSelect]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="preserve-3d h-full w-full">
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
                transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
                transition: 'transform 0.1s ease-out'
            }}
            className="group relative h-full min-h-[300px] overflow-hidden border border-slate-700 hover:border-cyber-primary rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:shadow-neon-hover transition-all duration-300 cursor-pointer bg-black/50 backdrop-blur-md"
        >
        <div className="absolute inset-0 bg-cyber-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyber-primary to-transparent translate-x-[-100%] group-hover:animate-shimmer" />
        
        <input
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
            id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full h-full relative z-10 preserve-3d">
            <div className="bg-cyber-primary/10 p-6 rounded-full mb-6 group-hover:scale-110 transition-transform duration-300 border border-cyber-primary shadow-[0_0_30px_rgba(var(--color-primary),0.3)]" style={{ transform: 'translateZ(20px)' }}>
            <Upload className="w-10 h-10 text-cyber-primary drop-shadow-[0_0_10px_rgba(var(--color-primary),0.8)]" />
            </div>
            <h3 className="text-3xl font-bold text-white mb-3 font-brand tracking-widest drop-shadow-md" style={{ transform: 'translateZ(30px)' }}>UPLOAD SOURCE</h3>
            <p className="text-slate-300 text-sm max-w-xs font-mono" style={{ transform: 'translateZ(10px)' }}>
            Initialize Neural Uplink<br/>Drag & Drop Diagram File
            </p>
        </label>
        </div>
    </div>
  );
};