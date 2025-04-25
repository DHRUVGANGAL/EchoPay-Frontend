// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import LandingPage from './components/LandingPage';
// import AddAccount from './components/AddAccount';
// import VoiceSessionComponent from './components/VoiceSessionComponent';

// function App() {

//   const apiKey = import.meta.env.REACT_APP_OPENAI_API_KEY;
 
  
//   return (
//     <Router>
//       <div className="app">
//         <Routes>
//           <Route path="/" element={<LandingPage />} />
//           <Route path="/add-account" element={<AddAccount />} />
//           <Route path="/voice-session" element={<VoiceSessionComponent apiKey={apiKey} />} />
//         </Routes>
//       </div>
//     </Router>
//   );
// }

// export default App;


import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import AddAccount from './components/AddAccount';
import VoiceSessionComponent from './components/VoiceSessionComponent';

function App() {
  // You can store your OpenAI API key in environment variables
  const apiKey =import.meta.env.VITE_OPENAI_API_KEY;
  
  return (
    <Router>
      <div className="app">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/add-account" element={<AddAccount />} />
          <Route path="/voice-session" element={<VoiceSessionComponent apiKey={apiKey} />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;