import React, { useRef, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Upload, Trash2, ShieldAlert, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../modules/auth/hooks/useAuth';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import { getProfilePicUrl } from '../api/authApi';

export default function Settings() {
  const { user, updateProfile, uploadProfilePic, logout } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Forms
  const { register: profileRegister, handleSubmit: handleProfileSubmit, reset: resetProfile, formState: { errors: profileErrors } } = useForm({
    defaultValues: { username: user?.username }
  });

  const { register: passRegister, handleSubmit: handlePassSubmit, watch: watchPass, reset: resetPass, formState: { errors: passErrors } } = useForm();

  // Watch password for strength check
  const newPassword = watchPass('newPassword', '');
  const [strength, setStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    score: 0
  });

  useEffect(() => {
    const hasLength = newPassword?.length >= 8;
    const hasUppercase = /[A-Z]/.test(newPassword || '');
    const hasNumber = /[0-9]/.test(newPassword || '');

    let score = 0;
    if (hasLength) score += 1;
    if (hasUppercase) score += 1;
    if (hasNumber) score += 1;

    setStrength({
      length: hasLength,
      uppercase: hasUppercase,
      number: hasNumber,
      score: score
    });
  }, [newPassword]);

  // Sync profile form when user loads
  useEffect(() => {
    if (user) {
      resetProfile({ username: user.username });
    }
  }, [user, resetProfile]);

  const onUpdateProfile = async (data) => {
    setIsUpdatingProfile(true);
    const result = await updateProfile({ username: data.username });
    setIsUpdatingProfile(false);
    
    if (result.success) {
      toast.success('Username updated successfully!');
    } else {
      toast.error(result.error);
    }
  };

  const onUpdatePassword = async (data) => {
    if (strength.score < 3) {
      toast.error('New password is too weak.');
      return;
    }

    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsUpdatingPassword(true);
    const result = await updateProfile({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword
    });
    setIsUpdatingPassword(false);

    if (result.success) {
      toast.success('Password changed successfully!');
      resetPass({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } else {
      toast.error(result.error);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max size is 5MB.');
      return;
    }

    // Validate extension
    const allowed = ['.jpg', '.jpeg', '.png', '.gif'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error('Invalid file type. Only JPG, PNG, and GIF are allowed.');
      return;
    }

    setIsUploading(true);
    const result = await uploadProfilePic(file);
    setIsUploading(false);

    if (result.success) {
      toast.success('Profile picture updated!');
    } else {
      toast.error(result.error);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleteModalOpen(false);
    toast.loading('Deleting account (Mock)...');
    
    // Simulate API delay
    setTimeout(async () => {
      toast.dismiss();
      toast.success('Account deleted successfully (Mocked)!');
      await logout();
      navigate('/login');
    }, 1500);
  };

  const getStrengthColor = () => {
    if (strength.score === 1) return 'bg-red-500';
    if (strength.score === 2) return 'bg-amber-500';
    if (strength.score === 3) return 'bg-emerald-500';
    return 'bg-slate-200 dark:bg-slate-800';
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
        Account Settings
      </h1>

      {/* Profile Picture Upload Card */}
      <Card className="flex flex-col sm:flex-row items-center gap-6">
        <div className="relative group shrink-0">
          <Avatar
            src={getProfilePicUrl(user?.profile_pic)}
            name={user?.username}
            size="xl"
            isLoading={isUploading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 rounded-full bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer"
            disabled={isUploading}
          >
            <Upload size={20} />
          </button>
        </div>

        <div className="text-center sm:text-left space-y-2">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Profile Photo</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            Upload a JPG, PNG, or GIF file. Max size 5MB.
          </p>
          <div className="flex justify-center sm:justify-start gap-3 mt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".jpg,.jpeg,.png,.gif"
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              className="py-1.5 px-3 w-auto"
            >
              Upload Photo
            </Button>
          </div>
        </div>
      </Card>

      {/* Update Info Form */}
      <Card>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-2.5 border-b border-slate-100 dark:border-white/5">
          General Details
        </h3>
        <form onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-4">
          <Input
            label="Full Name"
            id="username"
            type="text"
            placeholder="John Doe"
            icon={User}
            error={profileErrors.username?.message}
            {...profileRegister('username', { required: 'Name is required' })}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={isUpdatingProfile} className="w-auto px-6 py-2">
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Update Password Form */}
      <Card>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pb-2.5 border-b border-slate-100 dark:border-white/5">
          Security & Password
        </h3>
        <form onSubmit={handlePassSubmit(onUpdatePassword)} className="space-y-4">
          <Input
            label="Current Password"
            id="currentPassword"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={passErrors.currentPassword?.message}
            {...passRegister('currentPassword', { required: 'Current password is required' })}
          />

          <div>
            <Input
              label="New Password"
              id="newPassword"
              type="password"
              placeholder="••••••••"
              icon={Lock}
              error={passErrors.newPassword?.message}
              {...passRegister('newPassword', {
                required: 'New password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters'
                }
              })}
            />

            {newPassword?.length > 0 && (
              <div className="mt-2.5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span>Password Strength</span>
                  <span className={
                    strength.score === 1 ? 'text-red-500' :
                    strength.score === 2 ? 'text-amber-500' :
                    strength.score === 3 ? 'text-emerald-500' : ''
                  }>
                    {strength.score === 1 ? 'Weak' : strength.score === 2 ? 'Medium' : strength.score === 3 ? 'Strong' : ''}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                    style={{ width: `${(strength.score / 3) * 100}%` }}
                  />
                </div>
                
                {/* Requirements Checklist */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <div className="flex items-center space-x-1 text-[10px] font-bold">
                    {strength.length ? (
                      <Check size={11} className="text-emerald-500 shrink-0" />
                    ) : (
                      <X size={11} className="text-red-500 shrink-0" />
                    )}
                    <span className={strength.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>8+ chars</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-bold">
                    {strength.uppercase ? (
                      <Check size={11} className="text-emerald-500 shrink-0" />
                    ) : (
                      <X size={11} className="text-red-500 shrink-0" />
                    )}
                    <span className={strength.uppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>1 upper</span>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] font-bold">
                    {strength.number ? (
                      <Check size={11} className="text-emerald-500 shrink-0" />
                    ) : (
                      <X size={11} className="text-red-500 shrink-0" />
                    )}
                    <span className={strength.number ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>1 number</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Input
            label="Confirm New Password"
            id="confirmPassword"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={passErrors.confirmPassword?.message}
            {...passRegister('confirmPassword', {
              required: 'Please confirm your new password',
              validate: (val) => {
                if (watchPass('newPassword') !== val) {
                  return 'Passwords do not match';
                }
              }
            })}
          />

          <div className="flex justify-end">
            <Button type="submit" isLoading={isUpdatingPassword} className="w-auto px-6 py-2">
              Update Password
            </Button>
          </div>
        </form>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-500/20 dark:bg-red-500/5">
        <h3 className="text-base font-bold text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-4 leading-relaxed">
          Irreversibly delete your SaaS account, logs, and files. This process cannot be undone.
        </p>
        <div className="flex justify-start">
          <Button
            variant="danger"
            onClick={() => setIsDeleteModalOpen(true)}
            className="w-auto px-5 py-2 flex items-center"
          >
            <Trash2 size={16} className="mr-2" />
            Delete Account
          </Button>
        </div>
      </Card>

      {/* Delete Account Warning Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Confirm Account Deletion"
      >
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400">
            <ShieldAlert size={20} className="shrink-0 animate-bounce" />
            <span className="text-xs font-bold">Warning: This action is permanent!</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
            Are you absolutely sure you want to delete your account? All database records, user profiles, and photos will be deleted.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setIsDeleteModalOpen(false)}
              className="w-auto px-4"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              className="w-auto px-5"
            >
              Yes, Delete Account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
