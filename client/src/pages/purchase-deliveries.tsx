import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function InvoiceMatching() {
  // Query for Invoices
  const { data: recentInvoices = [], isLoading: isInvoicesLoading, error: invoicesError } = useQuery({
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

  // Query for Purchase Orders
  const { data: recentPOs = [], isLoading: isPOsLoading, error: poError } = useQuery({
    queryKey: ['/api/purchase-orders'],
    queryFn: async () => {
      const response = await fetch('/api/purchase-orders', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch purchase orders');
      return response.json();
    },
    select: (data: any[]) => data.slice(0, 10).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  });

  // Query for Deliveries
  const { data: recentDeliveries = [], isLoading: isDeliveriesLoading, error: deliveriesError } = useQuery({
    queryKey: ['/api/deliveries'],
    queryFn: async () => {
      const response = await fetch('/api/deliveries', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch deliveries');
      return response.json();
    },
    select: (data: any[]) => data.slice(0, 10).sort((a, b) => 
      new Date(b.deliveryDate).getTime() - new Date(a.deliveryDate).getTime()
    ),
  });

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

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Invoice Matching</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View recent invoices, purchase orders, deliveries, and their matching results.
          </p>
        </div>

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {isInvoicesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : invoicesError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                Error fetching invoices: {(invoicesError as any).message}
              </div>
            ) : (
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>{invoice.vendorId?.name || 'N/A'}</TableCell>
                        <TableCell>₹{parseFloat(invoice.totalAmount || 0).toLocaleString()}</TableCell>
                        <TableCell>
                          {invoice.items?.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Item Name</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Amount</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {invoice.items.map((item: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.iname || 'N/A'}</TableCell>
                                    <TableCell>{item.units || 0}</TableCell>
                                    <TableCell>₹{parseFloat(item.amt || 0).toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <span>No items</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No invoices found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Purchase Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {isPOsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : poError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                Error fetching purchase orders: {(poError as any).message}
              </div>
            ) : (
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentPOs.map((po: any) => (
                      <TableRow key={po.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{po.poNumber}</TableCell>
                        <TableCell>{po.vendorName}</TableCell>
                        <TableCell>₹{parseFloat(po.amount).toLocaleString()}</TableCell>
                        <TableCell>
                          {po.items?.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Unit Price</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {po.items.map((item: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.description || 'N/A'}</TableCell>
                                    <TableCell>{item.quantity || 0}</TableCell>
                                    <TableCell>₹{parseFloat(item.unitPrice || 0).toLocaleString()}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <span>No items</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentPOs.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No purchase orders found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Deliveries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Deliveries (GR)</CardTitle>
          </CardHeader>
          <CardContent className="max-h-[400px] overflow-y-auto">
            {isDeliveriesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : deliveriesError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                Error fetching deliveries: {(deliveriesError as any).message}
              </div>
            ) : (
              <div className="min-w-full">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Delivery Number</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Vendor Name</TableHead>
                      <TableHead>Items</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentDeliveries.map((delivery: any) => (
                      <TableRow key={delivery.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{delivery.deliveryNumber}</TableCell>
                        <TableCell>{delivery.poId}</TableCell>
                        <TableCell>{delivery.vendorName}</TableCell>
                        <TableCell>
                          {delivery.items?.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Quantity Ordered</TableHead>
                                  <TableHead>Quantity Delivered</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {delivery.items.map((item: any, index: number) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.description || 'N/A'}</TableCell>
                                    <TableCell>{item.quantityOrdered || 0}</TableCell>
                                    <TableCell>{item.quantityDelivered || 0}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <span>No items</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentDeliveries.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No deliveries found.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        {/* Matching Table */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Matching Results</CardTitle>
          </CardHeader>
          <CardContent>
            {isInvoicesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse flex space-x-4 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/6"></div>
                  </div>
                ))}
              </div>
            ) : invoicesError ? (
              <div className="text-center py-8 text-red-500 dark:text-red-400">
                Error fetching matching results: {(invoicesError as any).message}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice Number</TableHead>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Delivery Number</TableHead>
                      <TableHead>Matching Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                        <TableCell>
                          {invoice.matchingResults?.poMatch?.matched ? 
                            invoice.matchingResults.poMatch.poNumber : 'No Match'}
                        </TableCell>
                        <TableCell>
                          {invoice.matchingResults?.deliveryMatch?.matched ? 
                            invoice.matchingResults.deliveryMatch.deliveryNumber : 'No Match'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getMatchingScoreColor(invoice.matchingResults?.overallScore)}>
                            {invoice.matchingResults ? 
                              `${Math.round(invoice.matchingResults.overallScore * 100)}%` : 
                              'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {recentInvoices.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No matching results found.
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
