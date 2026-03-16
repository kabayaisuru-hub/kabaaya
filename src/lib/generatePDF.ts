import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Wait for all <img> tags inside an element to finish loading.
 * This is critical so that the signature image is rendered before html2canvas captures the DOM.
 */
const waitForImages = (element: HTMLElement): Promise<void> => {
  const images = element.querySelectorAll("img");
  if (images.length === 0) return Promise.resolve();

  const promises = Array.from(images).map((img) => {
    if (img.complete && img.naturalHeight > 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Don't block on broken images
    });
  });

  return Promise.all(promises).then(() => {});
};

/**
 * Sanitizes base64 strings to ensure they have the correct data URL prefix.
 */
const sanitizeImageData = (data: string, defaultType: string = 'png'): string => {
  if (!data) return '';
  if (data.startsWith('data:image/')) return data;
  
  // If it's just raw base64, add the prefix
  return `data:image/${defaultType};base64,${data}`;
};

/**
 * Helper to fetch a URL (like Supabase bucket) and return it as a Base64 string.
 */
const fetchImageAsBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

export const generatePDFReceipt = async (elementId: string, filename: string): Promise<boolean> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Receipt element not found: #" + elementId);
    return false;
  }

  try {
    // 1. Wait for all images to finish loading (like the logo)
    await waitForImages(element);

    // Extra safety delay
    await new Promise((r) => setTimeout(r, 500));

    // 2. Capture the element
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
    });

    const imgData = canvas.toDataURL("image/png", 1.0);
    
    // 3. Create PDF
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgProps = (pdf as any).getImageProperties(imgData, "PNG");
    const totalImgHeightInMm = (imgProps.height * pageWidth) / imgProps.width;

    let heightLeft = totalImgHeightInMm;
    let position = 0;

    // Add pages
    pdf.addImage(imgData, "PNG", 0, position, pageWidth, totalImgHeightInMm, undefined, "FAST");
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position -= pageHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pageWidth, totalImgHeightInMm, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    // 4. Save & Print
    pdf.save(filename);

    // Auto-print logic
    try {
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      iframe.src = url;
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print();
          // Cleanup
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      };
    } catch (printErr) {
      console.warn("Auto-print failed, but PDF was saved:", printErr);
    }

    return true;
  } catch (error) {
    console.error("Error generating PDF:", error);
    return false;
  }
};
