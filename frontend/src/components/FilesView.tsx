import React, { useState } from 'react';
import { 
  FolderLock, 
  Upload, 
  Trash2, 
  FileText, 
  Image as ImageIcon, 
  HardDrive, 
  ExternalLink,
  RefreshCw,
  Cloud,
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">AWS S3 Storage</h1>
            <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-700 border border-slate-200">
              Prefix Isolated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Objects partitioned by tenant prefix: <code className="text-slate-800 font-mono font-medium">/tenants/{currentTenant?.id}/products/</code>
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition shadow-sm self-start sm:self-auto"
          title="Refresh Files"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-slate-900' : ''}`} />
        </button>
      </div>

      {/* S3 Storage Architecture Banner */}
      <div className="rounded-lg bg-white border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                <span>Storage Isolation Strategy</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  IFileStorageService
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl leading-relaxed">
                The storage service derives object keys strictly from <code className="text-slate-800 font-medium">ITenantContext</code>. Path parameters are verified on the server to prevent directory traversal or cross-tenant key access.
              </p>
            </div>
          </div>
          <div className="font-mono text-xs text-slate-800 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 shrink-0 shadow-xs">
            s3://inventory-bucket/tenants/{currentTenant?.id}/...
          </div>
        </div>
      </div>

      {/* Upload Box & Active Tenant Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <div className="lg:col-span-1 rounded-lg bg-white border border-slate-200 p-5 shadow-sm h-fit">
          <h3 className="font-semibold text-slate-900 text-xs mb-4 flex items-center space-x-2">
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>Upload Tenant Object</span>
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Input */}
            <div className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg p-4 text-center transition bg-slate-50/50 cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover mx-auto rounded border border-slate-200" />
                  <div className="text-xs text-slate-700 font-medium truncate">{selectedFile?.name}</div>
                </div>
              ) : selectedFile ? (
                <div className="space-y-1">
                  <FileText className="w-6 h-6 text-slate-600 mx-auto" />
                  <div className="text-xs font-semibold text-slate-800">{selectedFile.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{formatFileSize(selectedFile.size)}</div>
                </div>
              ) : (
                <div className="space-y-1 py-3">
                  <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                  <div className="text-xs font-medium text-slate-700">Choose file to upload</div>
                  <div className="text-[11px] text-slate-400">JPG, PNG, PDF, WEBP up to 10MB</div>
                </div>
              )}
            </div>

            {/* Associate with Item (Optional) */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Linked SKU (Optional)
              </label>
              <select
                value={associatedItemId}
                onChange={(e) => setAssociatedItemId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-slate-400 focus:bg-white"
              >
                <option value="">Standalone File</option>
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
              className="w-full py-2 rounded-md bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-medium text-xs transition shadow-sm flex items-center justify-center space-x-1.5"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading Object...</span>
                </>
              ) : (
                <>
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Files Explorer */}
        <div className="lg:col-span-2 rounded-lg bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-semibold text-slate-900 text-xs flex items-center space-x-2">
              <FolderLock className="w-3.5 h-3.5 text-slate-600" />
              <span>Objects in Bucket ({files.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              Total: {formatFileSize(files.reduce((acc, f) => acc + f.fileSizeBytes, 0))}
            </span>
          </div>

          <div className="space-y-3">
            {files.map((file) => {
              const isImage = file.contentType.startsWith('image/');
              return (
                <div
                  key={file.id}
                  className="p-3.5 rounded-md bg-slate-50/80 border border-slate-200 hover:border-slate-300 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-9 h-9 rounded bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden text-slate-500">
                      {isImage && file.downloadUrl ? (
                        <img src={file.downloadUrl} alt={file.fileName} className="w-full h-full object-cover" />
                      ) : isImage ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-slate-900 truncate">
                        {file.fileName}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="text-slate-700 truncate">{file.s3Key}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.fileSizeBytes)}</span>
                      </div>
                      {file.associatedItemName && (
                        <div className="mt-1 inline-flex items-center space-x-1 text-[10px] font-mono text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          <Link2 className="w-2.5 h-2.5 text-slate-400" />
                          <span>Linked: {file.associatedItemName}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 shrink-0">
                    {file.downloadUrl && (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition shadow-xs"
                        title="Download / Open File"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteFile(file.id, file.fileName)}
                      className="p-1.5 rounded bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition shadow-xs"
                      title="Delete S3 File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {files.length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs">
                <HardDrive className="w-7 h-7 mx-auto text-slate-300 mb-2" />
                No files uploaded for tenant <strong>{currentTenant?.name}</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
