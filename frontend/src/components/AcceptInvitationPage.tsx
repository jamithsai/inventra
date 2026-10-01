import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  KeyRound, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  ArrowRight, 
  Lock, 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { invitationsApi } from '../services/api';
import type { InvitationDetails } from '../types';

interface AcceptInvitationPageProps {
  token: string;
  onInvitationAccepted: (email: string) => void;
  onGoToLogin: () => void;
}

export const AcceptInvitationPage: React.FC<AcceptInvitationPageProps> = ({
  token,
  onInvitationAccepted,
  onGoToLogin,
}) => {
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Password validation checks
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecial && passwordsMatch;

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Missing or invalid invitation token in URL.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const data = await invitationsApi.getInvitation(token);
        setInvitation(data);
      } catch (err: any) {
        const msg = err.response?.data?.error || err.response?.data?.message || 'Invalid or expired invitation token.';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPasswordValid) return;

    setSubmitting(true);
    setError(null);
    try {
      const res = await invitationsApi.acceptInvitation(token, {
        password,
        confirmPassword,
      });
      setSubmitSuccess(true);
      setSubmitMessage(res.message || 'Account activated successfully!');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to activate invitation.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center items-center p-4">
      {/* Background Accent Grid */}
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-white border border-[#E5E1D8] shadow-xs mb-3">
            <div className="w-5 h-5 rounded-[5px] bg-[#3157D5] flex items-center justify-center text-white font-bold text-xs">
              IN
            </div>
            <span className="text-xs font-bold font-mono tracking-wider text-[#172033]">
              INVENTRA
            </span>
            <span className="text-[10px] font-mono text-[#3157D5] bg-[#E9EEFF] px-1.5 py-0.5 rounded font-semibold">
              WORKSPACE ACTIVATION
            </span>
          </div>
          <h1 className="text-xl font-bold text-[#172033]">
            Accept Organization Invitation
          </h1>
          <p className="text-xs text-[#667085] mt-1">
            Configure your enterprise credentials to access your isolated workspace.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white rounded-[12px] border border-[#E5E1D8] shadow-lg p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-6 h-6 animate-spin text-[#3157D5]" />
              <p className="text-xs text-[#667085]">Validating invitation cryptographic token...</p>
            </div>
          ) : error && !invitation ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Invalid or Expired Invitation</h2>
                <p className="text-xs text-[#667085] mt-1 leading-relaxed">{error}</p>
              </div>
              <button
                type="button"
                onClick={onGoToLogin}
                className="w-full py-2.5 px-4 rounded-[7px] bg-[#172033] hover:bg-[#2A3756] text-white text-xs font-bold transition flex items-center justify-center space-x-2"
              >
                <span>Return to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : submitSuccess ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#E8F6EF] text-[#238B5A] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#172033]">Account Activated!</h2>
                <p className="text-xs text-[#667085] mt-1 leading-relaxed">{submitMessage}</p>
                <div className="mt-3 p-3 bg-[#FBFAF7] rounded-[7px] border border-[#E5E1D8] text-xs font-mono text-[#172033]">
                  {invitation?.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onInvitationAccepted(invitation?.email || '')}
                className="w-full py-2.5 px-4 rounded-[7px] bg-[#3157D5] hover:bg-[#2545B0] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[7px] bg-[#FEE2E2] border border-[#FECACA] flex items-center space-x-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Organization Profile Details */}
              <div className="p-3.5 rounded-[8px] bg-[#FBFAF7] border border-[#E5E1D8] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#98A2B3] font-bold">
                    Workspace
                  </span>
                  <span className="text-[10px] font-mono text-[#3157D5] bg-[#E9EEFF] px-2 py-0.5 rounded font-bold">
                    {invitation?.role}
                  </span>
                </div>
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-[5px] bg-white border border-[#E5E1D8] flex items-center justify-center text-[#3157D5]">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#172033]">{invitation?.tenantName}</div>
                    <div className="text-[10px] font-mono text-[#667085]">
                      Tenant ID: <span className="font-bold text-[#3157D5]">{invitation?.tenantId}</span>
                    </div>
                  </div>
                </div>
                <div className="text-[11px] text-[#667085] pt-1 border-t border-[#EEEAE3]">
                  Invited as <strong className="text-[#172033]">{invitation?.adminName}</strong> ({invitation?.email})
                </div>
              </div>

              {/* Password Setting Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Set Master Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white pr-9 focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-2.5 text-[#98A2B3] hover:text-[#172033]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Confirm Password <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                  />
                </div>

                {/* Password Criteria Checklist */}
                <div className="p-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] space-y-1.5 text-[11px]">
                  <div className="font-semibold text-[#172033] text-[10px] uppercase font-mono tracking-wider">
                    Password Requirements:
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[#667085]">
                    <div className={`flex items-center space-x-1.5 ${hasMinLength ? 'text-[#238B5A]' : ''}`}>
                      {hasMinLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-[#98A2B3]" />}
                      <span>8+ characters</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasUpperCase ? 'text-[#238B5A]' : ''}`}>
                      {hasUpperCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-[#98A2B3]" />}
                      <span>Uppercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasLowerCase ? 'text-[#238B5A]' : ''}`}>
                      {hasLowerCase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-[#98A2B3]" />}
                      <span>Lowercase letter</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasNumber ? 'text-[#238B5A]' : ''}`}>
                      {hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-[#98A2B3]" />}
                      <span>Numeric digit</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${hasSpecial ? 'text-[#238B5A]' : ''}`}>
                      {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-[#98A2B3]" />}
                      <span>Special character</span>
                    </div>
                    <div className={`flex items-center space-x-1.5 ${passwordsMatch ? 'text-[#238B5A]' : ''}`}>
                      {passwordsMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 text-[#98A2B3]" />}
                      <span>Passwords match</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={!isPasswordValid || submitting}
                className="w-full mt-2 py-2.5 px-4 rounded-[7px] bg-[#3157D5] hover:bg-[#2545B0] text-white text-xs font-bold transition flex items-center justify-center space-x-2 shadow-xs disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Activate Workspace & Set Password</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-[11px] text-[#667085] hover:text-[#172033] underline"
                >
                  Already have an active account? Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer */}
        <div className="mt-4 text-center text-[11px] text-[#98A2B3] flex items-center justify-center space-x-1.5">
          <Lock className="w-3 h-3" />
          <span>End-to-end PBKDF2 Password Hashing & S3 Multi-Tenant Isolation</span>
        </div>
      </div>
    </div>
  );
};
