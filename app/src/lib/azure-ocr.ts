import axios from 'axios';

interface OCRResult {
  text: string;
  pageCount: number;
  lineCount: number;
}

export async function performOCR(fileUrl: string): Promise<OCRResult> {
  const endpoint = process.env.AZURE_VISION_ENDPOINT;
  const key = process.env.AZURE_VISION_KEY;

  if (!endpoint || !key) {
    throw new Error('Azure credentials not configured');
  }

  // Submit OCR request
  const analyzeResponse = await axios.post(
    `${endpoint}/vision/v3.2/read/analyze`,
    { url: fileUrl },
    { headers: { 'Ocp-Apim-Subscription-Key': key } }
  );

  const operationLocation = analyzeResponse.headers['operation-location'];

  // Poll for results (max 30 attempts)
  let result;
  let attempts = 0;
  do {
    await new Promise(resolve => setTimeout(resolve, 1000));
    result = await axios.get(operationLocation, {
      headers: { 'Ocp-Apim-Subscription-Key': key }
    });
    attempts++;
  } while (
    (result.data.status === 'running' || result.data.status === 'notStarted') 
    && attempts < 30
  );

  if (result.data.status !== 'succeeded') {
    throw new Error(`OCR failed with status: ${result.data.status}`);
  }

  // Extract text
  const pages = result.data.analyzeResult.readResults;
  const lines = pages.flatMap((page: any) => page.lines.map((line: any) => line.text));
  const text = lines.join('\n');

  return {
    text,
    pageCount: pages.length,
    lineCount: lines.length,
  };
}

