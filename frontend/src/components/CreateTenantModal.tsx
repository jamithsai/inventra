import React, { useState, useEffect } from 'react';
import { X, Building2, User, Mail, Phone, Tag, Check, Copy, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { platformApi } from '../services/api';
import type { CreateTenantRequest, TenantProvisioningResponse } from '../types';

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: () => void;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onTenantCreated,
}) => {
  const [formData, setFormData] = useState<CreateTenantRequest>({
    name: '',
    slug: '',
    code: '',
    adminName: '',
    adminEmail: '',
    industry: '',
    contactNumber: '',
    description: '',
  });

  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(false);
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<TenantProvisioningResponse | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Auto-slug and auto-code helper when name changes
  const handleNameChange = (name: string) => {
    const updated: Partial<CreateTenantRequest> = { name };

    if (!isSlugManuallyEdited) {
      const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      updated.slug = slug;
    }

    if (!isCodeManuallyEdited && name.trim()) {
      const words = name.trim().split(/\s+/);
      let code = '';
      if (words.length === 1) {
        code = words[0].substring(0, 5).toUpperCase();
      } else {
        code = words.map((w) => w[0]).join('').substring(0, 6).toUpperCase();
      }
      updated.code = code;
    }

    setFormData((prev) => ({ ...prev, ...updated }));
  };

  const handleSlugChange = (slug: string) => {
    setIsSlugManuallyEdited(true);
    const cleaned = slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData((prev) => ({ ...prev, slug: cleaned }));
  };

  const handleCodeChange = (code: string) => {
    setIsCodeManuallyEdited(true);
    setFormData((prev) => ({ ...prev, code: code.toUpperCase().replace(/[^A-Z0-9]/g, '') }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Client-side validations
    if (!formData.name.trim()) {
      setError('Organization name is required.');
      return;
    }
    if (!formData.slug.trim()) {
      setError('Tenant ID / Slug is required.');
      return;
    }
    if (!formData.code.trim()) {
      setError('Tenant Code is required.');
      return;
    }
    if (!formData.adminName.trim()) {
      setError('Initial administrator name is required.');
      return;
    }
    if (!formData.adminEmail.trim() || !formData.adminEmail.includes('@')) {
      setError('A valid administrator email is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await platformApi.provisionTenant(formData);
      setSuccessData(response);
      onTenantCreated();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to provision tenant.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyInvitationLink = () => {
    if (!successData?.invitationUrl) return;
    const fullUrl = `${window.location.origin}${successData.invitationUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleResetAndClose = () => {
    setFormData({
      name: '',
      slug: '',
      code: '',
      adminName: '',
      adminEmail: '',
      industry: '',
      contactNumber: '',
      description: '',
    });
    setIsSlugManuallyEdited(false);
    setIsCodeManuallyEdited(false);
    setError(null);
    setSuccessData(null);
    setCopiedLink(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-[10px] border border-[#E5E1D8] shadow-2xl max-w-xl w-full overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#FBFAF7] border-b border-[#E5E1D8] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-[7px] bg-[#E9EEFF] border border-[#C7D7FE] flex items-center justify-center text-[#3157D5]">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#172033]">
                {successData ? 'Workspace Provisioned Successfully' : 'Provision New Tenant Organization'}
              </h2>
              <p className="text-[11px] text-[#667085]">
                {successData
                  ? 'Isolated tenant database context & S3 bucket prefix created.'
                  : 'Create an isolated workspace boundary and generate an administrator activation token.'}
              </p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-1 rounded-md text-[#98A2B3] hover:text-[#172033] hover:bg-[#EEEAE3] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {successData ? (
            /* Success State */
            <div className="space-y-4">
              <div className="p-4 rounded-[8px] bg-[#E8F6EF] border border-[#C8EBD9] flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-[#238B5A] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#238B5A]">
                    {successData.tenant.name} is ready!
                  </h3>
                  <p className="text-[11px] text-[#238B5A]/90 mt-0.5">
                    Tenant ID <code className="font-mono font-bold">{successData.tenant.id}</code> has been atomically provisioned with global query filter isolation.
                  </p>
                </div>
              </div>

              {/* Tenant Summary Card */}
              <div className="p-3.5 rounded-[8px] bg-[#FBFAF7] border border-[#E5E1D8] space-y-2 text-xs">
                <div className="flex justify-between items-center py-1 border-b border-[#EEEAE3]">
                  <span className="text-[#667085]">Tenant Organization:</span>
                  <span className="font-bold text-[#172033]">{successData.tenant.name}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EEEAE3]">
                  <span className="text-[#667085]">Tenant Slug / ID:</span>
                  <code className="font-mono text-[#3157D5] bg-[#E9EEFF] px-2 py-0.5 rounded text-[11px] font-bold">
                    {successData.tenant.id}
                  </code>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-[#EEEAE3]">
                  <span className="text-[#667085]">Assigned Administrator:</span>
                  <span className="font-semibold text-[#172033]">
                    {successData.invitation.adminName} ({successData.invitation.email})
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-[#667085]">S3 Bucket Prefix:</span>
                  <code className="font-mono text-[#7F56D9] text-[11px]">
                    tenants/{successData.tenant.id}/*
                  </code>
                </div>
              </div>

              {/* Activation Link Card */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#172033] flex items-center justify-between">
                  <span>Administrator Activation Link</span>
                  <span className="text-[10px] font-mono text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded">
                    Valid for 72 Hours
                  </span>
                </label>
                <div className="p-2.5 rounded-[7px] bg-[#1E293B] text-white flex items-center justify-between font-mono text-[11px]">
                  <div className="truncate mr-2 text-[#94A3B8]">
                    {window.location.origin}{successData.invitationUrl}
                  </div>
                  <button
                    type="button"
                    onClick={copyInvitationLink}
                    className="shrink-0 flex items-center space-x-1.5 px-3 py-1.5 rounded-[5px] bg-[#3157D5] hover:bg-[#2545B0] text-white text-xs font-sans font-semibold transition"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-300" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-[#667085] leading-relaxed">
                  Send this one-time invitation link to <strong className="text-[#172033]">{successData.invitation.email}</strong>. The administrator will set their password and activate their isolated tenant dashboard.
                </p>
              </div>

              {/* Done Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  className="px-5 py-2 rounded-[7px] bg-[#3157D5] hover:bg-[#2545B0] text-white text-xs font-bold transition shadow-xs"
                >
                  Done & View Directory
                </button>
              </div>
            </div>
          ) : (
            /* Provisioning Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-[7px] bg-[#FEE2E2] border border-[#FECACA] flex items-center space-x-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Organization Section */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#98A2B3] font-bold">
                  Organization Details
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Organization Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Orbit Healthcare Logistics"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Tenant ID / Slug <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. orbit-healthcare"
                      value={formData.slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                    <span className="text-[10px] text-[#98A2B3] font-mono mt-0.5 block">
                      Used in S3 prefixes & APIs
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Tenant Code <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ORBIT"
                      value={formData.code}
                      onChange={(e) => handleCodeChange(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono uppercase rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                    <span className="text-[10px] text-[#98A2B3] font-mono mt-0.5 block">
                      3-10 alphanumeric chars
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Industry / Sector
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Healthcare & Medical"
                      value={formData.industry || ''}
                      onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. +1 (555) 0199"
                      value={formData.contactNumber || ''}
                      onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#172033] mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Brief description of the organization and operations..."
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                  />
                </div>
              </div>

              {/* Initial Administrator Section */}
              <div className="space-y-3 pt-2 border-t border-[#EEEAE3]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-[#98A2B3] font-bold">
                  Initial Tenant Administrator
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Admin Full Name <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={formData.adminName}
                      onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#172033] mb-1">
                      Admin Email <span className="text-[#DC2626]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. rahul@orbit.io"
                      value={formData.adminEmail}
                      onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-[7px] border border-[#E5E1D8] bg-white focus:outline-hidden focus:border-[#3157D5] focus:ring-1 focus:ring-[#3157D5]"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] flex items-start space-x-2 text-[11px] text-[#667085]">
                  <Sparkles className="w-3.5 h-3.5 text-[#3157D5] shrink-0 mt-0.5" />
                  <span>
                    The initial admin will receive a secure token to set their password. No plaintext passwords are stored.
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 flex items-center justify-end space-x-2.5 border-t border-[#EEEAE3]">
                <button
                  type="button"
                  onClick={handleResetAndClose}
                  disabled={loading}
                  className="px-4 py-2 rounded-[7px] border border-[#E5E1D8] text-xs font-semibold text-[#667085] hover:text-[#172033] hover:bg-[#FBFAF7] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2 rounded-[7px] bg-[#3157D5] hover:bg-[#2545B0] text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Provisioning...</span>
                    </>
                  ) : (
                    <>
                      <Building2 className="w-4 h-4" />
                      <span>Atomically Provision Tenant</span>
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
