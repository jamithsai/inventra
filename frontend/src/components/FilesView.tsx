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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E1D8]">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl font-bold text-[#172033] tracking-tight">AWS S3 File Storage</h1>
            <span className="text-xs px-2 py-0.5 rounded-[4px] font-mono bg-[#E9EEFF] text-[#3157D5] border border-[#C7D7FE] font-medium">
              Prefix Isolated
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Storage partitioned by tenant prefix: <code className="text-[#3157D5] font-mono font-medium">/tenants/{currentTenant?.id}/products/</code>
          </p>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="p-2 rounded-[7px] bg-white hover:bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8] transition shadow-xs self-start sm:self-auto"
          title="Refresh Files"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3157D5]' : ''}`} />
        </button>
      </div>

      {/* S3 Storage Architecture Banner */}
      <div className="rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start space-x-3.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#E9EEFF] text-[#3157D5] flex items-center justify-center shrink-0 border border-[#C7D7FE]">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#172033] flex items-center gap-2">
                <span>Storage Isolation Strategy</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-[4px] bg-[#FBFAF7] text-[#667085] border border-[#E5E1D8]">
                  IFileStorageService
                </span>
              </div>
              <p className="text-xs text-[#667085] mt-0.5 max-w-2xl leading-relaxed">
                The storage service derives object keys strictly from <code className="text-[#172033] font-medium">ITenantContext</code>. Path parameters are verified on the server to prevent directory traversal or cross-tenant key access.
              </p>
            </div>
          </div>
          <div className="font-mono text-xs text-[#172033] bg-[#FBFAF7] px-3 py-1.5 rounded-[6px] border border-[#E5E1D8] shrink-0">
            s3://inventory-bucket/tenants/{currentTenant?.id}/...
          </div>
        </div>
      </div>

      {/* Upload Box & Active Tenant Files Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Upload Form */}
        <div className="lg:col-span-1 rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs h-fit">
          <h3 className="font-semibold text-[#172033] text-xs mb-3.5 flex items-center space-x-2">
            <Upload className="w-3.5 h-3.5 text-[#3157D5]" />
            <span>Upload Tenant Object</span>
          </h3>

          <form onSubmit={handleUploadSubmit} className="space-y-3.5">
            {/* File Input */}
            <div className="border border-dashed border-[#E5E1D8] hover:border-[#3157D5] rounded-[7px] p-4 text-center transition bg-[#FBFAF7] cursor-pointer relative">
              <input
                type="file"
                onChange={handleFileChange}
                required
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img src={previewUrl} alt="Preview" className="w-20 h-20 object-cover mx-auto rounded-[6px] border border-[#E5E1D8]" />
                  <div className="text-xs text-[#172033] font-medium truncate">{selectedFile?.name}</div>
                </div>
              ) : selectedFile ? (
                <div className="space-y-1">
                  <FileText className="w-6 h-6 text-[#3157D5] mx-auto" />
                  <div className="text-xs font-semibold text-[#172033]">{selectedFile.name}</div>
                  <div className="text-[10px] text-[#98A2B3] font-mono">{formatFileSize(selectedFile.size)}</div>
                </div>
              ) : (
                <div className="space-y-1 py-3">
                  <Upload className="w-6 h-6 text-[#98A2B3] mx-auto" />
                  <div className="text-xs font-medium text-[#172033]">Choose file to upload</div>
                  <div className="text-[11px] text-[#98A2B3]">JPG, PNG, PDF, WEBP up to 10MB</div>
                </div>
              )}
            </div>

            {/* Associate with Item (Optional) */}
            <div>
              <label className="block text-xs font-medium text-[#667085] mb-1">
                Linked SKU (Optional)
              </label>
              <select
                value={associatedItemId}
                onChange={(e) => setAssociatedItemId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] text-xs text-[#172033] focus:outline-none focus:border-[#3157D5] focus:bg-white"
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
              className="w-full py-2 rounded-[7px] bg-[#3157D5] hover:bg-[#2648BE] disabled:opacity-40 text-white font-medium text-xs transition shadow-xs flex items-center justify-center space-x-1.5"
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
        <div className="lg:col-span-2 rounded-[9px] bg-white border border-[#E5E1D8] p-4 shadow-xs">
          <div className="flex items-center justify-between mb-3.5 border-b border-[#EEEAE3] pb-2.5">
            <h3 className="font-semibold text-[#172033] text-xs flex items-center space-x-2">
              <FolderLock className="w-3.5 h-3.5 text-[#3157D5]" />
              <span>Objects in Bucket ({files.length})</span>
            </h3>
            <span className="text-[11px] text-[#667085] font-mono">
              Total: {formatFileSize(files.reduce((acc, f) => acc + f.fileSizeBytes, 0))}
            </span>
          </div>

          <div className="space-y-2.5">
            {files.map((file) => {
              const isImage = file.contentType.startsWith('image/');
              return (
                <div
                  key={file.id}
                  className="p-3 rounded-[7px] bg-[#FBFAF7] border border-[#E5E1D8] hover:border-[#CBD5E1] transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-[6px] bg-white border border-[#E5E1D8] flex items-center justify-center shrink-0 overflow-hidden text-[#667085]">
                      {isImage && file.downloadUrl ? (
                        <img src={file.downloadUrl} alt={file.fileName} className="w-full h-full object-cover" />
                      ) : isImage ? (
                        <ImageIcon className="w-4 h-4" />
                      ) : (
                        <FileText className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-[#172033] truncate">
                        {file.fileName}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-[#667085] font-mono mt-0.5">
                        <span className="text-[#3157D5] truncate">{file.s3Key}</span>
                        <span>•</span>
                        <span>{formatFileSize(file.fileSizeBytes)}</span>
                      </div>
                      {file.associatedItemName && (
                        <div className="mt-1 inline-flex items-center space-x-1 text-[10px] font-mono text-[#667085] bg-white px-1.5 py-0.5 rounded-[4px] border border-[#E5E1D8]">
                          <Link2 className="w-2.5 h-2.5 text-[#98A2B3]" />
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
                        className="p-1.5 rounded-[6px] bg-white hover:bg-[#F7F5F0] text-[#667085] hover:text-[#172033] border border-[#E5E1D8] transition"
                        title="Download / Open File"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => onDeleteFile(file.id, file.fileName)}
                      className="p-1.5 rounded-[6px] bg-white hover:bg-[#FDECEC] text-[#98A2B3] hover:text-[#D64545] border border-[#E5E1D8] hover:border-[#FAD1D1] transition"
                      title="Delete S3 File"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {files.length === 0 && (
              <div className="text-center py-10 text-[#98A2B3] text-xs">
                <HardDrive className="w-7 h-7 mx-auto text-[#D8D2C6] mb-2" />
                No files uploaded for tenant <strong>{currentTenant?.name}</strong>.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
