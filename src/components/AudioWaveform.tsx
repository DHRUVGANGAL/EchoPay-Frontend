import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  isListening: boolean;
  isDarkMode?: boolean;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({
  isListening,
  isDarkMode = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isListening) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 40;
    const bars = 20;
    const barWidth = canvas.width / bars - 2;
    let animationFrameId: number;
    let frameCount = 0;
    const frameDelay = 1; 

    
    const barHeights = Array(bars).fill(0).map(() => Math.random() * 60 + 5);
    
    
    const targetHeights = Array(bars).fill(0).map(() => Math.random() * 30 + 5);

    const renderFrame = () => {
      frameCount++;
      
      
      if (frameCount % (frameDelay * 5) === 0) {
        for (let i = 0; i < bars; i++) {
          targetHeights[i] = Math.random() * 30 + 5;
        }
      }
      
    
      if (frameCount % frameDelay === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < bars; i++) {
          
          barHeights[i] += (targetHeights[i] - barHeights[i]) * 0.05;
          
          
          ctx.fillStyle = isDarkMode ? '#555555' : '#FFFFFF';
          
          ctx.fillRect(
            i * (barWidth + 2),
            (canvas.height - barHeights[i]) / 2,
            barWidth,
            barHeights[i]
          );
        }
      }
      
      animationFrameId = requestAnimationFrame(renderFrame);
    };
    
    renderFrame();
    
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isListening, isDarkMode]);

  if (!isListening) return null;

  return (
    <div className="flex justify-center">
      <canvas 
        ref={canvasRef} 
        height={40} 
        className="rounded" 
      />
    </div>
  );
};

export default AudioWaveform;