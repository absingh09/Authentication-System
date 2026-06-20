import React from 'react';
import { ShieldCheck, Mail, User, KeyRound, Calendar, Activity } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import { getProfilePicUrl } from '../api/authApi';

export default function Dashboard() {
  const { user } = useAuthStore();

  const mockActivities = [
    { id: 1, action: 'User logged in', device: 'Chrome / Windows', time: 'Just now' },
    { id: 2, action: 'Profile settings updated', device: 'Safari / iPhone', time: '2 hours ago' },
    { id: 3, action: 'New login session created', device: 'Firefox / macOS', time: 'Yesterday' }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 p-6 md:p-8 rounded-2xl border border-blue-500/15">
        <div className="flex items-center space-x-4">
          <Avatar src={getProfilePicUrl(user?.profile_pic)} name={user?.username} size="lg" />
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {user?.username || 'User'}!
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">
              Manage your profile details, settings, and sessions from this panel.
            </p>
          </div>
        </div>
        <div className="self-start md:self-auto inline-flex items-center px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
          <ShieldCheck size={14} className="mr-1.5 shrink-0" />
          <span>Active Session</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="col-span-1 md:col-span-2 space-y-6">
          <h2 className="text-base font-bold text-slate-950 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
            Account Information
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <User size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-455 text-slate-400 font-bold uppercase tracking-wider block">Username</span>
                <span className="text-sm text-slate-905 dark:text-white font-bold block truncate">{user?.username}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <Mail size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</span>
                <span className="text-sm text-slate-900 dark:text-white font-bold block truncate">{user?.email}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <KeyRound size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Account ID</span>
                <span className="text-xs text-slate-900 dark:text-white font-mono block truncate">{user?.id}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Auth Status</span>
                <span className="text-sm text-blue-650 dark:text-blue-400 font-extrabold block">JWT Verified</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Security Overview */}
        <Card className="space-y-4">
          <h2 className="text-base font-bold text-slate-950 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
            Security Overview
          </h2>
          <div className="space-y-4">
            <div className="p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <h4 className="text-xs font-bold text-slate-805 dark:text-slate-200">Two-Factor Auth</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">Enhance login protection with secondary SMS or authenticator codes.</p>
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 mt-2 block hover:underline cursor-pointer">Configure 2FA</span>
            </div>
            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/10">
              <h4 className="text-xs font-bold text-slate-805 dark:text-slate-200">Password Strength</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-semibold leading-relaxed">Your current password aligns with strict security checklist rules.</p>
              <span className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400 mt-2 block">Check Completed</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Activity Card */}
      <Card className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
          <h2 className="text-base font-bold text-slate-950 dark:text-white flex items-center">
            <Activity size={18} className="mr-2 text-slate-400" />
            Recent Activity
          </h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-lg">Last 3 events</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {mockActivities.map((act) => (
            <div key={act.id} className="flex justify-between items-center py-3 first:pt-0 last:pb-0">
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{act.action}</p>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">{act.device}</p>
              </div>
              <span className="text-xs font-semibold text-slate-400">{act.time}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
