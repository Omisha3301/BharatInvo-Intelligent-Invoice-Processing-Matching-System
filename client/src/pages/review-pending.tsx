import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Eye, Check, X, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Invoice } from "@/types";

export default function ReviewPending() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [comments, setComments] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingInvoices = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices', { status: 'pending' }],
    queryFn: async () => {
      const response = await fetch('/api/invoices?status=pending', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch pending invoices');
      return response.json();
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, status, comments }: { id: number; status: string; comments?: string }) => {
      const response = await apiRequest('PATCH', `/api/invoices/${id}`, { status, comments });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
      setSelectedInvoice(null);
      setComments("");
      
      toast({
        title: "Success",
        description: "Invoice status updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (invoice: Invoice) => {
    updateInvoiceMutation.mutate({
      id: invoice.id,
      status: 'approved',
      comments: comments || undefined,
    });
  };

  const handleReject = (invoice: Invoice) => {
    updateInvoiceMutation.mutate({
      id: invoice.id,
      status: 'rejected',
      comments: comments || undefined,
    });
  };

  const formatCurrency = (amount: string | number | undefined, totalAmount?: number) => {
    const parsedAmount = Number(amount);
    const fallbackAmount = Number(totalAmount) || 0;
    const validAmount = !isNaN(parsedAmount) ? parsedAmount : fallbackAmount;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(validAmount);
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'manual':
        return 'bg-blue-500 text-white';
      case 'rpa':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getMatchConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getMatchingStatus = (matchingResults: any) => {
    if (!matchingResults) return { status: 'Unknown', color: 'bg-gray-100 text-gray-800' };
    
    const { poMatch, deliveryMatch, amountMatch } = matchingResults;
    
    if (poMatch?.matched && deliveryMatch?.matched && amountMatch?.matched) {
      return { status: 'Fully Matched', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    } else if (poMatch?.matched || deliveryMatch?.matched) {
      return { status: 'Partially Matched', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
    } else {
      return { status: 'No Match', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Review Pending</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Review and approve/reject pending invoices that require attention.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-4">
                    <div className="flex justify-between">
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                      <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    </div>
                    <div className="grid grid-cols-3 gap-6">
                      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : pendingInvoices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No pending invoices require your attention at this time.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingInvoices.map((invoice) => {
              const matchingStatus = getMatchingStatus(invoice.matchingResults);
              
              return (
                <Card key={invoice.id}>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                            {invoice.invoiceNumber}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            {invoice.vendorName}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getSourceColor(invoice.source)}>
                            {invoice.source === 'manual' ? 'Manual Upload' : 'RPA Agent'}
                          </Badge>
                          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            Pending Review
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="bg-gray-50 dark:bg-gray-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">OCR Extracted Data</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {invoice.ocrData ? (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Invoice Number:</span>
                                  <span className="font-medium">{invoice.ocrData.invoiceNumber}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                                  <span className="font-medium">{formatCurrency(invoice.ocrData.amount, invoice.totalAmount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Date:</span>
                                  <span className="font-medium">{formatDate(invoice.ocrData.date)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Vendor:</span>
                                  <span className="font-medium">{invoice.ocrData.vendorId?.name || invoice.vendorName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Matching Results:</span>
                                  <span className={`font-medium ${getMatchConfidenceColor(invoice.matchingResults?.overallScore || 0)}`}>
                                    {Math.round((invoice.matchingResults?.overallScore || 0) * 100)}%
                                  </span>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">No OCR data available</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-50 dark:bg-gray-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Matching Status</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {invoice.matchingResults ? (
                              <>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Purchase Order:</span>
                                  <Badge className={
                                    invoice.matchingResults.poMatch?.matched 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                  }>
                                    {invoice.matchingResults.poMatch?.matched ? 'Matched' : 'No Match'}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Delivery Receipt:</span>
                                  <Badge className={
                                    invoice.matchingResults.deliveryMatch?.matched 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                  }>
                                    {invoice.matchingResults.deliveryMatch?.matched ? 'Matched' : 'No Match'}
                                  </Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                                  <Badge className={
                                    invoice.matchingResults.amountMatch?.matched 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                                  }>
                                    {invoice.matchingResults.amountMatch?.matched ? 'Matched' : 'Variance'}
                                  </Badge>
                                </div>
                                
                                {invoice.flags && invoice.flags.length > 0 && (
                                  <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                                    <div className="flex items-center text-xs text-red-600 dark:text-red-400 font-medium mb-2">
                                      <AlertTriangle className="w-3 h-3 mr-1" />
                                      Flagged Issues:
                                    </div>
                                    <ul className="space-y-1">
                                      {invoice.flags.map((flag, index) => (
                                        <li key={index} className="text-xs text-red-600 dark:text-red-400">
                                          • {flag}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-gray-500">Processing...</p>
                            )}
                          </CardContent>
                        </Card>

                        <Card className="bg-gray-50 dark:bg-gray-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Review Actions</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <Button 
                              variant="outline" 
                              className="w-full justify-start"
                              onClick={() => setSelectedInvoice(invoice)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Full Invoice
                            </Button>
                            
                            {selectedInvoice?.id === invoice.id && (
                              <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                <div>
                                  <Label htmlFor="comments" className="text-sm">Comments (Optional)</Label>
                                  <Textarea
                                    id="comments"
                                    placeholder="Add review comments..."
                                    value={comments}
                                    onChange={(e) => setComments(e.target.value)}
                                    className="mt-1"
                                    rows={3}
                                  />
                                </div>
                              </div>
                            )}
                            
                            <div className="flex space-x-2">
                              <Button 
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                onClick={() => handleApprove(invoice)}
                                disabled={updateInvoiceMutation.isPending}
                              >
                                <Check className="w-4 h-4 mr-2" />
                                <b>APPROVE</b>
                              </Button>
                              <Button 
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleReject(invoice)}
                                disabled={updateInvoiceMutation.isPending}
                              >
                                <X className="w-4 h-4 mr-2" />
                                <b>REJECT</b>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}