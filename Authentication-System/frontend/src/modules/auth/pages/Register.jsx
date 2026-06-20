import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { User, Mail, Lock, UserPlus, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function Register() {
  const { register: registerUser, isLoading } = useAuth();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  
  const password = watch('password', '');
  const [strength, setStrength] = useState({
    length: false,
    uppercase: false,
    number: false,
    score: 0
  });

  useEffect(() => {
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

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
  }, [password]);

  const onSubmit = async (data) => {
    if (strength.score < 3) {
      toast.error('Please meet all password strength requirements.');
      return;
    }

    if (data.password !== data.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    const result = await registerUser(data.username, data.email, data.password);
    if (result.success) {
      toast.success(result.message || 'Account created successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    } else {
      toast.error(result.error);
    }
  };

  const getStrengthColor = () => {
    if (strength.score === 1) return 'bg-red-500';
    if (strength.score === 2) return 'bg-amber-500';
    if (strength.score === 3) return 'bg-emerald-500';
    return 'bg-slate-200 dark:bg-slate-800';
  };

  const getStrengthText = () => {
    if (strength.score === 1) return 'Weak';
    if (strength.score === 2) return 'Medium';
    if (strength.score === 3) return 'Strong';
    return 'Too Short';
  };

  return (
    <Card className="shadow-2xl">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Create an account
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-semibold">
          Get started with your free SaaS account today
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          id="username"
          type="text"
          placeholder="John Doe"
          icon={User}
          error={errors.username?.message}
          {...register('username', { required: 'Name is required' })}
        />

        <Input
          label="Email Address"
          id="email"
          type="email"
          placeholder="name@example.com"
          icon={Mail}
          error={errors.email?.message}
          {...register('email', {
            required: 'Email is required',
            pattern: {
              value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
              message: 'Invalid email address',
            },
          })}
        />

        <div>
          <Input
            label="Password"
            id="password"
            type="password"
            placeholder="••••••••"
            icon={Lock}
            error={errors.password?.message}
            {...register('password', { required: 'Password is required' })}
          />

          {/* Password Strength Meter */}
          {password.length > 0 && (
            <div className="mt-2.5 space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Password Strength</span>
                <span className={
                  strength.score === 1 ? 'text-red-500' :
                  strength.score === 2 ? 'text-amber-500' :
                  strength.score === 3 ? 'text-emerald-500' : ''
                }>
                  {getStrengthText()}
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
          label="Confirm Password"
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword', {
            required: 'Please confirm your password',
            validate: (val) => {
              if (watch('password') !== val) {
                return 'Passwords do not match';
              }
            },
          })}
        />

        <Button type="submit" isLoading={isLoading} className="mt-4">
          <UserPlus size={18} className="mr-2" />
          Create Account
        </Button>
      </form>

      <div className="mt-6 text-center border-t border-slate-100 dark:border-white/5 pt-6">
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="text-blue-650 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 font-extrabold transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
