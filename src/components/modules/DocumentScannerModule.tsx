import React, { useState, useRef, useEffect } from 'react';
import { 
  FileScan, 
  Camera, 
  SwitchCamera, 
  Upload, 
  Check, 
  Trash2, 
  Download, 
  ZoomIn, 
  X, 
  Sparkles, 
  FolderArchive,
  RefreshCw,
  Plus,
  FileText,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Layers,
  Share2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { ScannedDocumentItem, DocumentFilterType } from '../../types';
import { localDB } from '../../services/db';
import { vibratePhone } from '../../services/device';

interface DocumentScannerModuleProps {
  onRefreshStats: () => void;
}

interface ScannedPageItem {
  id: string;
  rawUrl: string;
  processedUrl: string;
  filter: DocumentFilterType;
}

export const DocumentScannerModule: React.FC<DocumentScannerModuleProps> = ({ onRefreshStats }) => {
  const [documents, setDocuments] = useState<ScannedDocumentItem[]>([]);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [activeFilter, setActiveFilter] = useState<DocumentFilterType>('document_bw');
  const [selectedCategory, setSelectedCategory] = useState<'فاکتور و رسید' | 'مدرک شناسایی' | 'چک بانکی' | 'قرارداد و نامه' | 'سایر'>('قرارداد و نامه');
  const [docTitle, setDocTitle] = useState<string>('');
  const [docNotes, setDocNotes] = useState<string>('');
  
  // Consecutive Multi-Page Scan state
  const [scannedPages, setScannedPages] = useState<ScannedPageItem[]>([]);
  const [selectedPageIndex, setSelectedPageIndex] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [activeViewingDoc, setActiveViewingDoc] = useState<ScannedDocumentItem | null>(null);
  const [viewingDocPageIndex, setViewingDocPageIndex] = useState<number>(0);
  const [flashFeedback, setFlashFeedback] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    loadDocuments();
    return () => {
      stopCamera();
    };
  }, []);

  const loadDocuments = async () => {
    const list = await localDB.getDocuments();
    setDocuments(list);
  };

  const startCamera = async (mode = facingMode) => {
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      vibratePhone(25);
    } catch (err) {
      console.warn('Camera error:', err);
      alert('دسترسی به دوربین توسط مرورگر مجاز نیست یا در دستگاه دیگری مشغول است.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const toggleFacing = () => {
    const next = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(next);
    if (isCameraActive) {
      startCamera(next);
    }
  };

  // Image Processing Filters on Canvas
  const applyDocumentFilter = (imageSrc: string, filterType: DocumentFilterType): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageSrc);
          return;
        }

        ctx.drawImage(img, 0, 0);

        if (filterType === 'original') {
          resolve(canvas.toDataURL('image/jpeg', 0.85));
          return;
        }

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Luminance formula
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          if (filterType === 'document_bw') {
            // Adaptive high contrast document scanner filter
            // Whitens paper background, sharpens text
            const threshold = 135;
            const bw = gray > threshold ? Math.min(255, gray * 1.35) : Math.max(0, gray * 0.45);
            data[i] = bw;
            data[i + 1] = bw;
            data[i + 2] = bw;
          } else if (filterType === 'enhanced_color') {
            // Boost colors, reduce paper shadows
            data[i] = Math.min(255, (r - 128) * 1.3 + 138);
            data[i + 1] = Math.min(255, (g - 128) * 1.3 + 138);
            data[i + 2] = Math.min(255, (b - 128) * 1.3 + 138);
          } else if (filterType === 'grayscale') {
            data[i] = gray;
            data[i + 1] = gray;
            data[i + 2] = gray;
          }
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = imageSrc;
    });
  };

  // Consecutive Page Capture from Video
  const handleCaptureConsecutivePage = async () => {
    if (!videoRef.current || !isCameraActive) return;
    vibratePhone(40);

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const rawUrl = canvas.toDataURL('image/jpeg', 0.9);

    setIsProcessing(true);
    const processed = await applyDocumentFilter(rawUrl, activeFilter);
    setIsProcessing(false);

    const newPage: ScannedPageItem = {
      id: 'page_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      rawUrl,
      processedUrl: processed,
      filter: activeFilter,
    };

    setScannedPages((prev) => {
      const updated = [...prev, newPage];
      setSelectedPageIndex(updated.length - 1);
      return updated;
    });

    const pageNumber = scannedPages.length + 1;
    setFlashFeedback(`صفحه ${pageNumber} اسکن شد! آماده برای صفحه بعدی`);
    setTimeout(() => setFlashFeedback(null), 2500);

    if (!docTitle) {
      setDocTitle(`سند چندصفحه‌ای ${new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`);
    }
  };

  // Multiple File Upload (Consecutive)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    vibratePhone(25);
    setIsProcessing(true);

    const newItems: ScannedPageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string);
        reader.readAsDataURL(file);
      });

      const processed = await applyDocumentFilter(dataUrl, activeFilter);
      newItems.push({
        id: 'page_' + Date.now() + '_' + i,
        rawUrl: dataUrl,
        processedUrl: processed,
        filter: activeFilter,
      });
    }

    setScannedPages((prev) => {
      const updated = [...prev, ...newItems];
      setSelectedPageIndex(updated.length - 1);
      return updated;
    });

    setIsProcessing(false);
    if (!docTitle) {
      setDocTitle(files[0].name.replace(/\.[^/.]+$/, '') || 'سند اسکن شده');
    }
  };

  // Change filter for currently selected page or all pages
  const handleChangeFilter = async (filter: DocumentFilterType, applyToAll = false) => {
    vibratePhone(20);
    setActiveFilter(filter);
    if (scannedPages.length === 0) return;

    setIsProcessing(true);
    if (applyToAll) {
      const updated = await Promise.all(
        scannedPages.map(async (page) => ({
          ...page,
          filter,
          processedUrl: await applyDocumentFilter(page.rawUrl, filter),
        }))
      );
      setScannedPages(updated);
    } else {
      const target = scannedPages[selectedPageIndex];
      if (target) {
        const processed = await applyDocumentFilter(target.rawUrl, filter);
        const updated = [...scannedPages];
        updated[selectedPageIndex] = { ...target, filter, processedUrl: processed };
        setScannedPages(updated);
      }
    }
    setIsProcessing(false);
  };

  // Delete a single page from current scan
  const handleDeletePage = (index: number) => {
    vibratePhone(20);
    const updated = scannedPages.filter((_, idx) => idx !== index);
    setScannedPages(updated);
    if (selectedPageIndex >= updated.length) {
      setSelectedPageIndex(Math.max(0, updated.length - 1));
    }
  };

  // Reorder pages
  const handleMovePage = (index: number, direction: 'up' | 'down') => {
    vibratePhone(15);
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= scannedPages.length) return;

    const copy = [...scannedPages];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, moved);
    setScannedPages(copy);
    setSelectedPageIndex(targetIdx);
  };

  // Generate Multi-Page PDF using jsPDF
  const generatePdfBlob = async (pagesList: string[], title: string): Promise<jsPDF> => {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < pagesList.length; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const imgData = pagesList[i];
      // Create image to measure dimensions
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const imgRatio = img.width / img.height;
          const pageRatio = pdfWidth / pdfHeight;

          let renderW = pdfWidth;
          let renderH = pdfHeight;
          let posX = 0;
          let posY = 0;

          if (imgRatio > pageRatio) {
            renderW = pdfWidth - 10;
            renderH = renderW / imgRatio;
            posX = 5;
            posY = (pdfHeight - renderH) / 2;
          } else {
            renderH = pdfHeight - 10;
            renderW = renderH * imgRatio;
            posX = (pdfWidth - renderW) / 2;
            posY = 5;
          }

          pdf.addImage(imgData, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
          resolve();
        };
        img.src = imgData;
      });
    }

    return pdf;
  };

  // Convert & Download Multi-page PDF
  const handleConvertAndDownloadPdf = async () => {
    if (scannedPages.length === 0) return;
    vibratePhone(40);
    setIsExportingPdf(true);

    try {
      const pageImages = scannedPages.map((p) => p.processedUrl);
      const filename = `${(docTitle || 'اسناد_اسکن_شده').trim().replace(/\s+/g, '_')}_${scannedPages.length}صفحه.pdf`;
      const pdf = await generatePdfBlob(pageImages, docTitle);
      pdf.save(filename);

      setFlashFeedback(`فایل PDF (${scannedPages.length} صفحه) با موفقیت تولید و دانلود شد.`);
      setTimeout(() => setFlashFeedback(null), 3500);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('خطا در تولید فایل PDF. لطفا مجددا تلاش کنید.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Save to Database
  const handleSaveDocument = async () => {
    if (scannedPages.length === 0 || !docTitle.trim()) return;

    vibratePhone(40);
    const pagesUrls = scannedPages.map((p) => p.processedUrl);
    const primaryPreview = pagesUrls[0];

    const newDoc: ScannedDocumentItem = {
      id: 'doc_' + Date.now(),
      title: docTitle.trim(),
      category: selectedCategory,
      filterApplied: activeFilter,
      imageUrl: primaryPreview,
      pages: pagesUrls,
      pageCount: pagesUrls.length,
      fileSize: `${Math.round((pagesUrls.reduce((a, b) => a + b.length, 0)) / 1024)} KB`,
      createdAt: Date.now(),
      notes: docNotes.trim() || undefined,
    };

    await localDB.saveDocument(newDoc);
    setScannedPages([]);
    setSelectedPageIndex(0);
    setDocTitle('');
    setDocNotes('');
    stopCamera();
    await loadDocuments();
    onRefreshStats();

    setFlashFeedback('سند چندصفحه‌ای در بایگانی ذخیره شد.');
    setTimeout(() => setFlashFeedback(null), 3000);
  };

  // Download PDF from Saved Archive
  const handleDownloadSavedDocPdf = async (doc: ScannedDocumentItem) => {
    vibratePhone(30);
    const pages = (doc.pages && doc.pages.length > 0) ? doc.pages : [doc.imageUrl];
    const pdf = await generatePdfBlob(pages, doc.title);
    pdf.save(`${doc.title.replace(/\s+/g, '_')}.pdf`);
  };

  const handleDeleteDoc = async (id: string) => {
    if (window.confirm('آیا از حذف این سند از بایگانی مطمئن هستید؟')) {
      await localDB.deleteDocument(id);
      if (activeViewingDoc?.id === id) {
        setActiveViewingDoc(null);
      }
      await loadDocuments();
      onRefreshStats();
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-12">
      {/* Header & Mode Switcher */}
      <div className="p-5 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <FileScan className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">اسکنر متوالی اسناد و تبدیل به PDF</h2>
              <p className="text-[11px] text-slate-400">اسکن پشت‌سر‌هم صفحات، تفکیک فیلترها و خروجی مستقیم فایل استاندارد PDF</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold cursor-pointer transition-all active:scale-95">
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>انتخاب عکس‌ها</span>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Viewport: Live Camera or Current Scanned Page Review */}
        <div className="relative rounded-3xl overflow-hidden bg-black border border-slate-800 aspect-4/3 flex flex-col items-center justify-center shadow-inner">
          {/* Live Camera View */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {/* When Camera Active: Document Frame Overlay */}
          {isCameraActive && (
            <div className="absolute inset-4 sm:inset-8 border-2 border-dashed border-amber-400/80 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
              <div className="flex justify-between items-center text-[11px] font-mono text-amber-300 bg-black/60 px-2.5 py-1 rounded-full self-center">
                <span>اسکن متوالی: صفحه {scannedPages.length + 1}</span>
              </div>
              <div className="text-[10px] text-center text-slate-300 bg-black/60 px-3 py-1 rounded-full self-center">
                سند را درون کادر قرار دهید و دکمه شاتر را بزنید
              </div>
            </div>
          )}

          {/* When Camera Inactive and Has Scanned Pages: Preview of Selected Page */}
          {!isCameraActive && scannedPages.length > 0 && (
            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 p-2">
              <img
                src={scannedPages[selectedPageIndex]?.processedUrl}
                alt="Selected Page"
                className="max-h-full max-w-full object-contain rounded-xl shadow-2xl"
              />
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/80 backdrop-blur-md text-amber-400 font-mono text-xs border border-amber-400/30">
                صفحه {selectedPageIndex + 1} از {scannedPages.length}
              </div>
            </div>
          )}

          {/* When Inactive and No Pages: Idle Screen */}
          {!isCameraActive && scannedPages.length === 0 && (
            <div className="text-center p-6 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mx-auto text-amber-400 shadow-xl">
                <Camera className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">دوربین اسکنر غیرفعال است</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                  برای شروع اسکن متوالی اسناد و قراردادها، دوربین را روشن کرده یا عکس‌های خود را آپلود نمایید.
                </p>
              </div>
              <button
                onClick={() => startCamera()}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>شروع اسکن متوالی</span>
              </button>
            </div>
          )}

          {/* Active Camera Controls Overlay (Bottom Shutter Bar) */}
          {isCameraActive && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 px-4 z-10">
              <button
                onClick={toggleFacing}
                className="w-11 h-11 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-200 flex items-center justify-center active:scale-90 transition-all"
                title="تغییر دوربین جلو/پشت"
              >
                <SwitchCamera className="w-5 h-5" />
              </button>

              {/* Shutter Capture Button */}
              <button
                onClick={handleCaptureConsecutivePage}
                disabled={isProcessing}
                className="w-16 h-16 rounded-full bg-amber-400 hover:bg-amber-300 p-1.5 flex items-center justify-center shadow-xl shadow-amber-400/40 active:scale-90 transition-all"
                title="اسکن این صفحه"
              >
                <div className="w-full h-full rounded-full border-2 border-slate-950 flex items-center justify-center bg-white/20">
                  <div className="w-7 h-7 rounded-full bg-amber-500" />
                </div>
              </button>

              {/* Stop Camera / Done Scanning */}
              <button
                onClick={stopCamera}
                className="px-3.5 py-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white font-bold text-xs flex items-center gap-1.5 active:scale-90 transition-all"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>اتمام دوربین ({scannedPages.length})</span>
              </button>
            </div>
          )}
        </div>

        {/* Flash Feedback Banner */}
        {flashFeedback && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 font-medium">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{flashFeedback}</span>
          </div>
        )}

        {/* Multi-Page Carousel & Management Bar */}
        {scannedPages.length > 0 && (
          <div className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">صفحات اسکن شده ({scannedPages.length} صفحه)</span>
              </div>
              <div className="flex items-center gap-1.5">
                {!isCameraActive && (
                  <button
                    onClick={() => startCamera()}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>افزودن صفحه بعدی با دوربین</span>
                  </button>
                )}
              </div>
            </div>

            {/* Thumbnails Row */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
              {scannedPages.map((page, idx) => (
                <div
                  key={page.id}
                  onClick={() => setSelectedPageIndex(idx)}
                  className={`relative shrink-0 w-20 h-28 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                    selectedPageIndex === idx
                      ? 'border-amber-400 ring-2 ring-amber-400/40 scale-105 shadow-lg'
                      : 'border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={page.processedUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded bg-black/80 text-[9px] font-mono text-white">
                    {idx + 1}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePage(idx);
                    }}
                    className="absolute top-1 left-1 p-1 rounded-full bg-rose-600/90 text-white hover:bg-rose-500"
                    title="حذف صفحه"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Filter Selector for Documents */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-900 text-xs">
              <span className="text-slate-400 text-[11px]">فیلتر کنتراست سند:</span>
              <div className="flex gap-1.5">
                {[
                  { id: 'document_bw', label: 'سیاه و سفید اداری' },
                  { id: 'enhanced_color', label: 'رنگی تقویت‌شده' },
                  { id: 'grayscale', label: 'خاکستری' },
                  { id: 'original', label: 'عادی بدون فیلتر' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleChangeFilter(f.id as DocumentFilterType, true)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-all ${
                      activeFilter === f.id
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Title & Category Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <div>
                <label className="text-[10px] font-semibold text-slate-400 mb-1 block">عنوان سند:</label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="مثلاً قرارداد استخدام، فاکتور خرید لپ‌تاپ..."
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-slate-400 mb-1 block">دسته‌بندی:</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-hidden"
                >
                  <option value="قرارداد و نامه">قرارداد و نامه</option>
                  <option value="فاکتور و رسید">فاکتور و رسید</option>
                  <option value="مدرک شناسایی">مدرک شناسایی</option>
                  <option value="چک بانکی">چک بانکی</option>
                  <option value="سایر">سایر</option>
                </select>
              </div>
            </div>

            {/* Action Buttons: Convert to PDF & Save */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {/* PRIMARY REQUIREMENT: Convert to PDF format */}
              <button
                type="button"
                onClick={handleConvertAndDownloadPdf}
                disabled={isExportingPdf}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all active:scale-95"
              >
                <FileText className="w-4 h-4" />
                <span>
                  {isExportingPdf ? 'در حال تبدیل صفحات به PDF...' : `تبدیل و دانلود فایل PDF (${scannedPages.length} صفحه)`}
                </span>
              </button>

              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={!docTitle.trim()}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                <span>ذخیره در بایگانی هوشمند</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scanned Documents Archive */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">بایگانی اسناد اسکن‌شده ({documents.length})</span>
          </div>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center rounded-3xl bg-slate-900/40 border border-slate-800 text-slate-500 text-xs space-y-1.5">
            <FileScan className="w-8 h-8 mx-auto opacity-30 text-amber-400" />
            <p>هنوز سندی اسکن و ذخیره نشده است.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {documents.map((doc) => {
              const pagesCount = doc.pageCount || (doc.pages ? doc.pages.length : 1);
              return (
                <div
                  key={doc.id}
                  className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col justify-between gap-3 transition-all group"
                >
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div
                      onClick={() => {
                        setActiveViewingDoc(doc);
                        setViewingDocPageIndex(0);
                      }}
                      className="w-16 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-slate-800 cursor-pointer relative"
                    >
                      <img src={doc.imageUrl} alt={doc.title} className="w-full h-full object-cover group-hover:scale-105 transition-all" />
                      <div className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[8px] font-mono text-amber-300">
                        {pagesCount} صفحه
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-white truncate">{doc.title}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 shrink-0">
                          {doc.category}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 mt-1">
                        {new Date(doc.createdAt).toLocaleDateString('fa-IR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>

                      {doc.notes && (
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{doc.notes}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
                    <button
                      onClick={() => handleDownloadSavedDocPdf(doc)}
                      className="px-2.5 py-1 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 text-[11px] font-semibold flex items-center gap-1 active:scale-95 transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>دانلود PDF ({pagesCount} صفحه)</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setActiveViewingDoc(doc);
                          setViewingDocPageIndex(0);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
                        title="مشاهده بزرگ"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                        title="حذف سند"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Screen Multi-Page Viewing Modal */}
      {activeViewingDoc && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">{activeViewingDoc.title}</h3>
                <span className="text-[11px] text-slate-400">
                  صفحه {viewingDocPageIndex + 1} از {((activeViewingDoc.pages?.length) || 1)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadSavedDocPdf(activeViewingDoc)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white font-bold text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-4 h-4" />
                  <span>دریافت PDF</span>
                </button>
                <button
                  onClick={() => setActiveViewingDoc(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer area with next/prev buttons */}
            <div className="relative flex-1 bg-black p-4 flex items-center justify-center overflow-auto min-h-[350px]">
              <img
                src={
                  activeViewingDoc.pages && activeViewingDoc.pages[viewingDocPageIndex]
                    ? activeViewingDoc.pages[viewingDocPageIndex]
                    : activeViewingDoc.imageUrl
                }
                alt="Document view"
                className="max-h-[60vh] max-w-full object-contain rounded-xl shadow-2xl"
              />

              {activeViewingDoc.pages && activeViewingDoc.pages.length > 1 && (
                <>
                  <button
                    disabled={viewingDocPageIndex === 0}
                    onClick={() => setViewingDocPageIndex((p) => Math.max(0, p - 1))}
                    className="absolute right-3 p-2 rounded-full bg-slate-900/80 text-white disabled:opacity-30 hover:bg-slate-800"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  <button
                    disabled={viewingDocPageIndex >= activeViewingDoc.pages.length - 1}
                    onClick={() => setViewingDocPageIndex((p) => Math.min(activeViewingDoc.pages!.length - 1, p + 1))}
                    className="absolute left-3 p-2 rounded-full bg-slate-900/80 text-white disabled:opacity-30 hover:bg-slate-800"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
