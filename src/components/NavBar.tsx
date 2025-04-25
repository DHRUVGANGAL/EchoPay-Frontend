import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NavBar: React.FC = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  return (
    <nav className="w-full px-6 py-4">
      <div className="container mx-auto flex justify-between items-center">
       
        <Link to="/" className="font-mono text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600">
          EchoPay
        </Link>
        
      
        <div className="hidden md:flex items-center space-x-6">
          <Link 
            to="/" 
            className={`font-mono text-sm ${location.pathname === '/' ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`}
          >
            Home
          </Link>
          
          <Link 
            to="/add-account" 
            className={`font-mono text-sm ${location.pathname === '/add-account' ? 'text-white' : 'text-gray-400 hover:text-white'} transition-colors`}
          >
            Add Account
          </Link>
          
          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="font-mono text-sm text-gray-400 hover:text-white transition-colors"
          >
            GitHub
          </a>
          
          <a 
            href="#ideas" 
            className="font-mono text-sm text-gray-400 hover:text-white transition-colors"
          >
          Resource
          </a>
        </div>
        
       
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={toggleMenu}
        >
          {isMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>
      
     
      {isMenuOpen && (
        <div className="absolute left-0 right-0 bg-black bg-opacity-90 z-50 md:hidden mt-2">
          <div className="flex flex-col items-center py-4 space-y-4">
            <Link 
              to="/" 
              className={`font-mono ${location.pathname === '/' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            
            <Link 
              to="/add-account" 
              className={`font-mono ${location.pathname === '/add-account' ? 'text-white' : 'text-gray-400'} hover:text-white transition-colors`}
              onClick={() => setIsMenuOpen(false)}
            >
              Add Account
            </Link>
            
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-mono text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              GitHub
            </a>
            
            <a 
              href="#ideas" 
              className="font-mono text-gray-400 hover:text-white transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Resource
            </a>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;