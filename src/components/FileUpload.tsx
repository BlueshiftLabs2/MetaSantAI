import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Upload, File, X, Image, FileText, Code } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  content: string;
  url?: string;
}

interface FileUploadProps {
  onFileUpload: (files: UploadedFile[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  acceptedTypes?: string[];
}

export const FileUpload = ({ 
  onFileUpload, 
  maxFiles = 5, 
  maxSizeMB = 10,
  acceptedTypes = ['text/*', 'image/*', '.pdf', '.docx', '.json', '.csv', '.md']
}: FileUploadProps) => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <Image className="w-4 h-4" />;
    if (type.startsWith('text/') || type.includes('json') || type.includes('csv')) return <Code className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const processFile = (file: File): Promise<UploadedFile> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result;
        
        if (file.type.startsWith('image/')) {
          // For images, store as data URL
          resolve({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            content: result as string,
            url: result as string
          });
        } else {
          // For text files, store the text content
          resolve({
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: file.name,
            size: file.size,
            type: file.type,
            content: result as string
          });
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.type.startsWith('image/')) {
        reader.readAsDataURL(file);
      } else {
        reader.readAsText(file);
      }
    });
  };

  const handleFiles = useCallback(async (fileList: FileList) => {
    if (files.length + fileList.length > maxFiles) {
      toast({
        title: 'Too many files',
        description: `Maximum ${maxFiles} files allowed.`,
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    const newFiles: UploadedFile[] = [];

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];

      // Check file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds ${maxSizeMB}MB limit.`,
          variant: 'destructive',
        });
        continue;
      }

      try {
        const processedFile = await processFile(file);
        newFiles.push(processedFile);
      } catch (error) {
        toast({
          title: 'Failed to process file',
          description: `Could not process ${file.name}.`,
          variant: 'destructive',
        });
      }
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFileUpload(updatedFiles);
    setIsProcessing(false);

    if (newFiles.length > 0) {
      toast({
        title: 'Files uploaded',
        description: `${newFiles.length} file(s) processed successfully.`,
      });
    }
  }, [files, maxFiles, maxSizeMB, onFileUpload, toast]);

  const removeFile = (id: string) => {
    const updatedFiles = files.filter(f => f.id !== id);
    setFiles(updatedFiles);
    onFileUpload(updatedFiles);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  }, [handleFiles]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onDragEnter={() => setIsDragging(true)}
        onDragLeave={() => setIsDragging(false)}
      >
        <div className="text-center">
          <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Drag and drop files here, or{' '}
            <label className="text-primary cursor-pointer hover:underline">
              browse
              <input
                type="file"
                multiple
                className="hidden"
                accept={acceptedTypes.join(',')}
                onChange={handleFileInput}
                disabled={isProcessing}
              />
            </label>
          </p>
          <p className="text-xs text-muted-foreground">
            Max {maxFiles} files, {maxSizeMB}MB each
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Uploaded Files</h4>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                {getFileIcon(file.type)}
                <div>
                  <p className="text-sm font-medium">{file.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <Badge variant="outline" className="text-xs">
                      {file.type.split('/')[0] || 'file'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(file.id)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {isProcessing && (
        <div className="text-center text-sm text-muted-foreground">
          Processing files...
        </div>
      )}
    </div>
  );
};