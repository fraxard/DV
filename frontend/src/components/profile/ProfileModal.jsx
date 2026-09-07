import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Camera,
  UploadCloud,
  Check,
  AlertCircle,
  Loader2,
  Mail,
  User,
  ArrowLeft,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Calendar,
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import { useAuth } from '../../context/AuthContext';
import { getAvatarUrl } from '../../utils/avatar';
import styles from './ProfileModal.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not create canvas context');
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas image creation failed'));
          return;
        }
        resolve(blob);
      },
      'image/jpeg',
      0.92
    );
  });
}

export default function ProfileModal({ isOpen, onClose }) {
  const { user, updateUser } = useAuth();

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [croppedBlob, setCroppedBlob] = useState(null);

  // Cropper states
  const [imageToCrop, setImageToCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);

  // OTP step states
  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [pendingEmail, setPendingEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const otpInputRef = useRef(null);

  // Initialize fields when modal opens
  useEffect(() => {
    if (isOpen && user) {
      setName(user.name || user.full_name || '');
      setEmail(user.email || '');
      setDateOfBirth(user.date_of_birth || '');
      setGender(user.gender || '');
      setAvatarPreview(user.avatar_url ? getAvatarUrl(user.avatar_url) : null);
      setCroppedBlob(null);
      setImageToCrop(null);
      setIsCropping(false);
      setStep('details');
      setPendingEmail('');
      setOtpCode('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, user]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        if (isCropping) {
          setIsCropping(false);
          setImageToCrop(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, isCropping, onClose]);

  // Resend countdown timer
  useEffect(() => {
    let timer;
    if (resendCountdown > 0) {
      timer = setTimeout(() => setResendCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Focus OTP input when entering OTP step
  useEffect(() => {
    if (step === 'otp' && otpInputRef.current) {
      otpInputRef.current.focus();
    }
  }, [step]);

  const onCropComplete = useCallback((croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileSelect = (e) => {
    setError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset file input value so same file can be re-selected if cancelled
    e.target.value = '';

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setError('Unsupported file type. Please upload a JPG, PNG, or WebP image.');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('Image file is too large. Maximum size is 10 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handleApplyCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    try {
      setLoading(true);
      setError('');
      const blob = await getCroppedImg(imageToCrop, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(blob);
      setCroppedBlob(blob);
      setAvatarPreview(previewUrl);
      setIsCropping(false);
      setImageToCrop(null);
    } catch (err) {
      console.error('Cropping error:', err);
      setError('Failed to crop image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setImageToCrop(null);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError('Full name is required.');
      return;
    }

    if (!trimmedEmail) {
      setError('Email address is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    const isEmailChanged = trimmedEmail !== (user?.email || '').toLowerCase();
    const isNameChanged = trimmedName !== (user?.name || user?.full_name || '');
    const isDobChanged = (dateOfBirth || '') !== (user?.date_of_birth || '');
    const isGenderChanged = (gender || '') !== (user?.gender || '');
    const isAvatarChanged = Boolean(croppedBlob);

    if (!isEmailChanged && !isNameChanged && !isDobChanged && !isGenderChanged && !isAvatarChanged) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      let updatedUserData = { ...user };

      // 1. If avatar changed, upload it
      if (isAvatarChanged && croppedBlob) {
        const formData = new FormData();
        formData.append('avatar', croppedBlob, 'avatar.jpg');

        const avatarRes = await fetch(`${API_URL}/auth/profile/avatar`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });

        const avatarData = await avatarRes.json();
        if (!avatarRes.ok) {
          throw new Error(avatarData?.error?.message || 'Failed to upload profile picture.');
        }

        updatedUserData = avatarData.user;
        updateUser(avatarData.user);
        setCroppedBlob(null);
      }

      // 2. If name, DOB, or gender changed, update profile
      if (isNameChanged || isDobChanged || isGenderChanged) {
        const profileRes = await fetch(`${API_URL}/auth/profile`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: trimmedName,
            dateOfBirth: dateOfBirth || null,
            gender: gender || null,
          }),
        });

        const profileData = await profileRes.json();
        if (!profileRes.ok) {
          throw new Error(profileData?.error?.message || 'Failed to update profile details.');
        }

        updatedUserData = profileData.user;
        updateUser(profileData.user);
      }

      // 3. If email changed, initiate OTP verification
      if (isEmailChanged) {
        const otpReqRes = await fetch(`${API_URL}/auth/profile/request-email-change`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ newEmail: trimmedEmail }),
        });

        const otpReqData = await otpReqRes.json();
        if (!otpReqRes.ok) {
          throw new Error(otpReqData?.error?.message || 'Failed to initiate email verification.');
        }

        setPendingEmail(trimmedEmail);
        setStep('otp');
        setResendCountdown(60);
        setSuccessMsg(`Verification code sent to ${trimmedEmail}`);
      } else {
        // No email change — complete
        setSuccessMsg('Profile updated successfully.');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err) {
      console.error('Profile save error:', err);
      setError(err.message || 'An error occurred while saving profile.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanToken = otpCode.trim();
    if (!cleanToken || cleanToken.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/auth/profile/verify-email-change`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: cleanToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Verification failed. Please check the code.');
      }

      updateUser(data.user);
      setSuccessMsg('Email updated and verified successfully.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      console.error('OTP verification error:', err);
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || loading) return;

    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_URL}/auth/profile/resend-email-change`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to resend code.');
      }

      setResendCountdown(60);
      setSuccessMsg(`A new code was sent to ${pendingEmail}`);
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fallbackInitial = (name || user?.name || user?.full_name || 'A')
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <div
      className={styles.modalOverlay}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          if (isCropping) handleCancelCrop();
          else onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profileModalTitle"
    >
      <div className={styles.modalContainer} ref={modalRef}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitles}>
            <span className={styles.kicker}>WORKSPACE</span>
            <h2 id="profileModalTitle">
              {isCropping
                ? 'Crop Profile Picture'
                : step === 'otp'
                ? 'Verify New Email'
                : 'Profile Settings'}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => {
              if (isCropping) handleCancelCrop();
              else onClose();
            }}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        {/* Global Notifications */}
        {error && (
          <div className={styles.alertError} role="alert">
            <AlertCircle size={14} className={styles.alertIcon} />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className={styles.alertSuccess} role="status">
            <Check size={14} className={styles.alertIcon} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Sub-view: Image Cropper */}
        {isCropping ? (
          <div className={styles.cropperWrapper}>
            <div className={styles.cropAreaContainer}>
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>

            <div className={styles.cropperControls}>
              <div className={styles.zoomBar}>
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                  aria-label="Zoom out"
                >
                  <ZoomOut size={13} />
                </button>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className={styles.zoomSlider}
                  aria-label="Zoom level"
                />
                <button
                  type="button"
                  className={styles.zoomBtn}
                  onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
                  aria-label="Zoom in"
                >
                  <ZoomIn size={13} />
                </button>
              </div>

              <div className={styles.cropperActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={handleCancelCrop}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={handleApplyCrop}
                  disabled={loading}
                >
                  {loading ? <Loader2 size={13} className={styles.spinner} /> : 'Apply Crop'}
                </button>
              </div>
            </div>
          </div>
        ) : step === 'otp' ? (
          /* Sub-view: Email OTP Verification */
          <form onSubmit={handleVerifyOtp} className={styles.otpForm}>
            <div className={styles.otpIntro}>
              <div className={styles.otpIconBadge}>
                <Mail size={18} />
              </div>
              <p>
                We have sent a 6-digit confirmation code to{' '}
                <strong>{pendingEmail}</strong>. Please enter the code below to verify and complete your email change.
              </p>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="otpCodeInput">6-Digit Verification Code</label>
              <input
                id="otpCodeInput"
                ref={otpInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className={styles.otpInput}
                autoComplete="one-time-code"
                required
              />
            </div>

            <div className={styles.resendRow}>
              <span>Didn't receive the email?</span>
              <button
                type="button"
                className={styles.resendBtn}
                onClick={handleResendOtp}
                disabled={resendCountdown > 0 || loading}
              >
                {resendCountdown > 0
                  ? `Resend in ${resendCountdown}s`
                  : 'Resend code'}
              </button>
            </div>

            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => {
                  setStep('details');
                  setError('');
                  setSuccessMsg('');
                }}
                disabled={loading}
              >
                <ArrowLeft size={13} /> Back
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={loading || otpCode.length !== 6}
              >
                {loading ? (
                  <span className={styles.btnContent}>
                    <Loader2 size={13} className={styles.spinner} /> Verifying...
                  </span>
                ) : (
                  'Verify & Update Email'
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Sub-view: Profile Details & Avatar */
          <form onSubmit={handleSaveDetails} className={styles.detailsForm}>
            {/* Avatar Section */}
            <div className={styles.avatarSection}>
              <div className={styles.avatarWrapper}>
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={name || 'User avatar'}
                    className={styles.avatarImg}
                  />
                ) : (
                  <div className={styles.avatarFallback}>{fallbackInitial}</div>
                )}
                <button
                  type="button"
                  className={styles.avatarChangeBadge}
                  onClick={() => fileInputRef.current?.click()}
                  title="Change photo"
                  aria-label="Change photo"
                >
                  <Camera size={13} />
                </button>
              </div>

              <div className={styles.avatarInfo}>
                <button
                  type="button"
                  className={styles.changePhotoBtn}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change photo
                </button>
                <span className={styles.avatarHint}>
                  JPG, PNG or WebP. Square crop recommended.
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={styles.hiddenFileInput}
                  onChange={handleFileSelect}
                  aria-label="Upload profile image"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className={styles.formGroup}>
              <label htmlFor="profileNameInput">Full Name</label>
              <div className={styles.inputWithIcon}>
                <User size={14} className={styles.fieldIcon} />
                <input
                  id="profileNameInput"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your full name"
                  className={styles.formInput}
                  required
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="profileEmailInput">Email Address</label>
              <div className={styles.inputWithIcon}>
                <Mail size={14} className={styles.fieldIcon} />
                <input
                  id="profileEmailInput"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className={styles.formInput}
                  required
                />
              </div>
              <span className={styles.fieldHint}>
                Changing your email will require 6-digit OTP verification before taking effect.
              </span>
            </div>

            {/* Date of Birth and Gender Row */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="profileDobInput">Date of Birth</label>
                <div className={styles.inputWithIcon}>
                  <Calendar size={14} className={styles.fieldIcon} />
                  <input
                    id="profileDobInput"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className={styles.formInput}
                    max={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="profileGenderInput">Gender</label>
                <select
                  id="profileGenderInput"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className={styles.formSelect}
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={styles.primaryBtn}
                disabled={loading}
              >
                {loading ? (
                  <span className={styles.btnContent}>
                    <Loader2 size={13} className={styles.spinner} /> Saving...
                  </span>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
