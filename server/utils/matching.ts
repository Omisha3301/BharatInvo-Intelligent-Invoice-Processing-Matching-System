// Updated invoice matching logic with refined matching criteria (without date match)
import { storage } from "../storage/mongoStorage";
import { Invoice, PurchaseOrder, Delivery } from "@shared/schema";
import * as fuzz from 'fuzzball';
import { log } from './vite';

function calculateStringSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  return fuzz.ratio(str1.toLowerCase(), str2.toLowerCase()) / 100;
}

interface ItemMatchResult {
  poItem: any;
  invoiceItem: any;
  grItem?: any;
  descriptionSimilarity: number;
  quantityMatch: boolean;
  priceMatch: boolean;
}

interface MatchingResults {
  poMatch: {
    matched: boolean;
    confidence: number;
    poNumber?: string;
  };
  deliveryMatch: {
    matched: boolean;
    confidence: number;
    deliveryNumber?: string;
  };
  amountMatch: {
    matched: boolean;
    variance: number;
  };
  itemMatches: ItemMatchResult[];
  flags: string[];
  overallScore: number;
}

async function performInvoiceMatching(ocrData: any): Promise<MatchingResults> {
  log(`Starting invoice matching with OCR data: ${JSON.stringify(ocrData, null, 2)}`);
  const purchaseOrders = await storage.getAllPurchaseOrders();
  const deliveries = await storage.getAllDeliveries();
  const existingInvoices = await storage.getAllInvoices();

  const vendorName = (ocrData.vendorId?.name ?? "").toLowerCase();
  const invoiceAmount = parseFloat(ocrData.totalAmount ?? 0);

  let bestPOMatch: PurchaseOrder | null = null;
  let poMatchConfidence = 0;

  for (const po of purchaseOrders) {
    const vendorSimilarity = calculateStringSimilarity(
      vendorName,
      po.vendorName.toLowerCase()
    );

    const poAmount = parseFloat(po.amount);
    const amountVariance = Math.abs(poAmount - invoiceAmount) / poAmount;
    const amountScore = amountVariance <= 0.1 ? 1 : Math.max(0, 1 - amountVariance);

    const itemMatches = matchItems(ocrData.items || [], po.items || []);
    const itemMatchScore = itemMatches.length > 0 
      ? itemMatches.reduce((sum, match) => sum + match.descriptionSimilarity * (match.priceMatch ? 1 : 0.5), 0) / itemMatches.length
      : 0;

    const confidence = (vendorSimilarity * 0.4 + amountScore * 0.3 + itemMatchScore * 0.3);

    if (confidence > poMatchConfidence && confidence > 0.7) {
      poMatchConfidence = confidence;
      bestPOMatch = po;
    }
  }

  let bestDeliveryMatch: Delivery | null = null;
  let deliveryMatchConfidence = 0;
  let finalItemMatches: ItemMatchResult[] = [];

  if (bestPOMatch) {
    const relatedDeliveries = await storage.getDeliveriesByPO(bestPOMatch.poNumber);

    for (const delivery of relatedDeliveries) {
      const vendorSimilarity = calculateStringSimilarity(
        vendorName,
        delivery.vendorName.toLowerCase()
      );

      const deliveryItemMatches = matchItemsWithDelivery(
        ocrData.items || [],
        bestPOMatch.items || [],
        delivery.items || []
      );
      const deliveryItemScore = deliveryItemMatches.length > 0
        ? deliveryItemMatches.reduce((sum, match) => sum + match.descriptionSimilarity * (match.quantityMatch ? 1 : 0.5), 0) / deliveryItemMatches.length
        : 0;

      const confidence = (vendorSimilarity * 0.5 + deliveryItemScore * 0.5);

      if (confidence > deliveryMatchConfidence && confidence > 0.6) {
        deliveryMatchConfidence = confidence;
        bestDeliveryMatch = delivery;
        finalItemMatches = deliveryItemMatches;
      }
    }
  }

  let amountMatch = { matched: false, variance: 0 };
  if (bestPOMatch) {
    const poAmount = parseFloat(bestPOMatch.amount);
    const variance = Math.abs(poAmount - invoiceAmount);
    const variancePercent = variance / poAmount;
    amountMatch = {
      matched: variancePercent <= 0.05,
      variance: variance
    };
  }

  const flags: string[] = [];
  if (!bestPOMatch) {
    flags.push("No matching Purchase Order found");
  } else if (poMatchConfidence < 0.9) {
    flags.push("Low confidence PO match");
  }

  if (!bestDeliveryMatch) {
    flags.push("No delivery record found");
  }

  if (!amountMatch.matched && bestPOMatch) {
    flags.push(`Amount exceeds PO by ₹${amountMatch.variance.toLocaleString()}`);
  }

  const duplicateCheck = existingInvoices.find(inv => 
    inv.invoiceNumber === ocrData.invoiceNumber && 
    inv.vendorId.name.toLowerCase() === vendorName
  );
  if (duplicateCheck) {
    flags.push("Potential duplicate invoice detected");
  }

  if (bestDeliveryMatch && finalItemMatches.length > 0) {
    finalItemMatches.forEach((match, index) => {
      if (match.descriptionSimilarity < 0.8) {
        flags.push(`Item ${index + 1}: Low description similarity (${(match.descriptionSimilarity * 100).toFixed(2)}%)`);
      }
      if (!match.quantityMatch) {
        flags.push(`Item ${index + 1}: Quantity mismatch`);
      }
    });
  } else {
    flags.push("No matching delivery items found");
  }

  const overallScore = (poMatchConfidence + deliveryMatchConfidence + (amountMatch.matched ? 1 : 0)) / 3;

  if (poMatchConfidence < 1) {
    flags.push(`PO match confidence below perfect: ${(poMatchConfidence * 100).toFixed(0)}%`);
  }
  if (deliveryMatchConfidence < 1) {
    flags.push(`Delivery match confidence below perfect: ${(deliveryMatchConfidence * 100).toFixed(0)}%`);
  }
  if (!amountMatch.matched) {
    flags.push("Amount does not exactly match PO");
  }

  return {
    poMatch: bestPOMatch ? {
      matched: true,
      confidence: poMatchConfidence,
      poNumber: bestPOMatch.poNumber
    } : { matched: false, confidence: 0 },

    deliveryMatch: bestDeliveryMatch ? {
      matched: true,
      confidence: deliveryMatchConfidence,
      deliveryNumber: bestDeliveryMatch.deliveryNumber
    } : { matched: false, confidence: 0 },

    amountMatch,
    itemMatches: finalItemMatches,
    flags,
    overallScore
  };
}

function matchItems(invoiceItems: any[], poItems: any[]): ItemMatchResult[] {
  const matches: ItemMatchResult[] = [];

  for (const invoiceItem of invoiceItems) {
    let bestMatch: ItemMatchResult | null = null;
    let bestSimilarity = 0;

    for (const poItem of poItems) {
      const descriptionSimilarity = calculateStringSimilarity(
        invoiceItem.iname?.toLowerCase() || "",
        poItem.description?.toLowerCase() || ""
      );

      const priceMatch = Math.abs((invoiceItem.amt ?? 0) - (poItem.unitPrice ?? 0)) / (poItem.unitPrice || 1) <= 0.05;

      if (descriptionSimilarity > bestSimilarity && priceMatch && descriptionSimilarity > 0.7) {
        bestSimilarity = descriptionSimilarity;
        bestMatch = {
          poItem,
          invoiceItem,
          descriptionSimilarity,
          quantityMatch: false,
          priceMatch
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
    }
  }

  return matches;
}

function matchItemsWithDelivery(invoiceItems: any[], poItems: any[], deliveryItems: any[]): ItemMatchResult[] {
  const matches: ItemMatchResult[] = [];

  for (const invoiceItem of invoiceItems) {
    let bestMatch: ItemMatchResult | null = null;
    let bestSimilarity = 0;

    for (const deliveryItem of deliveryItems) {
      const deliveryDescriptionSimilarity = calculateStringSimilarity(
        invoiceItem.iname?.toLowerCase() || "",
        deliveryItem.description?.toLowerCase() || ""
      );

      if (deliveryDescriptionSimilarity < 0.7) continue;

      const quantityMatch = Math.abs((deliveryItem.quantityDelivered ?? 0) - (invoiceItem.units ?? 0)) <= 1;

      if (deliveryDescriptionSimilarity > bestSimilarity && quantityMatch) {
        bestSimilarity = deliveryDescriptionSimilarity;
        bestMatch = {
          invoiceItem,
          poItem: {},
          grItem: deliveryItem,
          descriptionSimilarity: deliveryDescriptionSimilarity,
          quantityMatch,
          priceMatch: false
        };
      }
    }

    if (bestMatch) {
      matches.push(bestMatch);
    }
  }

  return matches;
}

export { performInvoiceMatching, MatchingResults, ItemMatchResult };