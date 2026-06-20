import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';

export default function ForgotPassword() {
  const { forgotPassword, isLoading } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const onSubmit = async (data) => {
    const result = await forgotPassword(data.email);
    if (result.success) {
      toast.success(result.message || 'Reset link sent if email exists.');
      setIsSubmitted(true);
    } else {
      toast.error(result.error);
    }
  };

  return (
    <Card className="shadow-2xl">
      <div className="mb-6">
        <Link
          to="/login"
          className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors space-x-1"
        >
          <ArrowLeft size={14} />
          <span>Back to login</span>
        </Link>
      </div>

      <div className="text-center mb-6">
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Forgot Password?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-semibold">
          Enter your email and we'll send you a password reset link
        </p>
      </div>

      {isSubmitted ? (
        <div className="text-center space-y-4 pt-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Mail size={32} />
          </div>
          <div className="space-y-1.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">Check your email</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold max-w-xs mx-auto leading-relaxed">
              If that email exists in our system, a password reset link has been dispatched.
            </p>
          </div>
          <Button variant="secondary" onClick={() => setIsSubmitted(false)} className="mt-4">
            Resend Email
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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

          <Button type="submit" isLoading={isLoading}>
            <Send size={18} className="mr-2" />
            Send Reset Link
          </Button>
        </form>
      )}
    </Card>
  );
}
