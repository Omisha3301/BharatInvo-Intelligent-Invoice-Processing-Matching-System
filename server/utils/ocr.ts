import fs from 'fs';
import path from 'path';
import { Mistral } from '@mistralai/mistralai';
import mime from 'mime';
import dotenv from 'dotenv';
import { log } from './vite';

dotenv.config();

const mistral_apiKey = process.env.MISTRAL_API_KEY;

if (!mistral_apiKey) {
  throw new Error('MISTRAL_API_KEY is not defined in .env file');
}

const client = new Mistral({ apiKey: mistral_apiKey });

export async function processFile(filePath: string): Promise<any> {
  log(`Starting OCR processing for file: ${filePath}`);
  const ext = path.extname(filePath).toLowerCase();
  log(`Detected file extension: ${ext}`);

  let ocrMarkdown: string;

  try {
    if (ext === '.pdf') {
      ocrMarkdown = await processPdf(filePath);
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      ocrMarkdown = await processImage(filePath);
    } else {
      throw new Error(`Unsupported file type: ${ext}. Must be PDF or image (JPG, JPEG, PNG, WEBP).`);
    }

    const result = await generateStructuredJson(ocrMarkdown);
    
    // Normalize and validate result
    const normalizedResult = {
      invoiceNumber: result.invoiceNumber || `INV-${Date.now()}`,
      vendorId: {
        name: result.vendorId?.name || 'Unknown Vendor',
        email: result.vendorId?.email || '',
        phone: result.vendorId?.phone || '',
        address: result.vendorId?.address || '',
        taxId: result.vendorId?.taxId || '',
      },
      totalAmount: Number(result.totalAmount) || 0,
      date: result.date || new Date().toISOString().split('T')[0],
      dueDate: result.dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: Array.isArray(result.items) ? result.items.map(item => ({
        iname: item.iname || 'Unknown Item',
        amt: Number(item.amt) || 0,
        units: Number(item.units) || 1,
        t_amt: Number(item.t_amt) || (Number(item.amt) || 0) * (Number(item.units) || 1),
      })) : [],
      confidence: typeof result.confidence === 'number' && !isNaN(result.confidence) && result.confidence >= 0 && result.confidence <= 1 ? result.confidence : 0.5,
    };

    log(`OCR processing successful: ${JSON.stringify(normalizedResult, null, 2)}`);
    return normalizedResult;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown OCR error';
    log(`OCR processing failed: ${errorMsg}`);
    return {
      invoiceNumber: `INV-${Date.now()}`,
      vendorId: { name: 'Unknown Vendor', email: '', phone: '', address: '', taxId: '' },
      totalAmount: 0,
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      items: [],
      confidence: 0.5,
    };
  }
}

async function processPdf(filePath: string): Promise<string> {
  log(`Processing PDF: ${filePath}`);
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);

  const uploadedPdf = await client.files.upload({
    file: {
      fileName,
      content: fileBuffer,
    },
    purpose: 'ocr',
  });

  const signedUrl = await client.files.getSignedUrl({
    fileId: uploadedPdf.id,
  });

  const ocrResponse = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: {
      type: 'document_url',
      documentUrl: signedUrl.url,
    },
    includeImageBase64: true,
  });

  const markdown = ocrResponse.pages[0]?.markdown;
  if (!markdown) {
    throw new Error('OCR markdown is missing from PDF.');
  }
  log(`PDF OCR markdown extracted`);
  return markdown;
}

async function processImage(imagePath: string): Promise<string> {
  log(`Processing image: ${imagePath}`);
  const imageBuffer = fs.readFileSync(imagePath);
  const mimeType = mime.getType(imagePath) || '';

  log(`Detected MIME type: ${mimeType}`);

  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new Error(`Unsupported image type: ${mimeType || 'unknown'}`);
  }

  const base64Image = imageBuffer.toString('base64');
  const dataUrl = `data:${mimeType};base64,${base64Image}`;

  const ocrResponse = await client.ocr.process({
    model: 'mistral-ocr-latest',
    document: {
      type: 'image_url',
      imageUrl: dataUrl,
    },
    includeImageBase64: true,
  });

  const markdown = ocrResponse.pages[0]?.markdown;
  if (!markdown) {
    throw new Error('OCR markdown is missing from image.');
  }
  log(`Image OCR markdown extracted`);
  return markdown;
}

async function generateStructuredJson(ocrMarkdown: string): Promise<any> {
  log(`Generating structured JSON from markdown`);
  const formatOcr = `Extract the following structured data from this invoice image/text in JSON format matching the MongoDB schema:

  {
    "invoiceNumber": "<Invoice Number (e.g., INV-00123)>",
    "vendorId": {
      "name": "<Vendor Name>",
      "email": "<Vendor Email>",
      "phone": "<Vendor Phone Number>",
      "address": "<Vendor Address>",
      "taxId": "<Vendor Tax ID>"
    },
    "totalAmount": <Total invoice amount as a number with tax and discount if applicable>,
    "date": "<Invoice issue date in YYYY-MM-DD format>",
    "dueDate": "<Due date for payment in YYYY-MM-DD format>",
    "items": [
      {
        "iname": "<name of item>",
        "amt": <Unit price of item>,
        "units": <Number of units>,
        "t_amt": <Total amount for this line item (amt × units)>
      }
    ],
    "confidence": <Confidence score of OCR extraction as a number between 0.0 and 1.0>
  }

  Please extract the following fields from the invoice:
  - Invoice Number
  - Vendor Information: Name, Email, Phone, Address, Tax ID
  - Total Amount with tax and discount
  - Invoice Date
  - Due Date
  - For each item: Item Name (iname), Unit Price (amt), Quantity (units), Line Total (t_amt = amt × units)
  - Confidence: Estimate the confidence of the extraction (0.0 to 1.0) based on clarity and completeness of data`;

  const prompt = `This is OCR of an invoice in markdown:\n${ocrMarkdown}\nConvert this into a sensible structured JSON response in the following format: \n${formatOcr}. The output should be strictly JSON with no extra commentary.`;

  const chatResponse = await client.chat.complete({
    model: 'mistral-small-latest',
    messages: [{ role: 'user', content: prompt }],
    responseFormat: { type: 'json_object' },
  });

  const content = chatResponse.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('Invalid response from LLM.');
  }

  try {
    const result = JSON.parse(content);
    log(`Raw LLM JSON output: ${JSON.stringify(result, null, 2)}`);
    return result;
  } catch (error) {
    log(`Failed to parse LLM response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw new Error('Failed to parse LLM response as JSON');
  }
}