import { extractPdfTextLocally, isTextSubstantial } from '../src/lib/utils/server-pdf-extractor';
import { performLocalImageOCR } from '../src/lib/utils/local-ocr';
import fs from 'fs';
import path from 'path';

async function testPdfParse() {
  console.log('--- Testing PDF Parse ---');
  // We can test pdf-parse with a dummy minimal PDF buffer that contains the text 'Hello World from PDF'
  // 1.4 PDF structure with Hello World
  const minimalPdfBase64 = 
    `JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmoKPDwvTGVuZ3RoIDM2Pj4Kc3RyZWFtCkJUCjE0IFRmCjAg
    IFRkCihIZWxsbyBXb3JsZCBmcm9tIFBERikgVGoKRVQKZW5kc3RyZWFtCmVuZG9iago0IDAgb2JqCjw8
    L1R5cGUgL0ZvbnQKL1N1YnR5cGUgL1R5cGUxCi9OYW1lIC9GMQovQmFzZUZvbnQgL0hlbHZldGljYQo+
    PgplbmRvYmoKMSAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMyAwIFIKL01lZGlhQm94IFswIDAg
    MjUwIDUwXQovQ29udGVudHMgMiAwIFIKL1Jlc291cmNlcyA8PC9Gb250IDw8L0YxIDQgMCBSPj4+Pgo+
    PgplbmRvYmoKMyAwIG9iago8PC9UeXBlIC9QYWdlcwovQ291bnQgMQovS2lkcyBbMSAwIFJdCj4+CmVu
    ZG9iago1IDAgb2JqCjw8L1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDMgMCBSCj4+CmVuZG9iago2IDAgb2Jq
    Cjw8L1Byb2R1Y2VyIChNeSBQREYpCi9DcmVhdGlvbkRhdGUgKEQ6MjAyMzA4MjIxNjU1MzhaKQo+Pgpl
    bmRvYmoKeHJlZgowIDcKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMTcwIDAwMDAwIG4gCjAwMDAw
    MDAwMTUgMDAwMDAgbiAKMDAwMDAwMDI2NSAwMDAwMCBuIAowMDAwMDAwMDg4IDAwMDAwIG4gCjAwMDAw
    MDAwMzIyIDAwMDAwIG4gCjAwMDAwMDAwMzcyIDAwMDAwIG4gCnRyYWlsZXIKPDwvU2l6ZSA3Ci9Sb290
    IDUgMCBSCi9JbmZvIDYgMCBSCj4+CnN0YXJ0eHJlZgo0NjAKJSVFT0YK`;
    
  const pdfBuffer = Buffer.from(minimalPdfBase64.replace(/\s+/g, ''), 'base64');
  
  try {
    const result = await extractPdfTextLocally(pdfBuffer);
    console.log('Result:', result);
    console.log('Is substantial?', isTextSubstantial(result.text, result.pageCount));
  } catch (e) {
    console.error('PDF Parse failed:', e);
  }
}

async function main() {
  await testPdfParse();
}

main().catch(console.error);
