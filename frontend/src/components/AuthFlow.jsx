import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import AuthModalShell from './AuthModalShell';
import VerifyEmail from '../pages/VerifyEmail';
import Onboarding from '../pages/Onboarding';

export default function AuthFlow() {
  const location = useLocation();
  const navigate = useNavigate();

  const isOnboarding = location.pathname === '/onboarding';

  const handleVerified = () => {
    navigate('/onboarding', {
      replace: true,
      state: {
        fromVerification: true,
      },
    });
  };

  const handleCompleted = () => {
    navigate('/dashboard', {
      replace: true,
    });
  };

  return (
    <AuthModalShell
      stage={isOnboarding ? 'profile' : 'verify'}
      visualEyebrow={
        isOnboarding
          ? 'BUILD YOUR LEGACY'
          : 'SECURE YOUR LEGACY'
      }
      visualTitle={
        isOnboarding ? (
          <>
            Make it
            <br />
            yours.
          </>
        ) : (
          <>
            Your legacy
            <br />
            starts here.
          </>
        )
      }
      visualDescription={
        isOnboarding
          ? 'A few details help us shape your DigiVirasat experience and prepare the space where your legacy will live.'
          : 'Before you begin building your digital legacy, we need to make sure your account belongs to you.'
      }
      visualBadge={
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            marginTop: 24,
            padding: '7px 10px',
            border: '1px solid rgba(255,255,255,.1)',
            borderRadius: 9,
            background: 'rgba(255,255,255,.055)',
            color: '#c5cec7',
            fontSize: 9,
            fontWeight: 650,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#91aa98',
              boxShadow:
                '0 0 0 4px rgba(145,170,152,.08)',
            }}
          />

          {isOnboarding
            ? 'Your private space is ready'
            : 'Your journey is being prepared'}
        </div>
      }
      visualFooter={
        <>
          <span className="visualFooterIcon">
            <ShieldCheck size={13} />
          </span>

          <span>
            {isOnboarding
              ? 'Designed around your privacy.'
              : 'Protected by DigiVirasat'}
          </span>
        </>
      }
    >
      {isOnboarding ? (
        <Onboarding onCompleted={handleCompleted} />
      ) : (
        <VerifyEmail onVerified={handleVerified} />
      )}
    </AuthModalShell>
  );
}