import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackgroundBeams } from './ui/background-beams';
import NavBar from './NavBar';
import { HyperText } from './magicui/hyper-text';

const LandingPage: React.FC = () => {

  const [isHovering, setIsHovering] = useState(false);
  const navigate = useNavigate();


  const handleGetStarted = () => {
    navigate('/voice-session');
  };

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden">
      
      <div className="absolute inset-0 z-0">
        <BackgroundBeams />
      </div>
      
   
      <div className="relative z-10 flex flex-col min-h-screen">
        
        <NavBar />
        
        
        <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
        
          
          
          <div
            className="text-4xl md:text-6xl mb-6 max-w-4xl cursor-pointer"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <div className="flex flex-col">
              <HyperText
                className={`text-4xl md:text-6xl font-mono ${isHovering ? 'tracking-tight' : 'tracking-wider'} transition-all duration-300 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 uppercase`}
                duration={800}
                delay={0}
                startOnView={true}
                animateOnHover={true}
              >
                ACCELERATING THE
              </HyperText>
              
              <HyperText
                className={`text-4xl md:text-6xl font-mono ${isHovering ? 'tracking-tight' : 'tracking-wider'} transition-all duration-300 mt-2 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-500 uppercase`}
                duration={800}
                delay={200} 
                startOnView={true}
                animateOnHover={true}
              >
                AI PAYMENTS
              </HyperText>
            </div>
          </div>
          
        
          
          <button 
            className="px-8 py-3 bg-white text-black font-bold rounded-md hover:bg-gray-400 transition-colors"
            onClick={handleGetStarted}
          >
            GET STARTED
          </button>
        </main>
      </div>
    </div>
  );
};

export default LandingPage;