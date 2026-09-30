import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Check, 
  Copy, 
  Eye, 
  EyeOff, 
  Building2,
  KeyRound,
  UserCheck
} from 'lucide-react';
import type { DemoAccount, LoginResponse } from '../types';
import { authApi } from '../services/api';

interface LoginPageProps {
  onLoginSuccess: (data: LoginResponse) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoAccounts, setDemoAccounts] = useState<DemoAccount[]>([]);
  const [copiedPass, setCopiedPass] = useState(false);
  const [selectedDemoId, setSelectedDemoId] = useState<string | null>(null);

  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Load demo accounts metadata
  useEffect(() => {
    const fetchDemos = async () => {
      try {
        const accounts = await authApi.getDemoAccounts();
        setDemoAccounts(accounts);
      } catch {
        // Fallback default demo metadata if offline
        setDemoAccounts([
          {
            id: 'usr_admin_1',
            name: 'Admin User',
            email: 'admin@platform.io',
            role: 'ADMIN',
            tenantNames: ['Acme Retail', 'Nova Electronics'],
            tenantIds: ['acme-retail', 'nova-electronics'],
            description: 'Multi-Tenant Platform Owner (Full Access to Acme Retail & Nova Electronics)'
          },
          {
            id: 'usr_manager_nova',
            name: 'Nova Electronics Manager',
            email: 'manager@nova-electronics.io',
            role: 'MANAGER',
            tenantNames: ['Nova Electronics'],
            tenantIds: ['nova-electronics'],
            description: 'Operations Lead (Single-Tenant Access to Nova Electronics)'
          },
          {
            id: 'usr_zenith_user',
            name: 'Zenith Supplies Specialist',
            email: 'specialist@zenith-supplies.io',
            role: 'MANAGER',
            tenantNames: ['Zenith Supplies'],
            tenantIds: ['zenith-supplies'],
            description: 'Enterprise Furnishings Specialist (Single-Tenant Access to Zenith Supplies)'
          },
          {
            id: 'usr_auditor_acme',
            name: 'Acme Compliance Auditor',
            email: 'auditor@acme-retail.com',
            role: 'VIEWER',
            tenantNames: ['Acme Retail'],
            tenantIds: ['acme-retail'],
            description: 'Compliance Auditor (Read-Only Access to Acme Retail)'
          }
        ]);
      }
    };
    fetchDemos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please enter both work email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await authApi.login(email.trim(), password);
      onLoginSuccess(response);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Authentication failed. Please verify your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectDemoAccount = (acc: DemoAccount) => {
    setEmail(acc.email);
    setSelectedDemoId(acc.id);
    setError(null);
    // Focus password input for user entry
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 50);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText('Inventra@2026!');
    setCopiedPass(true);
    setTimeout(() => setCopiedPass(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#172033] flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-[#E9EEFF] selection:text-[#3157D5]">
      {/* Top Header / Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-[10px] bg-[#3157D5] text-white shadow-md mb-3">
          <Layers className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-center space-x-2">
          <h1 className="text-2xl font-bold tracking-tight text-[#172033]">
            Inventra
          </h1>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-[5px] bg-[#E9EEFF] text-[#3157D5] border border-[#C7D7FE] font-semibold">
            Enterprise
          </span>
        </div>
        <p className="mt-1.5 text-xs text-[#667085] max-w-sm mx-auto">
          Secure Multi-Tenant Inventory & Supply Chain Platform
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        {/* Main Sign-In Card */}
        <div className="bg-white py-8 px-6 sm:px-10 rounded-[12px] border border-[#E5E1D8] shadow-[0_4px_24px_rgba(23,32,51,0.06)] space-y-6">
          <div className="border-b border-[#EEEAE3] pb-4">
            <h2 className="text-base font-semibold text-[#172033]">
              Sign In to your Workspace
            </h2>
            <p className="text-xs text-[#667085] mt-0.5">
              Enter your credentials to access your organization's isolated inventory.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-[8px] bg-[#FDECEC] border border-[#F9C5C5] text-xs text-[#D9383A] flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-[#D9383A] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Authentication Error: </span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-medium text-[#172033] mb-1.5">
                Work Email Address
              </label>
              <div className="relative rounded-[7px] shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#98A2B3]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setSelectedDemoId(null);
                  }}
                  placeholder="e.g. admin@platform.io"
                  className="block w-full pl-9 pr-3 py-2 text-xs text-[#172033] bg-[#FBFAF7] hover:bg-white focus:bg-white border border-[#E5E1D8] focus:border-[#3157D5] rounded-[7px] outline-hidden focus:ring-1 focus:ring-[#3157D5] font-mono transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-[#172033]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="text-[11px] font-mono text-[#3157D5] hover:text-[#2648BE] flex items-center space-x-1 transition"
                  title="Copy default demo password"
                >
                  {copiedPass ? (
                    <>
                      <Check className="w-3 h-3 text-[#238B5A]" />
                      <span className="text-[#238B5A]">Copied 'Inventra@2026!'</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3 h-3 text-[#3157D5]" />
                      <span>Demo Password: <code className="bg-[#E9EEFF] px-1 rounded">Inventra@2026!</code></span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative rounded-[7px] shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#98A2B3]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  ref={passwordInputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  className="block w-full pl-9 pr-10 py-2 text-xs text-[#172033] bg-[#FBFAF7] hover:bg-white focus:bg-white border border-[#E5E1D8] focus:border-[#3157D5] rounded-[7px] outline-hidden focus:ring-1 focus:ring-[#3157D5] font-mono transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#98A2B3] hover:text-[#172033]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-[7px] bg-[#3157D5] hover:bg-[#2648BE] disabled:opacity-50 text-white font-medium text-xs transition shadow-sm flex items-center justify-center space-x-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Verifying JWT Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Demo Accounts Quick-Select Helper */}
          <div className="pt-4 border-t border-[#EEEAE3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-[#172033]">
                <UserCheck className="w-3.5 h-3.5 text-[#3157D5]" />
                <span>Quick-Select Demo Personas</span>
              </div>
              <span className="text-[10px] text-[#667085] font-mono">
                Click to autofill email
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {demoAccounts.map((acc) => {
                const isSelected = selectedDemoId === acc.id || email === acc.email;

                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`text-left p-2.5 rounded-[8px] border text-xs transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#E9EEFF] border-[#3157D5] shadow-xs'
                        : 'bg-[#FBFAF7] hover:bg-white border-[#E5E1D8] hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[#172033] truncate">{acc.name}</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded uppercase font-bold ${
                        acc.role === 'ADMIN' 
                          ? 'bg-[#E9EEFF] text-[#3157D5]' 
                          : acc.role === 'MANAGER' 
                          ? 'bg-[#E8F6EF] text-[#1E7E51]' 
                          : 'bg-[#F7F5F0] text-[#667085]'
                      }`}>
                        {acc.role}
                      </span>
                    </div>

                    <div className="text-[10px] font-mono text-[#667085] truncate mb-1.5">
                      {acc.email}
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] text-[#98A2B3]">
                      <Building2 className="w-3 h-3 text-[#667085] shrink-0" />
                      <span className="truncate text-[#667085]">
                        {acc.tenantNames.join(', ')}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Security / Architecture Footer Note */}
        <div className="mt-6 text-center space-y-2">
          <div className="inline-flex items-center space-x-1.5 text-[11px] font-mono text-[#667085]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#238B5A]" />
            <span>Zero-Trust Architecture: Cryptographic JWT & EF Core Query Filter Isolation</span>
          </div>
          <p className="text-[10px] text-[#98A2B3]">
            Inventra Multi-Tenant Enterprise Engine • Automated Tenant Resolution & PBKDF2 Password Hashing
          </p>
        </div>
      </div>
    </div>
  );
};
