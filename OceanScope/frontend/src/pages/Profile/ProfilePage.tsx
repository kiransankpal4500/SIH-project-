/**
 * OceanScope User Profile Page
 * Displays authenticated researcher credentials, verification status,
 * provider metadata, and allows editing profile details in Firebase Auth & Firestore users/{uid}.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getUserProfile, updateUserProfileData, UserProfileData } from '../../services/userService';
import {
  User,
  Mail,
  Building,
  Briefcase,
  Globe2,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Edit3,
  Save,
  X,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { currentUser, updateUserProfile, resendVerificationEmail, logout } = useAuth();

  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form edit states
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editOrg, setEditOrg] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editRegion, setEditRegion] = useState('Indian Ocean');
  const [editVariable, setEditVariable] = useState('temperature');

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [verificationSent, setVerificationSent] = useState(false);

  // Fetch Firestore user metadata on mount or when user changes
  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      if (!currentUser) return;
      setLoading(true);

      try {
        const data = await getUserProfile(currentUser.uid);
        if (isMounted) {
          setProfileData(data);
          setEditName(currentUser.displayName || data?.displayName || '');
          setEditRole(data?.role || 'Marine Researcher');
          setEditOrg(data?.organization || '');
          setEditBio(data?.bio || '');
          setEditRegion(data?.preferredRegion || 'Indian Ocean');
          setEditVariable(data?.preferredVariable || 'temperature');
        }
      } catch (err) {
        console.error('[ProfilePage] Error loading profile:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    setNotification(null);

    try {
      // 1. Update Firebase Auth displayName
      if (editName.trim() !== currentUser.displayName) {
        await updateUserProfile(editName.trim());
      }

      // 2. Update Firestore users/{uid} document
      await updateUserProfileData(currentUser.uid, {
        displayName: editName.trim(),
        role: editRole.trim(),
        organization: editOrg.trim(),
        bio: editBio.trim(),
        preferredRegion: editRegion,
        preferredVariable: editVariable,
      });

      // 3. Update local state
      setProfileData((prev) => ({
        ...prev,
        uid: currentUser.uid,
        email: currentUser.email || '',
        displayName: editName.trim(),
        role: editRole.trim(),
        organization: editOrg.trim(),
        bio: editBio.trim(),
        preferredRegion: editRegion,
        preferredVariable: editVariable,
      }));

      setIsEditing(false);
      setNotification({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      console.error('[ProfilePage] Save failed:', err);
      setNotification({ type: 'error', message: err?.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      await resendVerificationEmail();
      setVerificationSent(true);
      setNotification({
        type: 'success',
        message: 'A fresh verification link has been sent to your email inbox.',
      });
    } catch (err: any) {
      setNotification({
        type: 'error',
        message: err?.message || 'Could not send verification email at this time.',
      });
    }
  };

  if (!currentUser) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-9 h-9 text-[#0B84C6] animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading OceanScope profile...</p>
      </div>
    );
  }

  // Generate fallback initials
  const initials = (currentUser.displayName || currentUser.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const providerId = currentUser.providerData[0]?.providerId || 'password';
  const isGoogle = providerId.includes('google');

  // Format dates cleanly
  const creationDate = currentUser.metadata.creationTime
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : 'Unknown';

  const lastSignInDate = currentUser.metadata.lastSignInTime
    ? new Date(currentUser.metadata.lastSignInTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Unknown';

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`mb-6 flex items-start justify-between gap-3 p-4 rounded-xl text-sm border shadow-sm ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {/* Banner */}
        <div className="h-28 bg-gradient-to-r from-[#0B84C6] to-[#034C73] relative"></div>

        {/* Profile Header Details */}
        <div className="px-6 sm:px-8 pb-6 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-end justify-between -mt-14 mb-4 gap-4">
            {/* Avatar */}
            <div className="relative">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User Avatar'}
                  className="w-24 h-24 rounded-2xl border-4 border-white object-cover shadow-md bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl border-4 border-white bg-[#0B84C6] text-white flex items-center justify-center font-bold text-2xl shadow-md">
                  {initials}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors shadow-sm"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              )}

              <button
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-semibold transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* User Name & Badges */}
          <div className="space-y-1 text-center sm:text-left">
            <h1 className="text-2xl font-bold text-slate-900">
              {currentUser.displayName || 'OceanScope Researcher'}
            </h1>
            <p className="text-sm text-slate-500 font-medium">
              {profileData?.role || 'Marine Researcher'} {profileData?.organization ? `• ${profileData.organization}` : ''}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
              {/* Verification Badge */}
              {currentUser.emailVerified ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Email Verified
                </span>
              ) : (
                <div className="inline-flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Unverified
                  </span>
                  {!verificationSent && (
                    <button
                      onClick={handleResendVerification}
                      className="text-xs text-[#0B84C6] hover:underline font-medium"
                    >
                      Resend Link
                    </button>
                  )}
                </div>
              )}

              {/* Provider Badge */}
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                {isGoogle ? 'Google Account' : 'Email & Password'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Form / View Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Account Details (Read-only) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm h-fit">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Account Metadata</h2>
          
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Email Address</p>
                <p className="text-slate-500 break-all">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-600">
              <Calendar className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Joined</p>
                <p className="text-slate-500">{creationDate}</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-900">Last Sign-in</p>
                <p className="text-slate-500">{lastSignInDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right 2 Columns: Editable Researcher Attributes */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-6">
            {isEditing ? 'Edit Researcher Information' : 'Researcher Profile'}
          </h2>

          {!isEditing ? (
            <div className="space-y-6 text-sm">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Biography & Research Focus
                </p>
                <p className="text-slate-700 leading-relaxed">
                  {profileData?.bio || 'No biography or research focus has been added yet.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Institution / Organization
                  </p>
                  <p className="text-slate-800 font-medium">{profileData?.organization || 'Not specified'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Specialization Role
                  </p>
                  <p className="text-slate-800 font-medium">{profileData?.role || 'Marine Researcher'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Primary Observation Focus
                  </p>
                  <p className="text-slate-800 font-medium">{profileData?.preferredRegion || 'Indian Ocean'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Primary Variable
                  </p>
                  <p className="text-slate-800 font-medium capitalize">
                    {profileData?.preferredVariable?.replace('_', ' ') || 'Temperature'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B84C6] text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Specialization Role
                  </label>
                  <input
                    type="text"
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    placeholder="e.g. Physical Oceanographer"
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B84C6] text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Institution / Organization
                </label>
                <input
                  type="text"
                  value={editOrg}
                  onChange={(e) => setEditOrg(e.target.value)}
                  placeholder="e.g. National Institute of Oceanography"
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B84C6] text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Biography & Research Focus
                </label>
                <textarea
                  rows={3}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Summarize your oceanographic research or modeling focus..."
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B84C6] text-slate-900"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preferred Focus Region
                  </label>
                  <select
                    value={editRegion}
                    onChange={(e) => setEditRegion(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B84C6] text-slate-900"
                  >
                    <option value="Indian Ocean">Indian Ocean</option>
                    <option value="Arabian Sea">Arabian Sea</option>
                    <option value="Bay of Bengal">Bay of Bengal</option>
                    <option value="Equatorial Indian Ocean">Equatorial Indian Ocean</option>
                    <option value="Global Ocean">Global Ocean</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Preferred Variable
                  </label>
                  <select
                    value={editVariable}
                    onChange={(e) => setEditVariable(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B84C6] text-slate-900"
                  >
                    <option value="temperature">Temperature (°C)</option>
                    <option value="salinity">Salinity (PSU)</option>
                    <option value="current_velocity">Current Velocity (m/s)</option>
                    <option value="chlorophyll">Chlorophyll-a (mg/m³)</option>
                    <option value="sea_surface_height">Sea Surface Height (m)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#0B84C6] hover:bg-[#0973AD] text-white text-xs font-semibold transition-colors shadow-sm disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
