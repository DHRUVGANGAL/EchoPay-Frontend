import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  audioData: number[];
  isListening: boolean;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ audioData, isListening }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!canvasRef.current || !isListening) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
   
    ctx.clearRect(0, 0, width, height);
    
  
    const barWidth = width / audioData.length;
    
    ctx.fillStyle = '#E5E5E5'; 
    
    audioData.forEach((value, index) => {
      
      const normalizedValue = value / 255;
      const barHeight = normalizedValue * height * 0.8;
      
      ctx.fillRect(
        index * barWidth, 
        height - barHeight, 
        barWidth - 1, 
        barHeight
      );
    });
    
  
    if (audioData.length === 0 && isListening) {
      for (let i = 0; i < 40; i++) {
        const barHeight = Math.random() * height * 0.5;
        ctx.fillRect(
          i * (width / 40), 
          height - barHeight, 
          (width / 40) - 1, 
          barHeight
        );
      }
    }
    
  }, [audioData, isListening]);
  
  if (!isListening) return null;
  
  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={50} 
      className="rounded-md mt-4"
    />
  );
};

export default AudioVisualizer;