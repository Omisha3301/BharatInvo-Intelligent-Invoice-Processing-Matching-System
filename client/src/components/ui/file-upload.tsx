import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FolderOpen, X, FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  className?: string;
}

export function FileUpload({
  onFilesSelected,
  accept = ".pdf,.jpg,.jpeg,.png",
  multiple = true,
  maxSize = 10,
  className
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      // Check file size
      if (file.size > maxSize * 1024 * 1024) {
        alert(`File ${file.name} is too large. Maximum size is ${maxSize}MB.`);
        return false;
      }
      
      // Check file type
      const allowedTypes = accept.split(',').map(type => type.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        alert(`File ${file.name} is not a supported format.`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    } else if (['jpg', 'jpeg', 'png'].includes(extension || '')) {
      return <ImageIcon className="w-8 h-8 text-blue-500" />;
    }
    return <FileText className="w-8 h-8 text-gray-500" />;
  };

  return (
    <Card className={cn("border-2 border-dashed transition-colors", className)}>
      <CardContent
        className={cn(
          "flex flex-col items-center justify-center p-12 text-center cursor-pointer transition-colors",
          isDragOver ? "border-primary bg-blue-50 dark:bg-blue-950" : "border-gray-300 hover:border-primary"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <div className="max-w-sm mx-auto">
          <Upload className="w-16 h-16 text-gray-400 mb-4 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Drag & Drop Files Here
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            or click to browse from your computer
          </p>
          
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={accept}
            multiple={multiple}
            onChange={handleFileInputChange}
          />
          
          <Button type="button" className="mb-4">
            <FolderOpen className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Supported formats: PDF, JPG, PNG (Max {maxSize}MB each)
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface UploadProgressProps {
  files: { name: string; progress: number; status: string }[];
  onRemoveFile: (index: number) => void;
}

export function UploadProgress({ files, onRemoveFile }: UploadProgressProps) {
  if (files.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">Upload Progress</h3>
        <div className="space-y-4">
          {files.map((file, index) => (
            <div key={index} className="flex items-center space-x-4 py-3 border-b border-gray-100 last:border-b-0">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{file.name}</p>
                <div className="mt-2 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                  />
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{file.status}</div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveFile(index)}
                className="text-red-500 hover:text-red-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
