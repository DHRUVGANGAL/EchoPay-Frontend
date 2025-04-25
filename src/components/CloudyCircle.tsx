import { motion } from "framer-motion";
import React, { useMemo } from "react";

interface CloudyCircleProps {
  isActive?: boolean; 
  isDarkMode?: boolean; 
}

const CloudyCircle: React.FC<CloudyCircleProps> = ({ 
  isActive = false,
  isDarkMode = false
}) => {
 
  const particleCount = 40;
  

  const speedFactor = isActive ? 0.5 : 1.2; 
  
  
  const generateRandomSmokePath = () => {
   
    const centerX = 50 + (Math.random() * 30 - 15);
    const centerY = 50 + (Math.random() * 30 - 15);
    const size = 15 + Math.random() * 20;
    
   
    const points = [];
    const numPoints = 5 + Math.floor(Math.random() * 4);
    
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2;
      const radius = size * (0.7 + Math.random() * 0.6);
      
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
  
      const cpRadius = radius * (0.8 + Math.random() * 0.4);
      const cpAngle1 = angle - 0.3 + Math.random() * 0.2;
      const cpAngle2 = angle + 0.3 + Math.random() * 0.2;
      
      const cp1x = centerX + cpRadius * Math.cos(cpAngle1);
      const cp1y = centerY + cpRadius * Math.sin(cpAngle1);
      const cp2x = centerX + cpRadius * Math.cos(cpAngle2);
      const cp2y = centerY + cpRadius * Math.sin(cpAngle2);
      
      points.push({ x, y, cp1x, cp1y, cp2x, cp2y });
    }
    
 
    let path = `M${points[0].x},${points[0].y}`;
    
    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      path += ` C${current.cp2x},${current.cp2y} ${next.cp1x},${next.cp1y} ${next.x},${next.y}`;
    }
    
    return path;
  };
  
 
  const smokePaths = useMemo(() => {
    return Array.from({ length: particleCount }).map(() => generateRandomSmokePath());
  }, [particleCount]);
  
  interface AnimationVariant {
    x: number[];
    y: number[];
    opacity: number[];
    scale: number[];
    rotate: number[];
  }

  const getRandomAnimationVariant = (): AnimationVariant => {
   
    const xMovement: number[] = [];
    const yMovement: number[] = [];
    const opacityFlow: number[] = [];
    const scaleChanges: number[] = [];
    const rotateValues: number[] = [];
    
   
    const keyframes: number = 5 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < keyframes; i++) {
      xMovement.push(Math.random() * 30 - 15);  
      yMovement.push(Math.random() * 30 - 15);  
      
      
      const framePosition: number = i / (keyframes - 1);
      const intensityFactor: number = Math.sin(framePosition * Math.PI);  
      
      opacityFlow.push(0.2 + intensityFactor * 0.4);  
      
    
      scaleChanges.push(0.9 + intensityFactor * 0.3);  
      
      // Rotation
      rotateValues.push(Math.random() * 30 - 15); 
    }
    
    return {
      x: xMovement,
      y: yMovement,
      opacity: opacityFlow,
      scale: scaleChanges,
      rotate: rotateValues
    };
  };

  // Background color based on theme
  const bgColor = isDarkMode ? "#0a0a0a" : "#CDC1FF";
  
  // Base circle color
  const baseCircleColor = isDarkMode ? "#121212" : "#d4ebff";
  
  // Edge color
  const edgeColor = isDarkMode ? "#0a0a0a" : "#c0e0ff";

  // Pulsing animation for when isActive is true
  const containerVariants = {
    idle: {
      scale: 1,
    },
    active: {
      scale: [1, 1.05, 1, 0.97, 1],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        repeatType: "loop" as "loop",
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div
      style={{
        width: "150px",  // Smaller size for integration
        height: "150px", 
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
        background: bgColor,
      }}
      variants={containerVariants}
      animate={isActive ? "active" : "idle"}
    >
      {/* Base gradient */}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          background: isDarkMode 
            ? "radial-gradient(circle, rgba(25,25,25,0.8) 10%, rgba(15,15,15,0.6) 30%, rgba(5,5,5,0.3) 70%)"
            : "radial-gradient(circle, rgba(220,240,255,0.8) 10%, rgba(200,230,255,0.6) 30%, rgba(180,220,255,0.3) 70%)",
          mixBlendMode: "multiply"
        }}
      />
      
      <motion.svg
        width="150"
        height="150"
        viewBox="0 0 100 100"
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        <defs>
          {/* Multiple gradients for smoke variation */}
          <radialGradient id="smokeGrad1" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: isDarkMode ? "#999" : "#4287f5", stopOpacity: 0.6 }} />
            <stop offset="40%" style={{ stopColor: isDarkMode ? "#777" : "#2970e3", stopOpacity: 0.4 }} />
            <stop offset="70%" style={{ stopColor: isDarkMode ? "#444" : "#1a5dc7", stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: isDarkMode ? "#222" : "#0d4bb3", stopOpacity: 0 }} />
          </radialGradient>
          
          <radialGradient id="smokeGrad2" cx="50%" cy="50%" r="60%">
            <stop offset="0%" style={{ stopColor: isDarkMode ? "#888" : "#5a9af5", stopOpacity: 0.5 }} />
            <stop offset="50%" style={{ stopColor: isDarkMode ? "#666" : "#3a85f0", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: isDarkMode ? "#333" : "#1e6de0", stopOpacity: 0 }} />
          </radialGradient>
          
          <radialGradient id="smokeGrad3" cx="50%" cy="50%" r="70%">
            <stop offset="0%" style={{ stopColor: isDarkMode ? "#777" : "#6babf7", stopOpacity: 0.4 }} />
            <stop offset="40%" style={{ stopColor: isDarkMode ? "#555" : "#4a96f2", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: isDarkMode ? "#222" : "#2980ea", stopOpacity: 0 }} />
          </radialGradient>
          
          <radialGradient id="lightSmoke" cx="50%" cy="50%" r="50%">
            <stop offset="0%" style={{ stopColor: isDarkMode ? "#bbb" : "#8fc1ff", stopOpacity: 0.5 }} />
            <stop offset="60%" style={{ stopColor: isDarkMode ? "#999" : "#70b0ff", stopOpacity: 0.2 }} />
            <stop offset="100%" style={{ stopColor: isDarkMode ? "#777" : "#4c99fc", stopOpacity: 0 }} />
          </radialGradient>
          
          <radialGradient id="darkSmoke" cx="50%" cy="50%" r="60%">
            <stop offset="0%" style={{ stopColor: isDarkMode ? "#555" : "#3d7ddb", stopOpacity: 0.6 }} />
            <stop offset="50%" style={{ stopColor: isDarkMode ? "#333" : "#2b6bc8", stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: isDarkMode ? "#111" : "#1959b3", stopOpacity: 0 }} />
          </radialGradient>
          
          {/* Blur filters */}
          <filter id="blurBig" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
          
          <filter id="blurMedium" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2" />
          </filter>
          
          <filter id="blurSmall" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1" />
          </filter>
          
          {/* Displacement map for more organic movement */}
          <filter id="displace">
            <feTurbulence type="turbulence" baseFrequency="0.01" numOctaves="3" result="turbulence" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="5" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Base mask circle */}
        <circle cx="50" cy="50" r="43" fill={baseCircleColor} />
        
        {/* Deep background smoke (large, slow) */}
        {smokePaths.slice(0, 10).map((path, i) => {
          const animation = getRandomAnimationVariant();
          const duration = (7 + i % 5) * speedFactor;
          const delay = i * 0.1;
          const fill = i % 3 === 0 ? "url(#smokeGrad1)" : i % 3 === 1 ? "url(#smokeGrad2)" : "url(#smokeGrad3)";
          
          return (
            <motion.path
              key={`deep-${i}`}
              d={path}
              fill={fill}
              filter="url(#blurBig)"
              initial={{ opacity: 0 }}
              animate={{
                x: animation.x,
                y: animation.y,
                opacity: animation.opacity,
                scale: animation.scale,
                rotate: animation.rotate
              }}
              transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "easeInOut"
              }}
              style={{ 
                transformOrigin: "center",
                mixBlendMode: isDarkMode ? "multiply" : "screen"
              }}
            />
          );
        })}
        
        {/* Mid-layer smoke (medium, moderate speed) */}
        {smokePaths.slice(10, 25).map((path, i) => {
          const animation = getRandomAnimationVariant();
          const duration = (6 + i % 4) * speedFactor;
          const delay = i * 0.08;
          const fill = i % 2 === 0 ? "url(#darkSmoke)" : "url(#smokeGrad3)";
          
          return (
            <motion.path
              key={`mid-${i}`}
              d={path}
              fill={fill}
              filter="url(#blurMedium)"
              initial={{ opacity: 0 }}
              animate={{
                x: animation.x,
                y: animation.y,
                opacity: animation.opacity,
                scale: animation.scale,
                rotate: animation.rotate
              }}
              transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut"
              }}
              style={{ 
                transformOrigin: "center",
                mixBlendMode: isDarkMode ? "multiply" : "screen"
              }}
            />
          );
        })}
        
        {/* Foreground smoke (small, fast) */}
        {smokePaths.slice(25).map((path, i) => {
          const animation = getRandomAnimationVariant();
          const duration = (4 + i % 3) * speedFactor;
          const delay = i * 0.06;
          const fill = i % 2 === 0 ? "url(#lightSmoke)" : "url(#smokeGrad1)";
          
          return (
            <motion.path
              key={`front-${i}`}
              d={path}
              fill={fill}
              filter="url(#blurSmall)"
              initial={{ opacity: 0 }}
              animate={{
                x: animation.x,
                y: animation.y,
                opacity: animation.opacity.map(v => v * 0.7), // Slightly more transparent
                scale: animation.scale,
                rotate: animation.rotate
              }}
              transition={{
                duration: duration,
                delay: delay,
                repeat: Infinity,
                repeatType: "mirror",
                ease: "easeInOut"
              }}
              style={{ 
                transformOrigin: "center",
                mixBlendMode: "screen"
              }}
            />
          );
        })}
        
        {/* Edge vignette for depth */}
        <circle
          cx="50"
          cy="50"
          r="43"
          fill="none"
          stroke={edgeColor}
          strokeWidth="6"
          style={{ opacity: 0.6 }}
        />
      </motion.svg>
    </motion.div>
  );
};

export default CloudyCircle;