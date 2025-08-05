import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileUpload, UploadProgress } from "@/components/ui/file-upload";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Download } from "lucide-react";

interface UploadFile {
  name: string;
  progress: number;
  status: string;
}

export default function Upload() {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: recentInvoices = [], isLoading, error } = useQuery({
    queryKey: ['/api/invoices'],
    queryFn: async () => {
      const response = await fetch('/api/invoices', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch invoices');
      return response.json();
    },
    select: (data: any[]) => data.slice(0, 10).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiRequest('POST', '/api/invoices/upload', formData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
      
      toast({
        title: "Success",
        description: "Invoice uploaded and processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload invoice",
        variant: "destructive",
      });
    },
  });

  const handleFilesSelected = async (files: File[]) => {
    const newUploadFiles = files.map(file => ({
      name: file.name,
      progress: 0,
      status: 'Uploading...'
    }));
    
    setUploadFiles(prev => [...prev, ...newUploadFiles]);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileIndex = uploadFiles.length + i;
      
      try {
        const progressInterval = setInterval(() => {
          setUploadFiles(prev => prev.map((f, index) => 
            index === fileIndex 
              ? { ...f, progress: Math.min(f.progress + 10, 90) }
              : f
          ));
        }, 200);
        
        await uploadMutation.mutateAsync(file);
        
        clearInterval(progressInterval);
        
        setUploadFiles(prev => prev.map((f, index) => 
          index === fileIndex 
            ? { ...f, progress: 100, status: 'Completed' }
            : f
        ));
        
        setTimeout(() => {
          setUploadFiles(prev => prev.filter((_, index) => index !== fileIndex));
        }, 3000);
        
      } catch (error) {
        setUploadFiles(prev => prev.map((f, index) => 
          index === fileIndex 
            ? { ...f, progress: 0, status: 'Failed' }
            : f
        ));
      }
    }
  };

  const removeUploadFile = (index: number) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const getOCRStatusColor = (ocrData: any) => {
    if (!ocrData) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    
    if (ocrData.confidence >= 0.9) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    } else if (ocrData.confidence >= 0.7) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'bg-blue-100 text-red-800 dark:bg-blue-900 dark:text-blue-300';
    }
  };

  const getMatchingScoreColor = (score: number | undefined) => {
    if (!score) return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    
    if (score >= 0.9) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    } else if (score >= 0.7) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  const getMatchingStatusColor = (matchingResults: any) => {
    if (!matchingResults) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    
    if (matchingResults.overallScore >= 0.8) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    } else if (matchingResults.overallScore >= 0.5) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    } else {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Upload Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Upload PDF files or images for OCR processing and matching.
          </p>
        </div>

        <FileUpload 
          onFilesSelected={handleFilesSelected}
          accept=".pdf,.jpg,.jpeg,.png"
          multiple={true}
          maxSize={10}
        />

        {uploadFiles.length > 0 && (
          <UploadProgress 
            files={uploadFiles}
            onRemoveFile={removeUploadFile}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Recent Uploads</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6">
</div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6">
</div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                Error fetching recent uploads: {error.message}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead>Upload Time</TableHead>
                      <TableHead>Match Results</TableHead>
                      <TableHead>Matching Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">
                          {invoice.fileName || `${invoice.invoiceNumber}.pdf`}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-gray-400">
                          {formatTimeAgo(invoice.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge className={getMatchingScoreColor(invoice.matchingResults?.overallScore)}>
                            {invoice.matchingResults ? 
                              `Completed (${Math.round(invoice.matchingResults.overallScore * 100)}%)` : 
                              'Pending'
                            }
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getMatchingStatusColor(invoice.matchingResults)}>
                            {invoice.matchingResults ? 
                              invoice.matchingResults.flags?.length > 0 ? 'Flagged' : 'Matched' :
                              'Processing'
                            }
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {recentInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No uploads yet. Upload your first invoice above.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}