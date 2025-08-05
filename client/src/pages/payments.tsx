import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CreditCard, Clock, CheckCircle, TrendingUp, Eye } from "lucide-react";
import { Invoice } from "@/types";
import { Payment } from "@/types";
declare global {
  interface Window {
    Razorpay: any;
  }
}

export function useRazorpayScript() {
  useEffect(() => {
    // Prevent duplicate injection
    if (document.getElementById("razorpay-checkout-js")) return;

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;

    script.onload = () => {
      console.log("Razorpay script loaded");
    };

    script.onerror = () => {
      console.error("Failed to load Razorpay script");
    };

    document.body.appendChild(script);
  }, []);
}

export default function Payments() {
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();
  useRazorpayScript();
  // Get approved invoices that are ready for payment
  const { data: paymentQueue = [], isLoading } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices', { status: 'approved' }],
    queryFn: async () => {
      const response = await fetch('/api/invoices?status=approved', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch approved invoices');
      return response.json();
    },
  });



  // Get payment stats
  const { data: paidInvoices = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices', { status: 'paid' }],
    queryFn: async () => {
      const response = await fetch('/api/invoices?status=paid', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch paid invoices');
      return response.json();
    },
  });

  //Annie

  const { data: paymentHistory = [] } = useQuery<Invoice[]>({
    queryKey: ['/api/invoices', { status: 'paid' }],
    queryFn: async () => {
      const response = await fetch('/api/invoices?status=paid', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch paid invoices');
      return response.json();
    },
  });



  const processPaymentMutation = useMutation({
    mutationFn: async (invoiceIds: number[]) => {
      const promises = invoiceIds.map(id =>
        apiRequest('PATCH', `/api/invoices/${id}`, { status: 'paid' })
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
      setSelectedInvoices(new Set());

      toast({
        title: "Success",
        description: "Payment(s) processed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process payment",
        variant: "destructive",
      });
    },
  });

  const handleSelectInvoice = (invoiceId: number, checked: boolean) => {
    const newSelected = new Set(selectedInvoices);
    if (checked) {
      newSelected.add(invoiceId);
    } else {
      newSelected.delete(invoiceId);
    }
    setSelectedInvoices(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvoices(new Set(paymentQueue.map(invoice => invoice.id)));
    } else {
      setSelectedInvoices(new Set());
    }
  };

  const handleBatchApprove = () => {
    if (selectedInvoices.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select invoices to process",
        variant: "destructive",
      });
      return;
    }

    processPaymentMutation.mutate(Array.from(selectedInvoices));
  };


  const handleSinglePayment = async (invoiceId: number) => {
    const invoice = paymentQueue.find(inv => inv.id === invoiceId);
    if (!invoice) return;
    console.log("1");
    const razorpayOptions = {
      key: "Pls_put_your_own_key_this_is_just_demo",
      amount: parseFloat(invoice.totalAmount) * 100, // Razorpay uses paise
      currency: 'INR',
      name: invoice.vendorName,
      description: `Payment for Invoice ${invoice.invoiceNumber}`,
      order_id: undefined, // You'd need to create this server-side
      handler: async function (response: any) {
        // Mark invoice as paid
        // processPaymentMutation.mutate([invoiceId]);
        //Annie -start
        try {
          const razorpayPaymentId = response.razorpay_payment_id;
          const paymentTime = new Date().toISOString();
          await apiRequest("POST", "/api/payments", {
            invoiceId: invoice.id,
            amount: invoice.totalAmount,
            paymentDate: new Date().toISOString(),
          });

          // Optionally also mark invoice as paid
          processPaymentMutation.mutate([invoiceId]);
          queryClient.invalidateQueries({ queryKey: ['/api/invoices'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard/activity'] });
          queryClient.invalidateQueries({ queryKey: ['/api/payments'] }); // Refresh payment history

        } catch (err) {
          console.error("Payment save failed:", err);
          toast({
            title: "Error",
            description: "Payment completed but not recorded",
            variant: "destructive",
          });
        }
        //Annie -end 
      },
      prefill: {
        name: invoice.vendorName,
        email: invoice.vendorEmail || "vendor@example.com",
        contact: invoice.vendorPhone || "9000090000",
      },
      notes: {
        invoice_id: invoice.invoiceNumber,
      },
      theme: {
        color: "#3399cc"
      },
    };
    console.log("1");
    const razorpay = new (window as any).Razorpay(razorpayOptions);
    razorpay.open();
  };


  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(parseFloat(amount));
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-IN');
  };

  const getDuePriority = (dueDate: Date | string | null | undefined) => {
    if (!dueDate) return { priority: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' };

    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { priority: 'Overdue', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    } else if (diffDays <= 3) {
      return { priority: 'High', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' };
    } else if (diffDays <= 7) {
      return { priority: 'Medium', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' };
    } else {
      return { priority: 'Low', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' };
    }
  };

  // Calculate stats
  const totalPending = paymentQueue.reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0);
  const totalPaidToday = paidInvoices
    .filter(invoice => {
      const today = new Date();
      const invoiceDate = new Date(invoice.updatedAt);
      return invoiceDate.toDateString() === today.toDateString();
    })
    .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0);

  const totalPaidThisMonth = paidInvoices
    .filter(invoice => {
      const today = new Date();
      const invoiceDate = new Date(invoice.updatedAt);
      return invoiceDate.getMonth() === today.getMonth() &&
        invoiceDate.getFullYear() === today.getFullYear();
    })
    .reduce((sum, invoice) => sum + parseFloat(invoice.totalAmount), 0);
  console.log("Payment History:", paymentHistory);
  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Payment Approvals</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Review and approve invoices for payment processing.
            </p>
          </div>
          {selectedInvoices.size > 0 && (
            <Button
              onClick={handleBatchApprove}
              disabled={processPaymentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Process {selectedInvoices.size} Payment{selectedInvoices.size > 1 ? 's' : ''}
            </Button>
          )}
        </div>

        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Pending Payments</p>
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                    {formatCurrency(totalPending.toString())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Approved Today</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(totalPaidToday.toString())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">This Month</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {formatCurrency(totalPaidThisMonth.toString())}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment Queue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Payment Queue ({paymentQueue.length})</CardTitle>
            {paymentQueue.length > 0 && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedInvoices.size === paymentQueue.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Select All</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : paymentQueue.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Pending Payments
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  All approved invoices have been processed for payment.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedInvoices.size === paymentQueue.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentQueue.map((invoice) => {
                      const priority = getDuePriority(invoice.dueDate);
                      return (
                        <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell>
                            <Checkbox
                              checked={selectedInvoices.has(invoice.id)}
                              onCheckedChange={(checked) => handleSelectInvoice(invoice.id, !!checked)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell>{invoice.vendorName}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-gray-400">
                            {invoice.dueDate ? formatDate(invoice.dueDate) : 'No due date'}
                          </TableCell>
                          <TableCell>
                            <Badge className={priority.color}>
                              {priority.priority}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                onClick={() => handleSinglePayment(invoice.id)}
                                disabled={processPaymentMutation.isPending}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                Pay Now
                              </Button>
                              {/* <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button> */}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Annie */}

        {/* Payment History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Payment History ({paymentHistory.length})</CardTitle>
          </CardHeader>
          <CardContent>

            {paymentHistory.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-400">No payments have been made yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice No</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Payment ID</TableHead>
                    </TableRow>
                  </TableHeader>



                  <TableBody>
                    {paymentHistory.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.vendorName || invoice.vendorId.name}</TableCell>
                        <TableCell>{formatCurrency(invoice.totalAmount)}</TableCell>
                        <TableCell>{formatDate(invoice.updatedAt)}</TableCell>
                        <TableCell>PAY-{invoice.invoiceNumber}</TableCell> 
                        {/* <TableCell>{invoice.razorpayPaymentId}</TableCell> */}
                      </TableRow>
                    ))}
                  </TableBody>


                </Table>
              </div>
            )}
          </CardContent>
        </Card>


      </div>
    </DashboardLayout>
  );
}
