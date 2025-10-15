import React, { useEffect, useState } from 'react';

interface StartupAnimationProps {
  logoUrl: string | null;
  onAnimationComplete: () => void;
}

const StartupAnimation: React.FC<StartupAnimationProps> = ({ logoUrl, onAnimationComplete }) => {
  const [phase, setPhase] = useState<'entering' | 'exiting'>('entering');

  useEffect(() => {
    // Start the fade-out animation after 3 seconds
    const timer1 = setTimeout(() => {
      setPhase('exiting');
    }, 3000);

    // Call the completion callback after 4 seconds (allowing 1 second for the fade-out)
    const timer2 = setTimeout(() => {
      onAnimationComplete();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onAnimationComplete]);

  const containerClasses = `
    fixed inset-0 bg-gray-900 flex flex-col items-center justify-center z-50
    transition-opacity duration-1000
    ${phase === 'exiting' ? 'opacity-0' : 'opacity-100'}
  `;

  return (
    <div className={containerClasses}>
      <div className="flex flex-col items-center justify-center animate-fade-in-scale">
        {logoUrl ? (
          <img src={logoUrl} alt="Smart Movie Creator Logo" className="h-24 w-24 mb-4" />
        ) : (
          // Show a placeholder if the logo is still generating
          <div className="h-24 w-24 mb-4 bg-gray-700 rounded-lg animate-pulse"></div>
        )}
        <h2 
          className="text-2xl font-semibold text-gray-300 tracking-wider animate-fade-in-subtle"
          style={{ animationDelay: '0.5s' }} // Delay the tagline's appearance slightly
        >
          Your Script. Our AI. Cinematic Magic.
        </h2>
      </div>
    </div>
  );
};

export default StartupAnimation;
