import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { WavyBackground } from './ui/wavy-background';
import NavBar from './NavBar';

const BACKEND_URL = import.meta.env.VITE_Backend_URL;

const AddAccount: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPublicKey(value);
    
  
    if (value && value.length > 0 && !/^0x[0-9a-fA-F]{40}$/.test(value)) {
      setError('Invalid Ethereum address format');
    } else {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
   
    setError('');
    

    if (!name.trim() || !publicKey.trim()) {
      setError('Both fields are required');
      return;
    }
    
  
    if (!publicKey.startsWith('0x')) {
      setError('Public key must start with 0x');
      return;
    }
    
    
    const hexRegex = /^0x[0-9a-fA-F]{40}$/;
    if (!hexRegex.test(publicKey)) {
      setError('Invalid Ethereum address format');
      return;
    }
    
    setIsLoading(true);
    
    try {
    
      const response = await fetch(`${BACKEND_URL}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          address: publicKey.trim()
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to add contact');
      }
      
      console.log('Contact added successfully:', data);
      
     
      setShowSuccess(true);
      
      
      setTimeout(() => {
        
        setName('');
        setPublicKey('');
        setError('');
        setShowSuccess(false);
        navigate('/');
      }, 2500);
      
    } catch (err: any) {
      console.error('Error adding contact:', err);
      setError(err.message || 'Error adding contact. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

 

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden">
     
      <div className="absolute inset-0 z-0">
        <WavyBackground 
          colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
          blur={10}
          speed="fast"
          waveOpacity={0.5}
        />
      </div>
      
   
      <div className="relative z-10 flex flex-col min-h-screen">
       
        <NavBar />
        
       
        <main className="flex-1 flex flex-col items-center justify-center text-center p-6">
          <div className="bg-black bg-opacity-40 p-8 rounded-lg backdrop-blur-sm max-w-md w-full">
            {showSuccess ? (
              <div className="flex flex-col items-center justify-center py-6">
                <h2 className="text-3xl font-oswald mb-2 bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-blue-500 uppercase">
                  Contact Added!
                </h2>
                <p className="text-gray-300 text-lg font-oswald">
                  {name} has been successfully added to your contacts
                </p>
              </div>
            ) : (
              <>
                <h2 className="text-3xl font-oswald mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 uppercase">
                  Add Contact
                </h2>
                
                {error && (
                  <div className="mb-4 p-2 bg-red-500 bg-opacity-30 rounded text-white text-sm">
                    {error}
                  </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label className="block text-left text-gray-300 text-sm font-mono">
                      Name
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-900 bg-opacity-50 rounded border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 text-base outline-none text-gray-100 py-2 px-3 leading-8 transition-colors duration-200 ease-in-out"
                      placeholder="Enter contact name"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-left text-gray-300 text-sm font-mono">
                      Wallet Address
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={publicKey}
                        onChange={handlePublicKeyChange}
                        className="w-full bg-gray-900 bg-opacity-50 rounded border border-gray-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-900 text-base outline-none text-gray-100 py-2 px-3 leading-8 transition-colors duration-200 ease-in-out"
                        placeholder="0x..."
                        disabled={isLoading}
                      />
                      {!publicKey.startsWith('0x') && publicKey.length > 0 && (
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-yellow-500">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {publicKey && !publicKey.startsWith('0x') && (
                      <p className="text-left text-yellow-500 text-xs mt-1">
                        Wallet address must start with 0x
                      </p>
                    )}
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="px-6 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600 transition-colors flex-1"
                      disabled={isLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-6 py-2 bg-white text-black font-bold rounded-md hover:bg-gray-200 transition-colors flex-1 ${
                        isLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Adding...' : 'Add Contact'}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AddAccount;