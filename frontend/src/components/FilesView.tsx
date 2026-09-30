import React, { useState } from 'react';
import { 
  FolderLock, 
  Upload, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  Download, 
  HardDrive, 
  ShieldCheck, 
  ExternalLink,
  CheckCircle2,
  RefreshCw,
  Cloud,
  FileCode,
  Link2
} from 'lucide-react';
import type { TenantFile, Tenant, InventoryItem } from '../types';

interface FilesViewProps {
  files: TenantFile[];
  items: InventoryItem[];
  currentTenant: Tenant | null;
  loading: boolean;
  onRefresh: () => void;
  onUploadFile: (file: File, associatedItemId?: string) => Promise<void>;
  onDeleteFile: (id: string, fileName: string) => Promise<void>;
}

export const FilesView: React.FC<FilesViewProps> = ({
  files,
  items,
  currentTenant,
  loading,
  onRefresh,
  onUploadFile,
  onDeleteFile,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [associatedItemId, setAssociatedItemId] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setIsUploading(true);
    try {
      await onUploadFile(selectedFile, associatedItemId || undefined);
      setSelectedFile(null);
      setAssociatedItemId('');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Header & S3 Path Info Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-white tracking-tight">AWS S3 Tenant Storage</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono bg-amber-950 text-amber-400 border border-amber-800">
              S3 Path Isolated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Files are stored strictly within the tenant S3 prefix: <code className="text-amber-300 font-mono">/tenants/{currentTenant?.id}/products/</code>
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition self-start sm:self-auto"
          title="Refresh Files"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* S3 Storage Architecture Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-900/40 p-5 shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-950 text-amber-400 flex items-center justify-center shrink-0 border border-amber-800">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-white flex items-center gap-2">
                <span>Amazon S3 Bucket Isolation Strategy</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-amber-900/50 text-amber-300">
                  IFileStorageService
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 max-w-2xl">
                The storage service derives the tenant directory entirely from <code className="text-cyan-300">ITenantContext</code>. Client-supplied paths are ignored, preventing S3 path traversal or cross-tenant bucket leakage.
              </p>
            </div>
          </div>
          <div className="font-mono text-xs text-amber-300 bg-slate-950 px-3 py-2 rounded-xl border border-amber-900/60 shrink-0">
            s3://inventory-bucket/tenants/{currentTenant?.id}/...
          </div>
        </div>
      </div>

      {/* Upload Box & Active Tenant Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-1 rounded-2xl bg-slate-900 border border-slate-800 p-5 h-fit shadow-md">
          <h3 className="font-semibold text-white text-sm mb-3 flex items-center space-x-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Tenant Asset</span>
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Input */}
            <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-4 text-center transition bg-slate-950/50 cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="Preview" className="w-24 h-24 object-cover mx-auto rounded-lg shadow" />
                  <div className="text-xs text-slate-300 font-medium truncate">{selectedFile?.name}</div>
                </div>
              ) : selectedFile ? (
                <div className="space-y-1">
                  <FileText className="w-8 h-8 text-cyan-400 mx-auto" />
                  <div className="text-xs font-semibold text-slate-200">{selectedFile.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{formatFileSize(selectedFile.size)}</div>
                </div>
              ) : (
                <div className="space-y-1 py-4">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                  <div className="text-xs font-medium text-slate-300">Click or Drag file here</div>
                  <div className="text-[11px] text-slate-500">JPG, PNG, PDF, WEBP up to 10MB</div>
                </div>
              )}
            </div>

            {/* Associate with Item (Optional) */}
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Associate with Product (Optional)
              </label>
              <select
                value={associatedItemId}
                onChange={(e) => setAssociatedItemId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-cyan-500"
              >
                <option value="">None (Standalone File)</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!selectedFile || isUploading}
              className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading to S3 Tenant Key...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Upload to /tenants/{currentTenant?.id}/</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Files Explorer */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-white text-sm flex items-center space-x-2">
              <FolderLock className="w-4 h-4 text-cyan-400" />
              <span>Tenant Files ({files.length})</span>
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              Total: {formatFileSize(files.reduce((acc, f) => acc + f.fileSizeBytes, 0))}
            </span>
          </div>

          <div className="space-y-3">
            {files.map((file) => {
              const isImage = file.contentType.startsWith('image/');
              return (
                <div
                  key={file.id}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden text-cyan-400">
                      {isImage && file.downloadUrl ? (
                        <img src={file.downloadUrl} alt={file.fileName} className="w-full h-full object-cover" />
                      ) : isImage ? (
                        <ImageIcon className="w-5 h-5" />
                      ) : (
                        <FileText className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition">
                        {file.fileName}
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span className="text-amber-400/90 truncate">{file.s3Key}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.fileSizeBytes)}</span>
                      </div>
                      {file.associatedItemName && (
                        <div className="mt-1 inline-flex items-center space-x-1 text-[10px] text-cyan-400 bg-cyan-950/60 px-1.5 py-0.2 rounded border border-cyan-900">
                          <Link2 className="w-2.5 h-2.5" />
                          <span>Linked: {file.associatedItemName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {file.downloadUrl && (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                        title="Download / Open File"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteFile(file.id, file.fileName)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition"
                      title="Delete S3 File"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {files.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs">
                <HardDrive className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                No files uploaded for tenant <strong>{currentTenant?.name}</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
