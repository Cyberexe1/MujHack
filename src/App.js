// Component inspired by github.com/zavalit/bayer-dithering-webgl-demo
import React from 'react';
import PixelBlast from './PixelBlast';
import './App.css';

// Function to detect if device is mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
};

// Download function
const handleDownload = (cardType) => {
  const isMobile = isMobileDevice();
  let filename, url;

  if (cardType === 'desktop') {
    filename = isMobile ? 'd2.zip' : 'd1.zip';
    url = isMobile ? './d2.zip' : './d1.zip';
  } else if (cardType === 'mobile') {
    filename = isMobile ? 'd2.zip' : 'd1.zip';
    url = isMobile ? './d2.zip' : './d1.zip';
  }

  // Create download link
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

function App() {
  return (
    <div className="App">
      {/* Full Background PixelBlast */}
      <div className="app-background">
        <PixelBlast
          variant="circle"
          pixelSize={6}
          color="#B19EEF"
          patternScale={5}
          patternDensity={3.2}
          pixelSizeJitter={0.5}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.6}
          edgeFade={0.25}
          transparent
        />
      </div>

      {/* All Content Above Background */}
      <div className="app-content">
        <nav className="nav">
          <div className="nav-content">
            <div className="logo">KAVACH</div>
            <div className="nav-links">
              <a href="#home">Home</a>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
            </div>
          </div>
        </nav>

        <main className="main-content">
          <div className="cards-section">
            <div className="cards-grid">
              <div className="glass-card">
                <div className="card-image">
                  <div className="image-placeholder desktop-icon">
                    <svg width="180" height="180" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="4" width="20" height="12" rx="2" stroke="#B19EEF" strokeWidth="2" fill="rgba(177, 158, 239, 0.1)" />
                      <rect x="8" y="16" width="8" height="2" rx="1" fill="#B19EEF" />
                      <rect x="6" y="18" width="12" height="2" rx="1" fill="#B19EEF" />
                    </svg>
                  </div>
                </div>
                <div className="card-content">
                  <h3>Desktop Solutions</h3>
                  <p>The KAVACH Desktop Console empowers field administrators with real-time, secure, offline communication and adaptive network intelligence.</p>
                  <button className="card-button" onClick={() => handleDownload('desktop')}>Download</button>
                </div>
              </div>

              <div className="glass-card">
                <div className="card-image">
                  <div className="image-placeholder tablet-icon">
                    <svg width="120" height="120" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="5" y="2" width="14" height="20" rx="3" stroke="#B19EEF" strokeWidth="2" fill="rgba(177, 158, 239, 0.1)" />
                      <circle cx="12" cy="19" r="1" fill="#B19EEF" />
                    </svg>
                  </div>
                </div>
                <div className="card-content">
                  <h3>Mobile Experience</h3>
                  <p>The KAVACH Mobile App keeps soldiers and responders linked through a self-healing, encrypted mesh — no internet required.</p>
                  <button className="card-button" onClick={() => handleDownload('mobile')}>Download</button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;