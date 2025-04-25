import React, { useState, useRef, useEffect } from 'react';
import { WavyBackground } from './ui/wavy-background';
import AudioWaveform from './AudioWaveform';
import CloudyCircle from './CloudyCircle';
import NavBar from './NavBar';

interface VoiceSessionProps {
  apiKey?: string;
  backendUrl?: string; // Backend API URL
}
export interface SpeechCreateParams {
  input: string;
  model: string;
  voice: string;
}
// Response type for the execute command endpoint
interface ExecuteResponse {
  success: boolean;
  message?: string;
  transaction?: {
    transactionHash: string;
    from: string;
    to: string;
    amount: string;
    token: string;
  };
  error?: string;
  suggestion?: string;
}

// Response type for balance
interface BalanceItem {
  token: string;
  balance: string;
  balanceRaw?: string;
  decimals?: number;
  error?: string;
}

type BalanceResponse = BalanceItem | BalanceItem[];

const VoiceSessionComponent: React.FC<VoiceSessionProps> = ({ 
  apiKey,
  backendUrl = import.meta.env.VITE_Backend_URL 
}) => {
 
  const userAddress = import.meta.env.VITE_userAddress;
  
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<number[]>([]);
  const [transactionResult, setTransactionResult] = useState<ExecuteResponse | null>(null);
  const [balanceResult, setBalanceResult] = useState<BalanceResponse | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [commandType, setCommandType] = useState<'none' | 'send' | 'balance'>('none');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Get session status
  const getStatus = () => {
    if (isRecording) return 'listening';
    if (isProcessing) return 'processing';
    if (isExecuting) return 'executing';
    if (isSpeaking) return 'speaking';
    if (transcript) return 'completed';
    return 'idle';
  };

  const status = getStatus();
  const isActive = status === 'processing' || status === 'listening' || status === 'executing' || status === 'speaking';

  // Set up audio context and analyzer for visualization
  const setupAudioAnalysis = (stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const audioContext = audioContextRef.current;
    const source = audioContext.createMediaStreamSource(stream);
    analyserRef.current = audioContext.createAnalyser();
    analyserRef.current.fftSize = 256;
    source.connect(analyserRef.current);
    const bufferLength = analyserRef.current.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    // Start visualization loop
    const updateVisualization = () => {
      if (!analyserRef.current || !dataArrayRef.current) return;
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      setAudioData([...dataArrayRef.current]);
      animationFrameRef.current = requestAnimationFrame(updateVisualization);
    };
    updateVisualization();
  };

  // Start recording
  const startRecording = async () => {
    try {
      setError(null);
      setTransactionResult(null);
      setBalanceResult(null);
      setCommandType('none');
      setCopySuccess(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setupAudioAnalysis(stream);
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = handleAudioStop;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all tracks on the active stream
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      // Stop visualization
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  };

  // Handle audio data after recording stops
  const handleAudioStop = async () => {
    try {
      if (audioChunksRef.current.length === 0) {
        setError('No audio recorded');
        return;
      }
      setIsProcessing(true);
      // Create audio blob from chunks
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      // Convert blob to base64 for API
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        try {
          const base64Audio = reader.result?.toString().split(',')[1];
          if (!base64Audio) {
            throw new Error('Failed to convert audio to base64');
          }
          // Call OpenAI API
          await transcribeAudio(base64Audio);
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Error processing audio. Please try again.');
          setIsProcessing(false);
        }
      };
    } catch (err) {
      console.error('Error handling audio stop:', err);
      setError('Error processing recording. Please try again.');
      setIsProcessing(false);
    }
  };

  // Transcribe audio using OpenAI API with language restriction to English
  const transcribeAudio = async (base64Audio: string) => {
    try {
      const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
      if (!key) {
        throw new Error('OpenAI API key is required');
      }
      const formData = new FormData();
      // Convert base64 to blob
      const byteCharacters = atob(base64Audio);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
      // Add file to FormData
      formData.append('file', audioBlob, 'recording.webm');
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');
      // Restrict language to English
      formData.append('language', 'en');
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`
        },
        body: formData
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to transcribe audio');
      }
      const transcription = await response.text();
      setTranscript(transcription);
      // Log the transcription to console
      console.log('Voice transcription:', transcription);
      
      // Determine and execute command type
      if (isSendCommand(transcription)) {
        setCommandType('send');
        executeCommand(transcription);
      } else if (isBalanceCommand(transcription)) {
        setCommandType('balance');
        checkBalance(transcription);
      } else {
        // Not a recognized command
        setCommandType('none');
      }
    } catch (err) {
      console.error('Error transcribing audio:', err);
      setError('Error transcribing audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Convert text to speech
const speakText = (text: string) => {
  // Create params for OpenAI TTS
  const params: SpeechCreateParams = {
    input: text,
    model: 'tts-1-hd', // Using the high-definition model
    voice: 'alloy'  // Setting the voice to nova
  };
  
  // Call the OpenAI TTS API
  fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey || import.meta.env.VITE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(params)
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to generate speech');
    }
    return response.blob();
  })
  .then(audioBlob => {
    // Create audio element and play
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    
    // Set event handlers
    audio.onplay = () => {
      setIsSpeaking(true);
    };
    
    audio.onended = () => {
      setIsSpeaking(false);
      URL.revokeObjectURL(audioUrl); // Clean up
    };
    
    audio.onerror = (event) => {
      console.error('Audio playback error:', event);
      setIsSpeaking(false);
      URL.revokeObjectURL(audioUrl); // Clean up
    };
    
    // Play the audio
    audio.play();
  })
  .catch(err => {
    console.error('Speech synthesis error:', err);
    setIsSpeaking(false);
    
    // Fallback to browser's speech synthesis
    if (window.speechSynthesis) {
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  });
};


  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(null), 2000); // Clear the success message after 2 seconds
      })
      .catch(() => {
        setCopySuccess('Failed to copy');
        setTimeout(() => setCopySuccess(null), 2000);
      });
  };

  // Format transaction hash for display
  const formatTransactionHash = (hash: string = '') => {
    if (!hash) return 'Not available';
    if (hash.length <= 20) return hash;
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };
  
  // Format transaction result for speech
  const formatTransactionForSpeech = (result: ExecuteResponse) => {
    if (!result.success) {
      return `Transaction failed. ${result.error || 'Please try again.'}`;
    }
    
    const tx = result.transaction;
    if (!tx) {
      return result.message || 'Transaction completed successfully.';
    }
    
    const shortHash = formatTransactionHash(tx.transactionHash);
    return `Transaction completed successfully. ${tx.amount} ${tx.token} sent. Transaction hash: ${shortHash.replace(/\.\.\./g, 'dot dot dot')}`;
  };

  // Check if the transcript looks like a send command
  const isSendCommand = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    
    const hasSendIntent = lowerText.includes('send') || 
                          (lowerText.includes('to') && 
                           (lowerText.includes('mtk') || 
                            lowerText.includes('usdc') || 
                            lowerText.includes('eth') || 
                            lowerText.includes('dai') || 
                            lowerText.includes('usdt')));
    
    return hasSendIntent && lowerText.includes('to');
  };

  // Check if the transcript looks like a balance command
  const isBalanceCommand = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return (lowerText.includes('balance') || 
            lowerText.includes('check balance') || 
            lowerText.includes('show balance') || 
            lowerText.includes('how much') || 
            lowerText.includes('what is my balance')) &&
           (!lowerText.includes('send') && !lowerText.includes('transfer'));
  };

  // Execute command using the backend API
  const executeCommand = async (command: string) => {
    try {
      setIsExecuting(true);
      setError(null);
  
      // Fix command format if it doesn't start with "send"
      let formattedCommand = command;
      if (!command.toLowerCase().startsWith('send')) {
        // Extract the information using regex
        const extractRegex = /(\w+)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i;
        const match = command.match(extractRegex);
        if (match) {
          formattedCommand = `Send ${match[2]} ${match[3]} to ${match[4]}`;
          console.log('Reformatted command:', formattedCommand);
        }
      }
  
      const response = await fetch(`${backendUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: formattedCommand,
          userAddress
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to execute command');
      }

      // Store the result
      setTransactionResult(result);
      console.log('Transaction result:', result);
      
      // Speak the transaction result
      const speechText = formatTransactionForSpeech(result);
      speakText(speechText);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error executing command. Please try again.');
      setTransactionResult(null);
      
      // Speak the error
      speakText(`${err.message || 'Please try again.'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Format balance result for speech
  const formatBalanceForSpeech = (result: BalanceResponse) => {
    if (Array.isArray(result)) {
      if (result.length === 0) {
        return 'You have no tokens in your wallet.';
      }
      
      const balanceTexts = result.map(item => {
        if (item.error) return '';
        return `${item.balance} ${item.token}`;
      }).filter(text => text !== '');
      
      return `Your wallet contains: ${balanceTexts.join(', ')}`;
    } else {
      if (result.error) {
        return `Could not retrieve balance for ${result.token}.`;
      }
      return `Your ${result.token} balance is ${result.balance}`;
    }
  };

  // Check balance using the backend API
  const checkBalance = async (command: string) => {
    try {
      setIsExecuting(true);
      setError(null);

      // Parse the command to see if a specific token is mentioned
      let specificToken = null;
      
      // Check for token mentions
      const tokenNames = ['usdc', 'eth', 'dai', 'usdt', 'mtk'];
      for (const token of tokenNames) {
        if (command.toLowerCase().includes(token)) {
          specificToken = token.toUpperCase();
          break;
        }
      }
      
      // Construct the API endpoint with optional token parameter
      const endpoint = specificToken 
        ? `${backendUrl}/api/balance?token=${specificToken}` 
        : `${backendUrl}/api/balance`;

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch balance');
      }

      // Display balance information
      setBalanceResult(result);
      console.log('Balance result:', result);
      
      // Speak the balance result
      const speechText = formatBalanceForSpeech(result);
      speakText(speechText);
      
    } catch (err: any) {
      console.error('Error checking balance:', err);
      setError(err.message || 'Error checking balance. Please try again.');
      setBalanceResult(null);
      
      // Speak the error
      speakText(`Error checking balance. ${err.message || 'Please try again.'}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
      if (window.speechSynthesis && speechSynthesisRef.current) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle record button click
  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      // Reset transcript and transaction result when starting a new recording
      setTranscript('');
      setTransactionResult(null);
      setBalanceResult(null);
      startRecording();
    }
  };

  // Handle reset button click
  const handleResetClick = () => {
    setTranscript('');
    setError(null);
    setAudioData([]);
    setTransactionResult(null);
    setBalanceResult(null);
    setCommandType('none');
    setCopySuccess(null);
    
    // Stop any ongoing speech
    if (window.speechSynthesis && speechSynthesisRef.current) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  // Handle execute button click
  const handleExecuteClick = () => {
    if (transcript) {
      if (commandType === 'send' || isSendCommand(transcript)) {
        executeCommand(transcript);
      } else if (commandType === 'balance' || isBalanceCommand(transcript)) {
        checkBalance(transcript);
      } else {
        setError('Command not recognized. Try saying "Send 5 USDC to Alice" or "Check my balance"');
        speakText('Command not recognized. Try saying "Send 5 USDC to Alice" or "Check my balance"');
      }
    }
  };

  // Format a single balance item for display
  const formatBalanceItem = (item: BalanceItem) => (
    <div className="flex justify-between text-sm mb-1">
      <span className="text-gray-200">{item.token}:</span>
      <span className="text-blue-300 font-mono">{item.balance}</span>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col text-white relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <WavyBackground
          colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
          blur={10}
          speed="fast"
          waveOpacity={0.5}
        />
      </div>
      {/* Content Container */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Navbar */}
        <NavBar />
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6">
          <div className="bg-black bg-opacity-40 p-4 sm:p-8 rounded-lg backdrop-blur-sm w-full max-w-md mx-auto">
            <h2 className="text-2xl sm:text-3xl font-oswald mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 uppercase">
              Say Something
            </h2>
            
            {error && (
              <div className="mb-4 p-2 bg-red-500 bg-opacity-30 rounded text-white text-sm">
                {error}
              </div>
            )}
            
            <div className="flex flex-col items-center mb-3">
              {/* Cloudy Circle Animation */}
              <div className="mb-2 transform scale-75">
                <CloudyCircle isActive={isActive} isDarkMode={false} />
              </div>
              {/* Status Text */}
              <p className="text-xl sm:text-2xl mt-1 font-oswald">
                {status === 'listening' ? 'Listening...' :
                 status === 'processing' ? 'Processing...' :
                 status === 'executing' ? 'Executing command...' :
                 status === 'speaking' ? 'Speaking...' :
                 status === 'completed' ? '' :
                 'Press Record to Start'}
              </p>
            </div>
            
            {/* Audio Visualization */}
            <div className="h-12 mb-3 flex items-center justify-center">
              {isRecording && <AudioWaveform isListening={isRecording} isDarkMode={false} />}
            </div>
            
            {/* Transcribed text displayed directly in the card */}
            {transcript && (
              <div className="mb-4" style={{marginTop:"-1rem"}}>
                <p className="text-center text-white text-lg sm:text-xl">{transcript}</p>
              </div>
            )}
            {/* Transaction Result */}
            {transactionResult && transactionResult.success && (
             <div className="mb-6 p-3 bg-green-500 bg-opacity-20 rounded">
               <p className="text-white text-lg font-medium">{transactionResult.message}</p>
                 {transactionResult.transaction && (
                  <div className="mt-2">
                  <div className="text-sm">
                  <p className="text-gray-200 text-center">Transaction Hash:</p>
                   <div className="flex items-center mt-1">
                   <p className="text-green-300 font-mono flex-grow  text-center text-xs sm:text-sm ">
                           {transactionResult.transaction.transactionHash 
                               ? `${transactionResult.transaction.transactionHash.substring(0, 8)}...${transactionResult.transaction.transactionHash.substring(transactionResult.transaction.transactionHash.length - 8)}`
                                : 'Not available'
                             }
                            </p>
                  {transactionResult.transaction.transactionHash && (
                   <button 
                       onClick={() => copyToClipboard(transactionResult.transaction?.transactionHash || '')}
                      className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs flex-shrink-0 flex items-center"
                       title="Copy to clipboard"
                    >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                {copySuccess && <span className="ml-1">{copySuccess}</span>}
              </button>
                )}
                  </div>
                  </div>
                 <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                <p className="text-gray-200">Amount:</p>
                 <p className="text-green-300">{transactionResult.transaction.amount} {transactionResult.transaction.token}</p>
                 </div>
                 <div>
                   <p className="text-gray-200">Recipient:</p>
                    <p className="text-green-300 font-mono overflow-hidden text-ellipsis max-w-full text-xs sm:text-sm">
                    {formatTransactionHash(transactionResult.transaction.to)}
                        </p>
                  </div>
                   </div>
                    </div>
                  )}
                </div>
                  )}
            
            
            {/* Balance Result */}
            {balanceResult && (
              <div className="mb-6 p-3 bg-blue-500 bg-opacity-20 rounded">
                <p className="text-white text-lg font-medium">Your Balance</p>
                <div className="mt-2 max-h-40 overflow-y-auto">
                  {Array.isArray(balanceResult) ? (
                    balanceResult.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm mb-1">
                        <span className="text-gray-200">{item.token}:</span>
                        <span className="text-blue-300 font-mono">{item.balance}</span>
                      </div>
                    ))
                  ) : (
                    formatBalanceItem(balanceResult)
                  )}
                </div>
              </div>
            )}
            
            {/* Speech indicator */}
            {isSpeaking && (
              <div className="mb-4 p-2 bg-opacity-0 rounded flex items-center justify-center">
                <span className="mr-2">🔊</span>
                <span className="text-white">Speaking...</span>
              </div>
            )}
            
            {/* Controls */}
            <div className="flex space-x-4 justify-center">
              <button
                onClick={handleRecordClick}
                className={`flex items-center justify-center p-3 sm:p-4 rounded-full ${
                  isRecording
                   ? 'bg-red-500 hover:bg-red-600'
                   : 'bg-blue-500 hover:bg-blue-600'
                } transition-colors w-14 h-14 sm:w-16 sm:h-16`}
                disabled={isProcessing || isExecuting || isSpeaking}
              >
                {isRecording ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <rect x="6" y="6" width="12" height="12" strokeWidth="2" stroke="white" fill="white" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              
              {transcript && !transactionResult && !balanceResult && (commandType !== 'none') && (
                <button
                  onClick={handleExecuteClick}
                  className="flex items-center justify-center p-3 sm:p-4 rounded-full bg-green-600 hover:bg-green-700 transition-colors w-14 h-14 sm:w-16 sm:h-16"
                  disabled={isRecording || isProcessing || isExecuting || isSpeaking}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              {(transcript || error || transactionResult || balanceResult) && (
                <button
                  onClick={handleResetClick}
                  className="flex items-center justify-center p-3 sm:p-4 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors w-14 h-14 sm:w-16 sm:h-16"
                  disabled={isRecording || isProcessing || isExecuting}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              )}
            </div>
            
          </div>
        </main>
      </div>
    </div>
  );
};

export default VoiceSessionComponent;



// import React, { useState, useRef, useEffect } from 'react';
// import { WavyBackground } from './ui/wavy-background';
// import AudioWaveform from './AudioWaveform';
// import CloudyCircle from './CloudyCircle';
// import NavBar from './NavBar';

// interface VoiceSessionProps {
//   apiKey?: string;
//   backendUrl?: string; 
// }

// export interface SpeechCreateParams {
//   input: string;
//   model: string;
//   voice: string;
// }


// interface ExecuteResponse {
//   success: boolean;
//   message?: string;
//   transaction?: {
//     transactionHash: string;
//     from: string;
//     to: string;
//     amount: string;
//     token: string;
//   };
//   error?: string;
//   suggestion?: string;
//   requiresAuthentication?: boolean; 
// }


// interface BalanceItem {
//   token: string;
//   balance: string;
//   balanceRaw?: string;
//   decimals?: number;
//   error?: string;
// }

// type BalanceResponse = BalanceItem | BalanceItem[];

// const VoiceSessionComponent: React.FC<VoiceSessionProps> = ({ 
//   apiKey,
//   backendUrl = import.meta.env.VITE_Backend_URL 
// }) => {
 
//   const userAddress = import.meta.env.VITE_userAddress;
  
//   const [isRecording, setIsRecording] = useState(false);
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [transcript, setTranscript] = useState('');
//   const [error, setError] = useState<string | null>(null);
//   const [audioData, setAudioData] = useState<number[]>([]);
//   const [transactionResult, setTransactionResult] = useState<ExecuteResponse | null>(null);
//   const [balanceResult, setBalanceResult] = useState<BalanceResponse | null>(null);
//   const [isExecuting, setIsExecuting] = useState(false);
//   const [commandType, setCommandType] = useState<'none' | 'send' | 'balance'>('none');
//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [copySuccess, setCopySuccess] = useState<string | null>(null);
  
  
//   const [secretWord, setSecretWord] = useState<string>('');
//   const [isSecretWordPromptOpen, setIsSecretWordPromptOpen] = useState(false);
//   const [pendingCommand, setPendingCommand] = useState<string>('');
//   const [pendingCommandType, setPendingCommandType] = useState<'none' | 'send' | 'balance'>('none');
  
//   const mediaRecorderRef = useRef<MediaRecorder | null>(null);
//   const audioChunksRef = useRef<Blob[]>([]);
//   const animationFrameRef = useRef<number | null>(null);
//   const audioContextRef = useRef<AudioContext | null>(null);
//   const analyserRef = useRef<AnalyserNode | null>(null);
//   const dataArrayRef = useRef<Uint8Array | null>(null);
//   const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
//   const secretWordInputRef = useRef<HTMLInputElement>(null);


//   const getStatus = () => {
//     if (isRecording) return 'listening';
//     if (isProcessing) return 'processing';
//     if (isExecuting) return 'executing';
//     if (isSpeaking) return 'speaking';
//     if (transcript) return 'completed';
//     return 'idle';
//   };

//   const status = getStatus();
//   const isActive = status === 'processing' || status === 'listening' || status === 'executing' || status === 'speaking';

  
//   const setupAudioAnalysis = (stream: MediaStream) => {
//     if (!audioContextRef.current) {
//       audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
//     }
//     const audioContext = audioContextRef.current;
//     const source = audioContext.createMediaStreamSource(stream);
//     analyserRef.current = audioContext.createAnalyser();
//     analyserRef.current.fftSize = 256;
//     source.connect(analyserRef.current);
//     const bufferLength = analyserRef.current.frequencyBinCount;
//     dataArrayRef.current = new Uint8Array(bufferLength);

    
//     const updateVisualization = () => {
//       if (!analyserRef.current || !dataArrayRef.current) return;
//       analyserRef.current.getByteFrequencyData(dataArrayRef.current);
//       setAudioData([...dataArrayRef.current]);
//       animationFrameRef.current = requestAnimationFrame(updateVisualization);
//     };
//     updateVisualization();
//   };

 
//   const startRecording = async () => {
//     try {
//       setError(null);
//       setTransactionResult(null);
//       setBalanceResult(null);
//       setCommandType('none');
//       setCopySuccess(null);
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       setupAudioAnalysis(stream);
//       const mediaRecorder = new MediaRecorder(stream);
//       mediaRecorderRef.current = mediaRecorder;
//       audioChunksRef.current = [];
//       mediaRecorder.ondataavailable = (event) => {
//         if (event.data.size > 0) {
//           audioChunksRef.current.push(event.data);
//         }
//       };
//       mediaRecorder.onstop = handleAudioStop;
//       mediaRecorder.start();
//       setIsRecording(true);
//     } catch (err) {
//       console.error('Error starting recording:', err);
//       setError('Could not access microphone. Please check permissions.');
//     }
//   };

 
//   const stopRecording = () => {
//     if (mediaRecorderRef.current && isRecording) {
//       mediaRecorderRef.current.stop();
//       setIsRecording(false);
    
//       if (mediaRecorderRef.current.stream) {
//         mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//       }
      
//       if (animationFrameRef.current !== null) {
//         cancelAnimationFrame(animationFrameRef.current);
//         animationFrameRef.current = null;
//       }
//     }
//   };

//   const handleAudioStop = async () => {
//     try {
//       if (audioChunksRef.current.length === 0) {
//         setError('No audio recorded');
//         return;
//       }
//       setIsProcessing(true);
    
//       const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
//       const reader = new FileReader();
//       reader.readAsDataURL(audioBlob);
//       reader.onloadend = async () => {
//         try {
//           const base64Audio = reader.result?.toString().split(',')[1];
//           if (!base64Audio) {
//             throw new Error('Failed to convert audio to base64');
//           }
         
//           await transcribeAudio(base64Audio);
//         } catch (err) {
//           console.error('Error processing audio:', err);
//           setError('Error processing audio. Please try again.');
//           setIsProcessing(false);
//         }
//       };
//     } catch (err) {
//       console.error('Error handling audio stop:', err);
//       setError('Error processing recording. Please try again.');
//       setIsProcessing(false);
//     }
//   };

  
//   const transcribeAudio = async (base64Audio: string) => {
//     try {
//       const key = apiKey || import.meta.env.VITE_OPENAI_API_KEY;
//       if (!key) {
//         throw new Error('OpenAI API key is required');
//       }
//       const formData = new FormData();
    
//       const byteCharacters = atob(base64Audio);
//       const byteNumbers = new Array(byteCharacters.length);
//       for (let i = 0; i < byteCharacters.length; i++) {
//         byteNumbers[i] = byteCharacters.charCodeAt(i);
//       }
//       const byteArray = new Uint8Array(byteNumbers);
//       const audioBlob = new Blob([byteArray], { type: 'audio/webm' });
     
//       formData.append('file', audioBlob, 'recording.webm');
//       formData.append('model', 'whisper-1');
//       formData.append('response_format', 'text');
     
//       formData.append('language', 'en');
//       const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${key}`
//         },
//         body: formData
//       });
//       if (!response.ok) {
//         const errorData = await response.json();
//         throw new Error(errorData.error?.message || 'Failed to transcribe audio');
//       }
//       const transcription = await response.text();
//       setTranscript(transcription);
    
//       console.log('Voice transcription:', transcription);
      
      
//       if (isSendCommand(transcription)) {
//         setCommandType('send');
//         setPendingCommand(transcription);
//         setPendingCommandType('send');
        
//         openSecretWordPrompt();
//       } else if (isBalanceCommand(transcription)) {
//         setCommandType('balance');
//         setPendingCommand(transcription);
//         setPendingCommandType('balance');
        
//         openSecretWordPrompt();
//       } else {
        
//         setCommandType('none');
//       }
//     } catch (err) {
//       console.error('Error transcribing audio:', err);
//       setError('Error transcribing audio. Please try again.');
//     } finally {
//       setIsProcessing(false);
//     }
//   };

 
//   const openSecretWordPrompt = () => {
//     setIsSecretWordPromptOpen(true);
    
//     setTimeout(() => {
//       if (secretWordInputRef.current) {
//         secretWordInputRef.current.focus();
//       }
//     }, 100);
    

//     speakText("Please enter the secret word to execute this command.");
//   };

  
//   const closeSecretWordPrompt = () => {
//     setIsSecretWordPromptOpen(false);
//     setSecretWord('');
//   };

  
//   const submitSecretWord = () => {
//     if (pendingCommandType === 'send') {
//       executeCommand(pendingCommand, secretWord);
//     } else if (pendingCommandType === 'balance') {
//       checkBalance(pendingCommand, secretWord);
//     }
//     closeSecretWordPrompt();
//   };


//   const speakText = (text: string) => {

//     const params: SpeechCreateParams = {
//       input: text,
//       model: 'tts-1-hd', 
//       voice: 'sage'  
//     };
    
    
//     fetch('https://api.openai.com/v1/audio/speech', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${apiKey || import.meta.env.VITE_OPENAI_API_KEY}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(params)
//     })
//     .then(response => {
//       if (!response.ok) {
//         throw new Error('Failed to generate speech');
//       }
//       return response.blob();
//     })
//     .then(audioBlob => {
      
//       const audioUrl = URL.createObjectURL(audioBlob);
//       const audio = new Audio(audioUrl);
      
      
//       audio.onplay = () => {
//         setIsSpeaking(true);
//       };
      
//       audio.onended = () => {
//         setIsSpeaking(false);
//         URL.revokeObjectURL(audioUrl);
//       };
      
//       audio.onerror = (event) => {
//         console.error('Audio playback error:', event);
//         setIsSpeaking(false);
//         URL.revokeObjectURL(audioUrl);
//       };
      
//       // Play the audio
//       audio.play();
//     })
//     .catch(err => {
//       console.error('Speech synthesis error:', err);
//       setIsSpeaking(false);
      
      
//       if (window.speechSynthesis) {
//         const utterance = new SpeechSynthesisUtterance(text);
//         window.speechSynthesis.speak(utterance);
//       }
//     });
//   };


//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text)
//       .then(() => {
//         setCopySuccess('Copied!');
//         setTimeout(() => setCopySuccess(null), 2000); 
//       })
//       .catch(() => {
//         setCopySuccess('Failed to copy');
//         setTimeout(() => setCopySuccess(null), 2000);
//       });
//   };

  
//   const formatTransactionHash = (hash: string = '') => {
//     if (!hash) return 'Not available';
//     if (hash.length <= 20) return hash;
//     return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
//   };
  
  
//   const formatTransactionForSpeech = (result: ExecuteResponse) => {
//     if (!result.success) {
//       return `Transaction failed. ${result.error || 'Please try again.'}`;
//     }
    
//     const tx = result.transaction;
//     if (!tx) {
//       return result.message || 'Transaction completed successfully.';
//     }
    
//     const shortHash = formatTransactionHash(tx.transactionHash);
//     return `Transaction completed successfully. ${tx.amount} ${tx.token} sent. Transaction hash: ${shortHash.replace(/\.\.\./g, 'dot dot dot')}`;
//   };

//   const isSendCommand = (text: string): boolean => {
//     const lowerText = text.toLowerCase();
    
//     const hasSendIntent = lowerText.includes('send') || 
//                           (lowerText.includes('to') && 
//                            (lowerText.includes('mtk') || 
//                             lowerText.includes('usdc') || 
//                             lowerText.includes('eth') || 
//                             lowerText.includes('dai') || 
//                             lowerText.includes('usdt')));
    
//     return hasSendIntent && lowerText.includes('to');
//   };


//   const isBalanceCommand = (text: string): boolean => {
//     const lowerText = text.toLowerCase();
//     return (lowerText.includes('balance') || 
//             lowerText.includes('check balance') || 
//             lowerText.includes('show balance') || 
//             lowerText.includes('how much') || 
//             lowerText.includes('what is my balance')) &&
//            (!lowerText.includes('send') && !lowerText.includes('transfer'));
//   };

  
//   const executeCommand = async (command: string, secretWordParam: string) => {
//     try {
//       setIsExecuting(true);
//       setError(null);
  
      
//       let formattedCommand = command;
//       if (!command.toLowerCase().startsWith('send')) {
       
//         const extractRegex = /(\w+)\s+(\d+(?:\.\d+)?)\s+(\w+)\s+to\s+(\w+)/i;
//         const match = command.match(extractRegex);
//         if (match) {
//           formattedCommand = `Send ${match[2]} ${match[3]} to ${match[4]}`;
//           console.log('Reformatted command:', formattedCommand);
//         }
//       }
  
//       const response = await fetch(`${backendUrl}/api/execute`, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify({
//           command: formattedCommand,
//           userAddress,
//           secretWord: secretWordParam 
//         }),
//       });

//       const result = await response.json();

      
//       if (result.requiresAuthentication) {
//         setError('Invalid secret word. Please try again.');
//         speakText('Invalid secret word. Please try again.');
//         setPendingCommand(command);
//         setPendingCommandType('send');
//         openSecretWordPrompt();
//         return;
//       }

//       if (!response.ok) {
//         throw new Error(result.error || 'Failed to execute command');
//       }

 
//       setTransactionResult(result);
//       console.log('Transaction result:', result);
      

//       const speechText = formatTransactionForSpeech(result);
//       speakText(speechText);
      
//     } catch (err: any) {
//       console.error(err);
//       setError(err.message || 'Error executing command. Please try again.');
//       setTransactionResult(null);
      

//       speakText(`${err.message || 'Please try again.'}`);
//     } finally {
//       setIsExecuting(false);
//     }
//   };


//   const formatBalanceForSpeech = (result: BalanceResponse) => {
//     if (Array.isArray(result)) {
//       if (result.length === 0) {
//         return 'You have no tokens in your wallet.';
//       }
      
//       const balanceTexts = result.map(item => {
//         if (item.error) return '';
//         return `${item.balance} ${item.token}`;
//       }).filter(text => text !== '');
      
//       return `Your wallet contains: ${balanceTexts.join(', ')}`;
//     } else {
//       if (result.error) {
//         return `Could not retrieve balance for ${result.token}.`;
//       }
//       return `Your ${result.token} balance is ${result.balance}`;
//     }
//   };

  
//   const checkBalance = async (command: string, secretWordParam: string) => {
//     try {
//       setIsExecuting(true);
//       setError(null);

      
//       let specificToken = null;
      
      
//       const tokenNames = ['usdc', 'eth', 'dai', 'usdt', 'mtk'];
//       for (const token of tokenNames) {
//         if (command.toLowerCase().includes(token)) {
//           specificToken = token.toUpperCase();
//           break;
//         }
//       }
      
      
//       const endpoint = specificToken 
//         ? `${backendUrl}/api/balance?token=${specificToken}&secretWord=${encodeURIComponent(secretWordParam)}` 
//         : `${backendUrl}/api/balance?secretWord=${encodeURIComponent(secretWordParam)}`;

//       const response = await fetch(endpoint, {
//         method: 'GET',
//         headers: {
//           'Content-Type': 'application/json',
//         }
//       });

//       const result = await response.json();

      
//       if (result.requiresAuthentication) {
//         setError('Invalid secret word. Please try again.');
//         speakText('Invalid secret word. Please try again.');
//         setPendingCommand(command);
//         setPendingCommandType('balance');
//         openSecretWordPrompt();
//         return;
//       }

//       if (!response.ok) {
//         throw new Error(result.error || 'Failed to fetch balance');
//       }

      
//       setBalanceResult(result);
//       console.log('Balance result:', result);
      
      
//       const speechText = formatBalanceForSpeech(result);
//       speakText(speechText);
      
//     } catch (err: any) {
//       console.error('Error checking balance:', err);
//       setError(err.message || 'Error checking balance. Please try again.');
//       setBalanceResult(null);
      
     
//       speakText(`Error checking balance. ${err.message || 'Please try again.'}`);
//     } finally {
//       setIsExecuting(false);
//     }
//   };

 
//   useEffect(() => {
//     return () => {
//       if (animationFrameRef.current !== null) {
//         cancelAnimationFrame(animationFrameRef.current);
//       }
//       if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
//         mediaRecorderRef.current.stop();
//         if (mediaRecorderRef.current.stream) {
//           mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
//         }
//       }
//       if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
//         audioContextRef.current.close();
//       }
//       if (window.speechSynthesis && speechSynthesisRef.current) {
//         window.speechSynthesis.cancel();
//       }
//     };
//   }, []);

 
//   const handleRecordClick = () => {
//     if (isRecording) {
//       stopRecording();
//     } else {
      
//       setTranscript('');
//       setTransactionResult(null);
//       setBalanceResult(null);
//       startRecording();
//     }
//   };

 
//   const handleResetClick = () => {
//     setTranscript('');
//     setError(null);
//     setAudioData([]);
//     setTransactionResult(null);
//     setBalanceResult(null);
//     setCommandType('none');
//     setCopySuccess(null);
//     setPendingCommand('');
//     setPendingCommandType('none');
//     closeSecretWordPrompt();
    
    
//     if (window.speechSynthesis && speechSynthesisRef.current) {
//       window.speechSynthesis.cancel();
//       setIsSpeaking(false);
//     }
//   };

  
//   const handleExecuteClick = () => {
//     if (transcript) {
//       if (commandType === 'send' || isSendCommand(transcript)) {
//         setPendingCommand(transcript);
//         setPendingCommandType('send');
//         openSecretWordPrompt();
//       } else if (commandType === 'balance' || isBalanceCommand(transcript)) {
//         setPendingCommand(transcript);
//         setPendingCommandType('balance');
//         openSecretWordPrompt();
//       } else {
//         setError('Command not recognized. Try saying "Send 5 USDC to Alice" or "Check my balance"');
//         speakText('Command not recognized. Try saying "Send 5 USDC to Alice" or "Check my balance"');
//       }
//     }
//   };

  
//   const formatBalanceItem = (item: BalanceItem) => (
//     <div className="flex justify-between text-sm mb-1">
//       <span className="text-gray-200">{item.token}:</span>
//       <span className="text-blue-300 font-mono">{item.balance}</span>
//     </div>
//   );

  
//   const handleSecretWordKeyPress = (e: React.KeyboardEvent) => {
//     if (e.key === 'Enter') {
//       submitSecretWord();
//     }
//   };

//   return (
//     <div className="min-h-screen flex flex-col text-white relative overflow-hidden">
      
//       <div className="absolute inset-0 z-0">
//         <WavyBackground
//           colors={["#38bdf8", "#818cf8", "#c084fc", "#e879f9", "#22d3ee"]}
//           blur={10}
//           speed="fast"
//           waveOpacity={0.5}
//         />
//       </div>
     
//       <div className="relative z-10 flex flex-col min-h-screen">
       
//         <NavBar />
        
//         <main className="flex-1 flex flex-col items-center justify-center text-center p-4 sm:p-6">
//           <div className="bg-black bg-opacity-40 p-4 sm:p-8 rounded-lg backdrop-blur-sm w-full max-w-md mx-auto">
//             <h2 className="text-2xl sm:text-3xl font-oswald mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 uppercase">
//               Say Something
//             </h2>
            
//             {error && (
//               <div className="mb-4 p-2 bg-red-500 bg-opacity-30 rounded text-white text-sm">
//                 {error}
//               </div>
//             )}
            
//             <div className="flex flex-col items-center mb-3">
             
//               <div className="mb-2 transform scale-75">
//                 <CloudyCircle isActive={isActive} isDarkMode={false} />
//               </div>
              
//               <p className="text-xl sm:text-2xl mt-1 font-oswald">
//                 {status === 'listening' ? 'Listening...' :
//                  status === 'processing' ? 'Processing...' :
//                  status === 'executing' ? 'Executing command...' :
//                  status === 'speaking' ? 'Speaking...' :
//                  status === 'completed' ? '' :
//                  'Press Record to Start'}
//               </p>
//             </div>
            
//             <div className="h-12 mb-3 flex items-center justify-center">
//               {isRecording && <AudioWaveform isListening={isRecording} isDarkMode={false} />}
//             </div>
            
            
//             {transcript && (
//               <div className="mb-4" style={{marginTop:"-1rem"}}>
//                 <p className="text-center text-white text-lg sm:text-xl">{transcript}</p>
//               </div>
//             )}

            
//             {isSecretWordPromptOpen && (
//               <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
//                 <div className="bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full">
//                   <h3 className="text-xl font-bold text-white mb-4">Enter Secret Word</h3>
//                   <p className="text-gray-300 mb-4">Please enter the secret word to execute this command:</p>
                  
//                   <div className="mb-4">
//                     <input
//                       ref={secretWordInputRef}
//                       type="password"
//                       className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:border-blue-500"
//                       placeholder="Secret word"
//                       value={secretWord}
//                       onChange={(e) => setSecretWord(e.target.value)}
//                       onKeyDown={handleSecretWordKeyPress}
//                     />
//                   </div>
                  
//                   <div className="flex justify-end space-x-3">
//                     <button
//                       className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded"
//                       onClick={closeSecretWordPrompt}
//                     >
//                       Cancel
//                     </button>
//                     <button
//                       className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
//                       onClick={submitSecretWord}
//                       disabled={!secretWord.trim()}
//                     >
//                       Submit
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
            
            
//             {transactionResult && transactionResult.success && (
//              <div className="mb-6 p-3 bg-green-500 bg-opacity-20 rounded">
//                <p className="text-white text-lg font-medium">{transactionResult.message}</p>
//                  {transactionResult.transaction && (
//                   <div className="mt-2">
//                   <div className="text-sm">
//                   <p className="text-gray-200 text-center">Transaction Hash:</p>
//                    <div className="flex items-center mt-1">
//                    <p className="text-green-300 font-mono flex-grow text-center text-xs sm:text-sm ">
//                            {transactionResult.transaction.transactionHash 
//                                ? `${transactionResult.transaction.transactionHash.substring(0, 8)}...${transactionResult.transaction.transactionHash.substring(transactionResult.transaction.transactionHash.length - 8)}`
//                                 : 'Not available'
//                              }
//                             </p>
//                   {transactionResult.transaction.transactionHash && (
//                    <button 
//                        onClick={() => copyToClipboard(transactionResult.transaction?.transactionHash || '')}
//                       className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded text-xs flex-shrink-0 flex items-center"
//                        title="Copy to clipboard"
//                     >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
//                 </svg>
//                 {copySuccess && <span className="ml-1">{copySuccess}</span>}
//               </button>
//                 )}
//                   </div>
//                   </div>
//                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
//                   <div>
//                 <p className="text-gray-200">Amount:</p>
//                  <p className="text-green-300">{transactionResult.transaction.amount} {transactionResult.transaction.token}</p>
//                  </div>
//                  <div>
//                    <p className="text-gray-200">Recipient:</p>
//                     <p className="text-green-300 font-mono overflow-hidden text-ellipsis max-w-full text-xs sm:text-sm">
//                     {formatTransactionHash(transactionResult.transaction.to)}
//                         </p>
//                   </div>
//                    </div>
//                     </div>
//                   )}
//                 </div>
//                   )}
            
            
            
//             {balanceResult && (
//               <div className="mb-6 p-3 bg-blue-500 bg-opacity-20 rounded">
//                 <p className="text-white text-lg font-medium">Your Balance</p>
//                 <div className="mt-2 max-h-40 overflow-y-auto">
//                   {Array.isArray(balanceResult) ? (
//                     balanceResult.map((item, index) => (
//                       <div key={index} className="flex justify-between text-sm mb-1">
//                         <span className="text-gray-200">{item.token}:</span>
//                         <span className="text-blue-300 font-mono">{item.balance}</span>
//                       </div>
//                     ))
//                   ) : (
//                     formatBalanceItem(balanceResult)
//                   )}
//                 </div>
//               </div>
//             )}
            
            
//             {isSpeaking && (
//               <div className="mb-4 p-2 bg-opacity-0 rounded flex items-center justify-center">
//                 <span className="mr-2">🔊</span>
//                 <span className="text-white">Speaking...</span>
//               </div>
//             )}
            
            
//             <div className="flex space-x-4 justify-center">
//               <button
//                 onClick={handleRecordClick}
//                 className={`flex items-center justify-center p-3 sm:p-4 rounded-full ${
//                   isRecording
//                    ? 'bg-red-500 hover:bg-red-600'
//                    : 'bg-blue-500 hover:bg-blue-600'
//                 } transition-colors w-14 h-14 sm:w-16 sm:h-16`}
//                 disabled={isProcessing || isExecuting || isSpeaking}
//               >
//                 {isRecording ? (
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <rect x="6" y="6" width="12" height="12" strokeWidth="2" stroke="white" fill="white" />
//                   </svg>
//                 ) : (
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
//                   </svg>
//                 )}
//               </button>
              
//               {transcript && !transactionResult && !balanceResult && (commandType !== 'none') && (
//                 <button
//                   onClick={handleExecuteClick}
//                   className="flex items-center justify-center p-3 sm:p-4 rounded-full bg-green-600 hover:bg-green-700 transition-colors w-14 h-14 sm:w-16 sm:h-16"
//                   disabled={isRecording || isProcessing || isExecuting || isSpeaking}
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
//                   </svg>
//                 </button>
//               )}
              
//               {(transcript || error || transactionResult || balanceResult) && (
//                 <button
//                   onClick={handleResetClick}
//                   className="flex items-center justify-center p-3 sm:p-4 rounded-full bg-gray-600 hover:bg-gray-700 transition-colors w-14 h-14 sm:w-16 sm:h-16"
//                   disabled={isRecording || isProcessing || isExecuting}
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 sm:h-8 sm:w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
//                   </svg>
//                 </button>
//               )}
//             </div>
            
//           </div>
//         </main>
//       </div>
//     </div>
//   );
// };

// export default VoiceSessionComponent;


