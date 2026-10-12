import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {
  QrCode,
  Camera,
  CameraOff,
  Upload,
  Smartphone,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  Download,
  Key,
  Clock,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Send,
  Zap,
  Info,
  Lock,
  Search,
  Check
} from 'lucide-react';
import { CyberButton } from './CyberButton';
import { CyberCard } from './CyberCard';
import { cyberSound } from '../utils/cyberSound';
import { formatINR } from '../App';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'ADMIN' | 'CUSTOMER';
  accountNumber?: string;
  balance?: number;
}

interface BankAccount {
  bankAccountId: number;
  customerId: number;
  bankName: string;
  maskedAccountNumber: string;
  accountNumber: string;
  balance: number;
  registeredMobile: string;
  status: 'CONNECTED' | 'ACTIVE' | 'FROZEN';
}

interface QRPayModuleProps {
  currentUser: User;
  bankAccount: BankAccount | null;
  onTransactionProcessed: (txResult: any) => void;
  onRefreshData: () => void;
  dangerGlow?: boolean;
}

interface ValidatedQRData {
  valid: boolean;
  trustLevel: string;
  signatureVerified: boolean;
  requestId: string;
  recipientAccount: string;
  recipientName: string;
  amount: number | null;
  isFixedAmount: boolean;
  description: string;
  expiresAt?: string;
  warning?: string;
  notes?: string;
}

interface PendingApprovalItem {
  approvalId: string;
  requestId: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  description: string;
  registeredMobile: string;
  maskedMobile: string;
  otpCode: string;
  expiresAt: string;
}

interface QRHistoryItem {
  id: string;
  approvalId?: string;
  userId: number;
  requestId: string;
  recipientName: string;
  recipientAccount: string;
  amount: number;
  description: string;
  status: 'APPROVED' | 'FLAGGED' | 'BLOCKED' | 'REJECTED';
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  referenceId?: string;
  registeredMobile: string;
  createdAt: string;
}

export const QRPayModule: React.FC<QRPayModuleProps> = ({
  currentUser,
  bankAccount,
  onTransactionProcessed,
  onRefreshData,
  dangerGlow = false
}) => {
  // Navigation tabs inside QR Pay
  const [activeQrTab, setActiveQrTab] = useState<'scan' | 'generate' | 'approvals' | 'history'>('scan');

  // Scanner states
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraPermissionError, setCameraPermissionError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<any>(null);

  // Scanned payload & validation
  const [rawScannedPayload, setRawScannedPayload] = useState<string>('');
  const [validatingQR, setValidatingQR] = useState<boolean>(false);
  const [validatedData, setValidatedData] = useState<ValidatedQRData | null>(null);
  const [manualPayloadInput, setManualPayloadInput] = useState<string>('');
  const [scanSuccessBeep, setScanSuccessBeep] = useState<boolean>(false);

  // Payment Entry & Review State
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentDescriptionInput, setPaymentDescriptionInput] = useState<string>('');

  // Mobile Approval Workflow State
  // Step 1: Confirmation Screen ("PAYMENT APPROVAL REQUIRED")
  const [approvalModalData, setApprovalModalData] = useState<{
    recipientName: string;
    recipientAccount: string;
    amount: number;
    requestId: string;
    description: string;
  } | null>(null);

  // Step 2: Registered Mobile Device Simulator Modal
  const [mobileSimulatorActive, setMobileSimulatorActive] = useState<boolean>(false);
  const [activeApprovalId, setActiveApprovalId] = useState<string | null>(null);
  const [activeMaskedMobile, setActiveMaskedMobile] = useState<string>('');
  const [activeDemoOtpCode, setActiveDemoOtpCode] = useState<string>('');
  const [inputOtpCode, setInputOtpCode] = useState<string>('');
  const [approvalSubmitting, setApprovalSubmitting] = useState<boolean>(false);
  const [approvalError, setApprovalError] = useState<string | null>(null);
  const [smsNotificationVisible, setSmsNotificationVisible] = useState<boolean>(false);

  // Generate QR states
  const [genRecipientName, setGenRecipientName] = useState<string>(currentUser.fullName || '');
  const [genRecipientAccount, setGenRecipientAccount] = useState<string>(bankAccount?.accountNumber || currentUser.accountNumber || `ACC-${currentUser.id}`);
  const [genAmountType, setGenAmountType] = useState<'dynamic' | 'fixed'>('fixed');
  const [genFixedAmount, setGenFixedAmount] = useState<string>('1500');
  const [genDescription, setGenDescription] = useState<string>('Payment for services');
  const [genExpiresIn, setGenExpiresIn] = useState<number>(60);
  const [generatedQRResult, setGeneratedQRResult] = useState<any>(null);
  const [generatingQR, setGeneratingQR] = useState<boolean>(false);
  const qrCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Pending Approvals & History
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalItem[]>([]);
  const [qrHistory, setQrHistory] = useState<QRHistoryItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');

  // Pre-registered verified mobile number (cannot be overridden by user during payment)
  const registeredMobile = bankAccount?.registeredMobile || currentUser.phone || '+91-98765-01002';
  const digits = registeredMobile.replace(/\D/g, '');
  const maskedMobileDisplay = `+91 ${digits.slice(2, 4)}*** ***${digits.slice(-2)}`;

  // Fetch pending approvals and history
  const loadApprovalsAndHistory = async () => {
    try {
      setLoadingData(true);
      const [apprRes, histRes] = await Promise.all([
        fetch('/api/qr/pending-approvals'),
        fetch('/api/qr/history')
      ]);
      const apprData = await apprRes.json();
      const histData = await histRes.json();
      if (apprData.success) setPendingApprovals(apprData.data || []);
      if (histData.success) setQrHistory(histData.data || []);
    } catch {
      // ignore
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadApprovalsAndHistory();
  }, [activeQrTab]);

  // Clean up camera stream when leaving tab or unmounting
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Render QR Canvas when generatedQRResult updates
  useEffect(() => {
    if (generatedQRResult && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        generatedQRResult.qrPayloadString,
        {
          width: 256,
          margin: 2,
          color: {
            dark: '#00D9FF',
            light: '#07111F'
          }
        },
        (err) => {
          if (err) console.error('QR rendering error', err);
        }
      );
    }
  }, [generatedQRResult]);

  // Camera Scanner Functions
  const startCameraScanner = async () => {
    setCameraPermissionError(null);
    setCameraLoading(true);
    cyberSound.playClick();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access API is not supported in this browser environment. Please use image upload or manual payload.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setIsCameraActive(true);
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraPermissionError(err.message || 'Camera permission was denied or camera is unavailable. Use QR Image Upload or Manual Entry below.');
      setIsCameraActive(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCameraScanner = () => {
    if (scanIntervalRef.current) {
      cancelAnimationFrame(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const startScanningLoop = () => {
    const scanFrame = () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
        scanIntervalRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert'
        });

        if (code && code.data) {
          // Detected QR Code!
          cyberSound.playClick();
          setScanSuccessBeep(true);
          setTimeout(() => setScanSuccessBeep(false), 800);
          stopCameraScanner();
          handleValidateScannedPayload(code.data);
          return;
        }
      }

      scanIntervalRef.current = requestAnimationFrame(scanFrame);
    };

    scanIntervalRef.current = requestAnimationFrame(scanFrame);
  };

  // Image File Upload Decoder
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    cyberSound.playClick();
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          cyberSound.playSuccessChime();
          handleValidateScannedPayload(code.data);
        } else {
          cyberSound.playWarningChime();
          alert('No valid QR code could be detected in the uploaded image. Please try a clearer QR image.');
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Backend Validation of Scanned Payload
  const handleValidateScannedPayload = async (payloadStr: string) => {
    setRawScannedPayload(payloadStr);
    setValidatingQR(true);
    setValidatedData(null);

    try {
      const res = await fetch('/api/qr/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrPayload: payloadStr })
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Validation failed for scanned QR');
      }

      setValidatedData(json.data);
      if (json.data.amount) {
        setPaymentAmountInput(String(json.data.amount));
      } else {
        setPaymentAmountInput('');
      }
      setPaymentDescriptionInput(json.data.description || 'QR POS Payment');
      cyberSound.playSuccessChime();
    } catch (err: any) {
      cyberSound.playWarningChime();
      alert(`Invalid or untrusted QR code: ${err.message}`);
    } finally {
      setValidatingQR(false);
    }
  };

  // Preset quick testing payloads
  const loadPresetQR = (type: 'coffee' | 'electronics' | 'high_fraud') => {
    cyberSound.playClick();
    if (type === 'coffee') {
      const payload = JSON.stringify({
        fg_qr: true,
        ver: '1.0',
        req: 'QR-PRESET-COFFEE-01',
        recip: 'ACC-STARBUCKS-01',
        name: 'Starbucks Demo Cafe',
        amt: 450.00,
        cur: 'INR',
        desc: 'Coffee & Breakfast Debit — Clean & Approved',
        exp: new Date(Date.now() + 86400000).toISOString(),
        sig: 'a1b2c3d4e5f60718293a4b5c6d7e8f90'
      });
      handleValidateScannedPayload(payload);
    } else if (type === 'electronics') {
      const payload = JSON.stringify({
        fg_qr: true,
        ver: '1.0',
        req: 'QR-PRESET-ELEC-02',
        recip: 'ACC-CROMA-ELEC-88',
        name: 'Croma Electronics Retail',
        amt: 2500.00,
        cur: 'INR',
        desc: 'Computer Peripherals Store Debit',
        exp: new Date(Date.now() + 86400000).toISOString(),
        sig: 'b2c3d4e5f60718293a4b5c6d7e8f90a1'
      });
      handleValidateScannedPayload(payload);
    } else if (type === 'high_fraud') {
      // ₹3,50,000 — Exceeds the ₹2,00,000 threshold to test the Full-Screen Red Fraud Detected Emergency System!
      const payload = JSON.stringify({
        fg_qr: true,
        ver: '1.0',
        req: 'QR-REQ-DEMO-HIGH',
        recip: 'ACC-LUX-8800',
        name: 'Luxury Diamond Jewellers',
        amt: 350000.00,
        cur: 'INR',
        desc: 'High-Value Diamond Necklace Invoice (Exceeds Fraud Limit)',
        exp: new Date(Date.now() + 86400000).toISOString(),
        sig: 'f9e8d7c6b5a403928172635443322110'
      });
      handleValidateScannedPayload(payload);
    }
  };

  // Step 1: Open Payment Approval Required Screen
  const handleProceedToApproval = () => {
    if (!validatedData) return;
    const finalAmt = validatedData.isFixedAmount && validatedData.amount 
      ? validatedData.amount 
      : parseFloat(paymentAmountInput.replace(/[^0-9.]/g, ''));

    if (isNaN(finalAmt) || finalAmt <= 0) {
      alert('Please enter a valid payment amount in Indian Rupees (₹).');
      return;
    }

    cyberSound.playClick();
    setApprovalModalData({
      recipientName: validatedData.recipientName,
      recipientAccount: validatedData.recipientAccount,
      amount: finalAmt,
      requestId: validatedData.requestId,
      description: paymentDescriptionInput || validatedData.description
    });
  };

  // Step 2: User clicks "YES, APPROVE" on the confirmation screen
  // Sends SMS to registered mobile and opens Registered Mobile Device Simulator
  const handleInitiateMobileApproval = async () => {
    if (!approvalModalData) return;
    cyberSound.playClick();
    setApprovalSubmitting(true);
    setApprovalError(null);

    try {
      const res = await fetch('/api/qr/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: approvalModalData.requestId,
          recipientAccount: approvalModalData.recipientAccount,
          recipientName: approvalModalData.recipientName,
          amount: approvalModalData.amount,
          description: approvalModalData.description
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to dispatch mobile approval');
      }

      // Close step 1 confirmation modal
      setApprovalModalData(null);

      // Open step 2 Mobile Device Simulator
      setActiveApprovalId(json.data.approvalId);
      setActiveMaskedMobile(json.data.maskedMobile);
      setActiveDemoOtpCode(json.data.demoSmsCode);
      setInputOtpCode(json.data.demoSmsCode); // Auto-fill for convenience while keeping input editable
      setMobileSimulatorActive(true);

      // Trigger simulated incoming push SMS alert after 500ms
      setTimeout(() => {
        setSmsNotificationVisible(true);
        cyberSound.playSuccessChime();
      }, 500);

      loadApprovalsAndHistory();
    } catch (err: any) {
      setApprovalError(err.message);
      cyberSound.playWarningChime();
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // Step 2 Alternate: User clicks "NO, REJECT" on the confirmation screen
  const handleRejectPayment = async () => {
    if (!approvalModalData) return;
    cyberSound.playClick();

    // Create and immediately reject approval
    try {
      const initRes = await fetch('/api/qr/request-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: approvalModalData.requestId,
          recipientAccount: approvalModalData.recipientAccount,
          recipientName: approvalModalData.recipientName,
          amount: approvalModalData.amount,
          description: approvalModalData.description
        })
      });
      const initJson = await initRes.json();
      if (initJson.success && initJson.data?.approvalId) {
        await fetch('/api/qr/approve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            approvalId: initJson.data.approvalId,
            action: 'REJECT',
            rejectionReason: 'Cardholder explicitly cancelled authorization on payment review screen'
          })
        });
      }
    } catch {
      // ignore
    }

    setApprovalModalData(null);
    setValidatedData(null);
    cyberSound.playWarningChime();
    alert('Payment authorization was rejected. Transaction cancelled.');
    loadApprovalsAndHistory();
  };

  // Final Step: Submit Approval or Rejection from Registered Mobile Device Simulator
  const handleFinalDeviceAuthorization = async (action: 'APPROVE' | 'REJECT') => {
    if (!activeApprovalId) return;
    setApprovalSubmitting(true);
    setApprovalError(null);

    try {
      const res = await fetch('/api/qr/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvalId: activeApprovalId,
          action,
          otpCode: action === 'APPROVE' ? inputOtpCode.trim() : undefined,
          rejectionReason: action === 'REJECT' ? 'Rejected on registered mobile device by cardholder' : undefined
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to process device approval');
      }

      setMobileSimulatorActive(false);
      setApprovalModalData(null);
      setValidatedData(null);
      setRawScannedPayload('');

      if (action === 'REJECT') {
        cyberSound.playWarningChime();
        alert('Transaction was successfully REJECTED on your registered mobile device.');
      } else {
        // APPROVE: Passes result to App.tsx
        // If high risk or blocked (e.g. ₹3,50,000 exceeds ₹2,00,000 limit),
        // onTransactionProcessed will activate the Full-Screen Red Fraud Detected Emergency System!
        onTransactionProcessed(json.data);
      }

      onRefreshData();
      loadApprovalsAndHistory();
    } catch (err: any) {
      setApprovalError(err.message);
      cyberSound.playWarningChime();
    } finally {
      setApprovalSubmitting(false);
    }
  };

  // Generate QR Handler
  const handleGeneratePaymentQR = async (e: React.FormEvent) => {
    e.preventDefault();
    cyberSound.playClick();
    setGeneratingQR(true);

    try {
      const amt = genAmountType === 'fixed' ? parseFloat(genFixedAmount) : null;
      const res = await fetch('/api/qr/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientName: genRecipientName,
          recipientAccount: genRecipientAccount,
          amount: amt,
          description: genDescription,
          expiresInMinutes: genExpiresIn
        })
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate signed payment QR');
      }

      setGeneratedQRResult(json.data);
      cyberSound.playSuccessChime();
    } catch (err: any) {
      cyberSound.playWarningChime();
      alert(`Error generating QR: ${err.message}`);
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleDownloadQRCanvas = () => {
    if (!qrCanvasRef.current) return;
    cyberSound.playClick();
    const link = document.createElement('a');
    link.download = `FraudGuard-QR-${generatedQRResult?.requestId || 'Payment'}.png`;
    link.href = qrCanvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopyPayload = () => {
    if (!generatedQRResult) return;
    cyberSound.playClick();
    navigator.clipboard.writeText(generatedQRResult.qrPayloadString);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleTestScanOwnQR = () => {
    if (!generatedQRResult) return;
    cyberSound.playClick();
    setActiveQrTab('scan');
    handleValidateScannedPayload(generatedQRResult.qrPayloadString);
  };

  // Filter history
  const filteredHistory = qrHistory.filter(item => {
    if (historyFilter !== 'ALL' && item.status !== historyFilter) return false;
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      return (
        item.requestId.toLowerCase().includes(q) ||
        item.recipientName.toLowerCase().includes(q) ||
        item.recipientAccount.toLowerCase().includes(q) ||
        (item.referenceId && item.referenceId.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* SECTION HEADER & DEMO ACCOUNT BADGE */}
      <CyberCard glow cornerAccents dangerGlow={dangerGlow} className="p-5 sm:p-6 bg-[#0D1828]/90">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#1677FF] to-[#00D9FF] flex items-center justify-center text-white shadow-[0_0_20px_rgba(0,217,255,0.35)] shrink-0 animate-shield-glow">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight text-[#F8FAFC]">
                  QR Pay & Mobile Approval Matrix
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#1677FF]/20 text-[#36C8FF] border border-[#1677FF]/40">
                  UPI 2.0 // INR (₹)
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                Cryptographically signed point-of-sale scanning with pre-registered mobile handset verification.
              </p>
            </div>
          </div>

          {/* Security & Registered Device Enclave HUD */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="px-3 py-1.5 rounded-xl bg-[#07111F] border border-blue-900/60 flex items-center gap-2">
              <Smartphone className="w-3.5 h-3.5 text-[#00D9FF]" />
              <span className="text-[#94A3B8]">Verified Mobile:</span>
              <strong className="text-emerald-400">{maskedMobileDisplay}</strong>
            </div>

            {bankAccount && (
              <div className="px-3 py-1.5 rounded-xl bg-[#07111F] border border-blue-900/60 flex items-center gap-2">
                <span className="text-[#94A3B8]">Demo Liquidity:</span>
                <strong className="text-[#00D9FF] font-bold">{formatINR(bankAccount.balance)}</strong>
              </div>
            )}
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-2 mt-6 border-b border-blue-900/40 pb-1 overflow-x-auto">
          <button
            onClick={() => {
              cyberSound.playTabSweep();
              setActiveQrTab('scan');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all duration-200 cursor-pointer ${
              activeQrTab === 'scan'
                ? 'bg-gradient-to-r from-[#1677FF] to-[#2495FF] text-white shadow-[0_0_15px_rgba(22,119,255,0.5)] border border-cyan-400/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]/60'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Scan & Pay</span>
          </button>

          <button
            onClick={() => {
              cyberSound.playTabSweep();
              setActiveQrTab('generate');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all duration-200 cursor-pointer ${
              activeQrTab === 'generate'
                ? 'bg-gradient-to-r from-[#1677FF] to-[#2495FF] text-white shadow-[0_0_15px_rgba(22,119,255,0.5)] border border-cyan-400/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]/60'
            }`}
          >
            <QrCode className="w-4 h-4" />
            <span>Generate My QR</span>
          </button>

          <button
            onClick={() => {
              cyberSound.playTabSweep();
              setActiveQrTab('approvals');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all duration-200 cursor-pointer relative ${
              activeQrTab === 'approvals'
                ? 'bg-gradient-to-r from-[#1677FF] to-[#2495FF] text-white shadow-[0_0_15px_rgba(22,119,255,0.5)] border border-cyan-400/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]/60'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Pending Approvals</span>
            {pendingApprovals.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-[#050B14] font-bold text-[10px] flex items-center justify-center animate-pulse">
                {pendingApprovals.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              cyberSound.playTabSweep();
              setActiveQrTab('history');
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold font-mono transition-all duration-200 cursor-pointer ${
              activeQrTab === 'history'
                ? 'bg-gradient-to-r from-[#1677FF] to-[#2495FF] text-white shadow-[0_0_15px_rgba(22,119,255,0.5)] border border-cyan-400/40'
                : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#101D30]/60'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>QR Payment History</span>
            <span className="text-[10px] opacity-75 font-mono">({qrHistory.length})</span>
          </button>
        </div>
      </CyberCard>

      {/* ============================================================== */}
      {/* TAB 1: SCAN & PAY (Camera + Reticle + Upload + Preset Testers) */}
      {/* ============================================================== */}
      {activeQrTab === 'scan' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Live Camera HUD & File Upload Scanner */}
          <div className="lg:col-span-7 space-y-6">
            <CyberCard glow cornerAccents className="p-6 bg-[#0D1828]/90">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Camera className="w-5 h-5 text-[#00D9FF]" />
                  <h3 className="font-bold text-sm text-[#F8FAFC] uppercase tracking-wider font-mono">
                    High-Frequency Optical HUD Scanner
                  </h3>
                </div>
                {isCameraActive && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    LIVE SENSOR ACTIVE
                  </span>
                )}
              </div>

              {/* CAMERA SCANNER DISPLAY */}
              <div className="relative aspect-video max-h-80 w-full rounded-2xl bg-[#050B14] border-2 border-blue-900/60 overflow-hidden flex items-center justify-center group shadow-inner">
                {/* Real Video Element */}
                <video
                  ref={videoRef}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
                  }`}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Cyber Reticle Overlay (Active when camera is running) */}
                {isCameraActive ? (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    {/* Darkened Vignette */}
                    <div className="absolute inset-0 bg-blue-950/20" />

                    {/* Scanning Target Box */}
                    <div className="relative w-56 h-56 border border-cyan-400/40 rounded-2xl">
                      {/* Neon Corner Brackets */}
                      <span className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-[#00D9FF]" />
                      <span className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-[#00D9FF]" />
                      <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-[#00D9FF]" />
                      <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-[#00D9FF]" />

                      {/* Sweeping Laser Beam Line */}
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_12px_#00D9FF] animate-scan-beam" />

                      {/* Scanning Status Text */}
                      <div className="absolute -bottom-8 inset-x-0 text-center">
                        <span className="px-2.5 py-0.5 rounded-md bg-[#050B14]/80 text-[#00D9FF] text-[10px] font-mono tracking-widest border border-cyan-500/30">
                          ALIGN PAYEE QR IN RETICLE
                        </span>
                      </div>
                    </div>

                    {/* Scan Detection Beep Animation */}
                    {scanSuccessBeep && (
                      <div className="absolute inset-0 bg-cyan-400/20 flex items-center justify-center animate-ping">
                        <CheckCircle2 className="w-16 h-16 text-cyan-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  /* Camera Off State / Initial Start Prompt */
                  <div className="p-6 text-center z-10 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-blue-950/60 border border-blue-500/30 mx-auto flex items-center justify-center text-[#00D9FF] shadow-[0_0_20px_rgba(0,217,255,0.15)]">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F8FAFC]">Optical Sensor Standby</h4>
                      <p className="text-xs text-[#94A3B8] max-w-sm mt-1">
                        Camera permissions are requested only upon explicit user invocation.
                      </p>
                    </div>
                    <CyberButton
                      variant="primary"
                      onClick={startCameraScanner}
                      disabled={cameraLoading}
                      className="px-6 py-2.5 text-xs font-semibold font-mono"
                    >
                      {cameraLoading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Initializing Camera...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Start Camera Scanner</span>
                        </>
                      )}
                    </CyberButton>
                  </div>
                )}
              </div>

              {/* Camera Controls Bar */}
              {isCameraActive && (
                <div className="flex items-center justify-between mt-3 text-xs font-mono">
                  <span className="text-[#94A3B8]">Sensors: WebRTC 1080p // jsQR</span>
                  <button
                    onClick={stopCameraScanner}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                  >
                    <CameraOff className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                </div>
              )}

              {/* Permission Warning / Graceful Fallback Notice */}
              {cameraPermissionError && (
                <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong>Camera Access Notice:</strong> {cameraPermissionError}
                    <div className="mt-1 text-[#94A3B8]">
                      Use the instant image upload or one of the pre-configured demo test QR buttons below.
                    </div>
                  </div>
                </div>
              )}

              {/* FALLBACK: QR Image Upload Dropzone */}
              <div className="mt-5 pt-5 border-t border-blue-900/40">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono text-[#CBD5E1] uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#00D9FF]" />
                    Upload QR Image File
                  </label>
                  <span className="text-[10px] font-mono text-[#64748B]">PNG, JPG, WEBP</span>
                </div>
                <label className="flex items-center justify-center gap-3 p-3.5 border-2 border-dashed border-blue-900/60 hover:border-cyan-400/50 rounded-xl bg-[#07111F] hover:bg-[#101D30]/60 transition cursor-pointer text-xs font-mono text-[#94A3B8] hover:text-[#00D9FF]">
                  <Upload className="w-4 h-4" />
                  <span>Drop QR image screenshot or click to browse</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* FALLBACK: Manual Raw Payload / UPI String Entry */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-mono text-[#CBD5E1] uppercase tracking-wider">
                    Manual QR Payload String / UPI URI
                  </label>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualPayloadInput}
                    onChange={(e) => setManualPayloadInput(e.target.value)}
                    placeholder='{"fg_qr":true,"recip":"ACC-..."} or upi://pay?pa=...'
                    className="flex-1 bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#00D9FF]"
                  />
                  <CyberButton
                    variant="secondary"
                    onClick={() => {
                      if (!manualPayloadInput.trim()) return;
                      cyberSound.playClick();
                      handleValidateScannedPayload(manualPayloadInput.trim());
                    }}
                    className="px-4 py-2 text-xs font-mono"
                  >
                    Decode
                  </CyberButton>
                </div>
              </div>
            </CyberCard>

            {/* PRESET DEMO QR CODES FOR RAPID TESTING */}
            <CyberCard glow cornerAccents className="p-5 bg-[#0D1828]/90">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00D9FF]" />
                  <h4 className="text-xs font-bold font-mono uppercase text-[#F8FAFC]">
                    Simulation Scenario Presets
                  </h4>
                </div>
                <span className="text-[10px] font-mono text-[#94A3B8]">Instant 1-Click Injection</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => loadPresetQR('coffee')}
                  className="p-3 rounded-xl bg-[#07111F] hover:bg-[#101D30] border border-emerald-500/30 hover:border-emerald-400 text-left transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-emerald-300">Coffee POS</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">SAFE</span>
                  </div>
                  <div className="text-sm font-bold text-[#00D9FF] font-mono">₹450.00</div>
                  <div className="text-[10px] text-[#94A3B8] mt-1 truncate">Starbucks Demo Cafe</div>
                </button>

                <button
                  onClick={() => loadPresetQR('electronics')}
                  className="p-3 rounded-xl bg-[#07111F] hover:bg-[#101D30] border border-blue-500/30 hover:border-cyan-400 text-left transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-[#F8FAFC] group-hover:text-cyan-300">Retail Tech</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-cyan-400">SAFE</span>
                  </div>
                  <div className="text-sm font-bold text-[#00D9FF] font-mono">₹2,500.00</div>
                  <div className="text-[10px] text-[#94A3B8] mt-1 truncate">Croma Electronics Retail</div>
                </button>

                <button
                  onClick={() => loadPresetQR('high_fraud')}
                  className="p-3 rounded-xl bg-red-950/20 hover:bg-red-900/30 border border-red-500/40 hover:border-red-400 text-left transition cursor-pointer group shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-red-300 group-hover:text-red-200">Diamond Store</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 animate-pulse font-bold">FRAUD TRIGGER</span>
                  </div>
                  <div className="text-sm font-bold text-red-400 font-mono">₹3,50,000.00</div>
                  <div className="text-[10px] text-red-300/80 mt-1 truncate">Exceeds ₹2,00,000 Limit</div>
                </button>
              </div>
            </CyberCard>
          </div>

          {/* RIGHT: Validated Scanned QR & Transaction Formulation */}
          <div className="lg:col-span-5 space-y-6">
            <CyberCard glow cornerAccents className="p-6 bg-[#0D1828]/90">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-900/40">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00D9FF]" />
                  <h3 className="font-bold text-sm text-[#F8FAFC] uppercase tracking-wider font-mono">
                    Scanned Payment Verification
                  </h3>
                </div>
                {validatingQR && (
                  <RefreshCw className="w-4 h-4 text-[#00D9FF] animate-spin" />
                )}
              </div>

              {!validatedData ? (
                <div className="py-16 text-center text-[#64748B] font-mono text-xs space-y-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-950/40 border border-blue-900/60 mx-auto flex items-center justify-center text-slate-500">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <p>Scan a QR code or click one of the presets to begin payment review.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Trust Level & Verification Badge */}
                  <div className={`p-3 rounded-xl border flex items-center justify-between ${
                    validatedData.signatureVerified 
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300' 
                      : 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                  }`}>
                    <div className="flex items-center gap-2">
                      {validatedData.signatureVerified ? (
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                      )}
                      <span className="text-xs font-mono font-bold">
                        {validatedData.signatureVerified ? 'CRYPTOGRAPHICALLY VERIFIED' : validatedData.trustLevel}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40">
                      HMAC-SHA256
                    </span>
                  </div>

                  {/* Warning if any */}
                  {validatedData.warning && (
                    <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validatedData.warning}</span>
                    </div>
                  )}

                  {/* Recipient Details */}
                  <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/60 space-y-2">
                    <div className="text-[10px] font-mono uppercase text-[#94A3B8]">Verified Payee</div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#F8FAFC]">{validatedData.recipientName}</span>
                      <span className="text-xs font-mono text-[#00D9FF] bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900">
                        {validatedData.recipientAccount}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-[#64748B]">
                      Request ID: <strong className="text-slate-400">{validatedData.requestId}</strong>
                    </div>
                  </div>

                  {/* Amount Input / Display */}
                  <div className="p-3.5 rounded-xl bg-[#07111F] border border-blue-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase text-[#94A3B8]">
                        {validatedData.isFixedAmount ? 'Preset Invoice Amount (Locked)' : 'Enter Payment Amount (₹ INR)'}
                      </label>
                      <span className="text-[10px] font-mono text-emerald-400">Indian Rupee</span>
                    </div>

                    {validatedData.isFixedAmount && validatedData.amount ? (
                      <div className="text-2xl font-black font-mono text-[#00D9FF]">
                        {formatINR(validatedData.amount)}
                      </div>
                    ) : (
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00D9FF] font-bold font-mono">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="10"
                          value={paymentAmountInput}
                          onChange={(e) => setPaymentAmountInput(e.target.value)}
                          placeholder="e.g. 1500.00"
                          className="w-full bg-[#050B14] border border-blue-900/80 rounded-xl pl-8 pr-3 py-2 text-lg font-mono font-bold text-[#00D9FF] focus:outline-none focus:border-[#00D9FF]"
                          required
                        />
                      </div>
                    )}
                  </div>

                  {/* Memo / Description */}
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#94A3B8] mb-1">
                      Payment Memo / Description
                    </label>
                    <input
                      type="text"
                      value={paymentDescriptionInput}
                      onChange={(e) => setPaymentDescriptionInput(e.target.value)}
                      placeholder="e.g. Store checkout invoice"
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>

                  {/* Pre-Registered Mobile Approval Notice */}
                  <div className="p-3 rounded-xl bg-[#07111F]/60 border border-blue-950 flex items-start gap-2.5 text-xs text-[#94A3B8] font-mono">
                    <Lock className="w-4 h-4 text-[#00D9FF] shrink-0 mt-0.5" />
                    <div>
                      <span>Mandatory Verification: Approvals dispatch exclusively to pre-registered mobile </span>
                      <strong className="text-emerald-400">{maskedMobileDisplay}</strong>.
                    </div>
                  </div>

                  {/* PROCEED BUTTON */}
                  <CyberButton
                    variant="primary"
                    onClick={handleProceedToApproval}
                    className="w-full py-3 text-xs font-bold font-mono uppercase tracking-wider"
                  >
                    <span>Proceed to Secure Approval</span>
                    <ArrowRight className="w-4 h-4" />
                  </CyberButton>
                </div>
              )}
            </CyberCard>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: GENERATE MY PAYMENT QR (Configurable, Download, Share) */}
      {/* ============================================================== */}
      {activeQrTab === 'generate' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Generator Form */}
          <div className="lg:col-span-7 space-y-6">
            <CyberCard glow cornerAccents className="p-6 bg-[#0D1828]/90">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-900/40">
                <QrCode className="w-5 h-5 text-[#00D9FF]" />
                <h3 className="font-bold text-sm text-[#F8FAFC] uppercase tracking-wider font-mono">
                  Issue Cryptographically Signed Payment QR
                </h3>
              </div>

              <form onSubmit={handleGeneratePaymentQR} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#CBD5E1] mb-1">
                      Recipient Display Name
                    </label>
                    <input
                      type="text"
                      value={genRecipientName}
                      onChange={(e) => setGenRecipientName(e.target.value)}
                      placeholder="Your Name / Merchant Name"
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D9FF]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#CBD5E1] mb-1">
                      Demo Account ID
                    </label>
                    <input
                      type="text"
                      value={genRecipientAccount}
                      onChange={(e) => setGenRecipientAccount(e.target.value)}
                      placeholder="ACC-98421001"
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-[#00D9FF] focus:outline-none focus:border-[#00D9FF]"
                      required
                    />
                  </div>
                </div>

                {/* Amount Mode Selector */}
                <div>
                  <label className="block text-[10px] font-mono uppercase text-[#CBD5E1] mb-1.5">
                    Amount Specification Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setGenAmountType('fixed')}
                      className={`p-3 rounded-xl border text-left font-mono transition cursor-pointer ${
                        genAmountType === 'fixed'
                          ? 'bg-[#1677FF]/20 border-cyan-400 text-[#00D9FF]'
                          : 'bg-[#07111F] border-blue-900/60 text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Fixed Amount QR</div>
                      <div className="text-[10px] opacity-75">Specific ₹ amount locked into QR</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setGenAmountType('dynamic')}
                      className={`p-3 rounded-xl border text-left font-mono transition cursor-pointer ${
                        genAmountType === 'dynamic'
                          ? 'bg-[#1677FF]/20 border-cyan-400 text-[#00D9FF]'
                          : 'bg-[#07111F] border-blue-900/60 text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-bold">Open Amount QR</div>
                      <div className="text-[10px] opacity-75">Payer inputs amount upon scanning</div>
                    </button>
                  </div>
                </div>

                {/* Fixed Amount Input & Preset Buttons */}
                {genAmountType === 'fixed' && (
                  <div className="p-4 rounded-xl bg-[#07111F] border border-blue-900/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-mono uppercase text-[#94A3B8]">
                        Fixed Payment Amount (₹ INR)
                      </label>
                      <span className="text-xs font-mono font-bold text-[#00D9FF]">
                        {formatINR(parseFloat(genFixedAmount) || 0)}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#00D9FF] font-bold font-mono">₹</span>
                      <input
                        type="number"
                        step="100"
                        value={genFixedAmount}
                        onChange={(e) => setGenFixedAmount(e.target.value)}
                        placeholder="1500.00"
                        className="w-full bg-[#050B14] border border-blue-900/80 rounded-xl pl-8 pr-3 py-2 text-sm font-mono font-bold text-[#00D9FF] focus:outline-none focus:border-[#00D9FF]"
                        required
                      />
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setGenFixedAmount('500')}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/60 text-xs font-mono text-[#CBD5E1] hover:text-[#00D9FF] border border-blue-900 transition"
                      >
                        ₹500
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenFixedAmount('1500')}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/60 text-xs font-mono text-[#CBD5E1] hover:text-[#00D9FF] border border-blue-900 transition"
                      >
                        ₹1,500
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenFixedAmount('5000')}
                        className="px-2.5 py-1 rounded-lg bg-blue-950/60 text-xs font-mono text-[#CBD5E1] hover:text-[#00D9FF] border border-blue-900 transition"
                      >
                        ₹5,000
                      </button>
                      <button
                        type="button"
                        onClick={() => setGenFixedAmount('250000')}
                        className="px-2.5 py-1 rounded-lg bg-red-950/40 text-xs font-mono text-red-300 hover:text-red-200 border border-red-500/40 transition"
                        title="Exceeds ₹2,00,000 fraud threshold to test emergency alert"
                      >
                        ₹2,50,000 (Test Fraud)
                      </button>
                    </div>
                  </div>
                )}

                {/* Description & Expiration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#CBD5E1] mb-1">
                      Payment Memo / Description
                    </label>
                    <input
                      type="text"
                      value={genDescription}
                      onChange={(e) => setGenDescription(e.target.value)}
                      placeholder="e.g. Consulting Invoice"
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D9FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono uppercase text-[#CBD5E1] mb-1">
                      QR Expiration Window
                    </label>
                    <select
                      value={genExpiresIn}
                      onChange={(e) => setGenExpiresIn(Number(e.target.value))}
                      className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl px-3 py-2 text-xs font-mono text-[#F8FAFC] focus:outline-none focus:border-[#00D9FF]"
                    >
                      <option value={15}>15 Minutes (High Security)</option>
                      <option value={60}>1 Hour (Standard POS)</option>
                      <option value={1440}>24 Hours (Invoice Extended)</option>
                    </select>
                  </div>
                </div>

                <CyberButton
                  type="submit"
                  variant="primary"
                  disabled={generatingQR}
                  className="w-full py-3 text-xs font-bold font-mono uppercase tracking-wider"
                >
                  {generatingQR ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Signing QR Token...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Generate Signed Payment QR</span>
                    </>
                  )}
                </CyberButton>
              </form>
            </CyberCard>
          </div>

          {/* RIGHT: High-Res QR Canvas Display & Actions */}
          <div className="lg:col-span-5 space-y-6">
            <CyberCard glow cornerAccents className="p-6 bg-[#0D1828]/90 text-center">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-900/40 text-left">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#00D9FF]" />
                  <h3 className="font-bold text-sm text-[#F8FAFC] uppercase tracking-wider font-mono">
                    Signed QR Artifact
                  </h3>
                </div>
                {generatedQRResult && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                    SIGNATURE ACTIVE
                  </span>
                )}
              </div>

              {!generatedQRResult ? (
                <div className="py-20 text-center text-[#64748B] font-mono text-xs space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-blue-950/40 border border-blue-900/60 mx-auto flex items-center justify-center text-slate-500">
                    <QrCode className="w-8 h-8" />
                  </div>
                  <p>Complete the parameters on the left to synthesize a signed QR request.</p>
                </div>
              ) : (
                <div className="space-y-4 flex flex-col items-center">
                  {/* Styled QR Frame */}
                  <div className="p-4 rounded-2xl bg-[#07111F] border-2 border-cyan-500/40 shadow-[0_0_25px_rgba(0,217,255,0.2)] relative group">
                    <canvas ref={qrCanvasRef} className="rounded-xl w-60 h-60" />

                    {/* Corner Reticle Accents */}
                    <span className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-[#00D9FF]" />
                    <span className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-[#00D9FF]" />
                    <span className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-[#00D9FF]" />
                    <span className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-[#00D9FF]" />
                  </div>

                  <div className="text-center font-mono">
                    <div className="text-base font-bold text-[#F8FAFC]">
                      {generatedQRResult.amount ? formatINR(generatedQRResult.amount) : 'Open Amount (Any Value)'}
                    </div>
                    <div className="text-xs text-[#00D9FF] mt-0.5">{generatedQRResult.recipientName}</div>
                    <div className="text-[10px] text-[#64748B] mt-1">ID: {generatedQRResult.requestId}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="w-full grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      onClick={handleDownloadQRCanvas}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#07111F] hover:bg-[#101D30] border border-blue-900/60 text-[#CBD5E1] hover:text-white text-xs font-mono transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-[#00D9FF]" />
                      <span>Download Image</span>
                    </button>

                    <button
                      onClick={handleCopyPayload}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#07111F] hover:bg-[#101D30] border border-blue-900/60 text-[#CBD5E1] hover:text-white text-xs font-mono transition cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#00D9FF]" />}
                      <span>{copiedLink ? 'Copied!' : 'Copy Payload'}</span>
                    </button>
                  </div>

                  {/* Immediate Test Scan Button */}
                  <CyberButton
                    variant="secondary"
                    onClick={handleTestScanOwnQR}
                    className="w-full py-2.5 text-xs font-mono mt-1"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Test Scan This QR Code</span>
                  </CyberButton>
                </div>
              )}
            </CyberCard>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: PENDING APPROVALS LIST */}
      {/* ============================================================== */}
      {activeQrTab === 'approvals' && (
        <CyberCard glow cornerAccents className="p-6 bg-[#0D1828]/90">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-blue-900/40">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[#00D9FF]" />
              <h3 className="font-bold text-sm text-[#F8FAFC] uppercase tracking-wider font-mono">
                Active Approvals Awaiting Registered Handset Confirmation
              </h3>
            </div>
            <button
              onClick={loadApprovalsAndHistory}
              className="p-1.5 rounded-lg bg-[#07111F] hover:bg-[#101D30] text-[#94A3B8] hover:text-white border border-blue-900/50 transition cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] font-mono text-xs space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto opacity-50" />
              <p>No transactions currently waiting for mobile authorization.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <div
                  key={item.approvalId}
                  className="p-4 rounded-xl bg-[#07111F] border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#F8FAFC]">{item.recipientName}</span>
                      <span className="text-xs font-mono font-bold text-[#00D9FF] bg-blue-950/60 px-2 py-0.5 rounded border border-blue-900">
                        {formatINR(item.amount)}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        PENDING DEVICE AUTH
                      </span>
                    </div>
                    <div className="text-xs text-[#94A3B8] font-mono">
                      Payee Account: {item.recipientAccount} &bull; Request: {item.requestId}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Dispatched to: <strong className="text-emerald-400">{item.maskedMobile}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <CyberButton
                      variant="primary"
                      onClick={() => {
                        cyberSound.playClick();
                        setActiveApprovalId(item.approvalId);
                        setActiveMaskedMobile(item.maskedMobile);
                        setActiveDemoOtpCode(item.otpCode);
                        setInputOtpCode(item.otpCode);
                        setMobileSimulatorActive(true);
                      }}
                      className="px-4 py-2 text-xs font-mono font-semibold"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Open Handset Approval</span>
                    </CyberButton>

                    <button
                      onClick={async () => {
                        cyberSound.playClick();
                        await fetch('/api/qr/approve', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            approvalId: item.approvalId,
                            action: 'REJECT',
                            rejectionReason: 'Rejected from pending approval queue'
                          })
                        });
                        loadApprovalsAndHistory();
                      }}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono transition cursor-pointer"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CyberCard>
      )}

      {/* ============================================================== */}
      {/* TAB 4: QR PAYMENT HISTORY */}
      {/* ============================================================== */}
      {activeQrTab === 'history' && (
        <CyberCard glow cornerAccents className="p-6 bg-[#0D1828]/90">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-blue-900/40">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#00D9FF]" />
              <h3 className="font-bold text-sm text-[#F8FAFC] uppercase tracking-wider font-mono">
                QR Point-of-Sale Audit Ledger
              </h3>
            </div>

            {/* Filters & Search */}
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search payee or ID..."
                  className="w-full bg-[#07111F] border border-blue-900/60 rounded-xl pl-8 pr-3 py-1.5 text-xs font-mono text-[#F8FAFC] placeholder-slate-500 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <select
                value={historyFilter}
                onChange={(e) => setHistoryFilter(e.target.value)}
                className="bg-[#07111F] border border-blue-900/60 rounded-xl px-2.5 py-1.5 text-xs font-mono text-[#CBD5E1] focus:outline-none focus:border-[#00D9FF]"
              >
                <option value="ALL">All Status</option>
                <option value="APPROVED">Approved</option>
                <option value="BLOCKED">Blocked</option>
                <option value="FLAGGED">Flagged</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="py-16 text-center text-[#64748B] font-mono text-xs">
              No QR transactions matching filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-blue-900/40 text-[10px] text-[#94A3B8] uppercase">
                    <th className="py-2.5 px-3">Transaction / ID</th>
                    <th className="py-2.5 px-3">Payee & Account</th>
                    <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Risk Assessment</th>
                    <th className="py-2.5 px-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-950/60">
                  {filteredHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-blue-950/20 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#F8FAFC]">{item.id}</div>
                        <div className="text-[10px] text-slate-500">{item.requestId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-[#CBD5E1]">{item.recipientName}</div>
                        <div className="text-[10px] text-[#00D9FF]">{item.recipientAccount}</div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-sm text-[#00D9FF]">
                        {formatINR(item.amount)}
                      </td>
                      <td className="py-3 px-3">
                        {item.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                            APPROVED
                          </span>
                        )}
                        {item.status === 'BLOCKED' && (
                          <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 border border-red-500/50 text-[10px] font-bold animate-pulse">
                            BLOCKED
                          </span>
                        )}
                        {item.status === 'FLAGGED' && (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/40 text-[10px] font-bold">
                            FLAGGED
                          </span>
                        )}
                        {item.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold">
                            REJECTED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          item.riskLevel === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                          item.riskLevel === 'HIGH' ? 'bg-rose-500/15 text-rose-400 border-rose-500/30' :
                          item.riskLevel === 'MEDIUM' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
                          'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          {item.riskLevel} [{item.riskScore}]
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        {item.createdAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CyberCard>
      )}

      {/* ============================================================== */}
      {/* STEP 1 MODAL: PAYMENT APPROVAL REQUIRED (Explicit Confirmation) */}
      {/* ============================================================== */}
      {approvalModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B14]/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg bg-[#0D1828] border-2 border-[#1677FF] rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(22,119,255,0.4)] relative overflow-hidden font-sans">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#1677FF]/15 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-[#00D9FF] flex items-center justify-center border border-cyan-400/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-wider text-[#F8FAFC] font-mono">
                  Payment Approval Required
                </h3>
                <p className="text-xs text-[#94A3B8]">
                  Confirm authorization parameters before dispatching handset verification token.
                </p>
              </div>
            </div>

            {/* ACTUAL DETAILS DISPLAY (Matching Prompt Requirements) */}
            <div className="space-y-3 p-4 rounded-2xl bg-[#07111F] border border-blue-900/60 font-mono text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-blue-950">
                <span className="text-[#94A3B8]">Recipient:</span>
                <strong className="text-[#F8FAFC] text-sm">{approvalModalData.recipientName}</strong>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-blue-950">
                <span className="text-[#94A3B8]">Recipient Account:</span>
                <span className="text-[#00D9FF]">{approvalModalData.recipientAccount}</span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-blue-950">
                <span className="text-[#94A3B8]">Amount:</span>
                <strong className="text-lg font-black text-[#00D9FF]">
                  {formatINR(approvalModalData.amount)}
                </strong>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-blue-950">
                <span className="text-[#94A3B8]">Payment Request ID:</span>
                <span className="text-slate-300">{approvalModalData.requestId}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-[#94A3B8]">Registered Handset:</span>
                <span className="text-emerald-400 font-bold">{maskedMobileDisplay}</span>
              </div>
            </div>

            <div className="my-5 text-center font-mono text-sm font-bold text-[#F8FAFC]">
              "Do you want to approve this payment?"
            </div>

            {approvalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-mono">
                {approvalError}
              </div>
            )}

            {/* BUTTONS: YES, APPROVE & NO, REJECT */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRejectPayment}
                disabled={approvalSubmitting}
                className="py-3 px-4 rounded-xl bg-[#07111F] hover:bg-rose-500/20 text-[#CBD5E1] hover:text-rose-300 border border-blue-900/60 hover:border-rose-500/40 text-xs font-mono font-bold uppercase transition cursor-pointer"
              >
                NO, REJECT
              </button>

              <CyberButton
                variant="primary"
                onClick={handleInitiateMobileApproval}
                disabled={approvalSubmitting}
                className="py-3 px-4 text-xs font-mono font-bold uppercase tracking-wider"
              >
                {approvalSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching SMS...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>YES, APPROVE</span>
                  </>
                )}
              </CyberButton>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* STEP 2 MODAL: REGISTERED MOBILE DEVICE SIMULATOR HUD */}
      {/* ============================================================== */}
      {mobileSimulatorActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050B14]/85 backdrop-blur-md animate-fadeIn">
          {/* Simulated Smartphone Enclave Shell */}
          <div className="w-full max-w-sm bg-[#050B14] border-4 border-slate-700 rounded-[40px] p-4 shadow-[0_0_60px_rgba(0,217,255,0.3)] relative overflow-hidden font-sans">
            {/* Phone Speaker Notch & Front Sensor */}
            <div className="w-32 h-4 bg-slate-800 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
            </div>

            {/* Phone Screen Canvas */}
            <div className="bg-[#07111F] border border-blue-900/60 rounded-[28px] p-4 text-[#F8FAFC] space-y-4 shadow-inner relative">
              {/* Phone Status Bar */}
              <div className="flex items-center justify-between text-[10px] font-mono text-[#94A3B8] border-b border-blue-950 pb-2">
                <span>9:41 AM</span>
                <span className="text-[#00D9FF] font-bold">AIRTEL 5G // SECURE</span>
                <span>100% ⚡</span>
              </div>

              {/* SIMULATED INCOMING PUSH / SMS NOTIFICATION BANNER */}
              {smsNotificationVisible && (
                <div className="p-3 rounded-2xl bg-[#0D1828] border-2 border-cyan-400 shadow-[0_0_20px_rgba(0,217,255,0.3)] animate-bounce font-mono text-xs space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#00D9FF]">
                    <span className="font-bold flex items-center gap-1">
                      <Smartphone className="w-3 h-3" />
                      FRAUDGUARD BANK SMS
                    </span>
                    <span>JUST NOW</span>
                  </div>
                  <div className="text-[11px] text-[#CBD5E1] leading-tight">
                    Do not share OTP. Use authorization code <strong className="text-cyan-300 text-sm">{activeDemoOtpCode}</strong> to approve POS debit.
                  </div>
                </div>
              )}

              {/* Device Verification Interface */}
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 text-[#00D9FF] mx-auto flex items-center justify-center border border-cyan-400/40">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <h4 className="text-sm font-bold text-[#F8FAFC]">Registered Device Enclave</h4>
                <div className="text-[11px] font-mono text-emerald-400">
                  Device: {activeMaskedMobile}
                </div>
              </div>

              {/* OTP Input Form */}
              <div className="space-y-3 font-mono">
                <div>
                  <label className="block text-[10px] uppercase text-[#94A3B8] mb-1">
                    Enter 6-Digit SMS Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={inputOtpCode}
                    onChange={(e) => setInputOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.4em] text-xl font-bold bg-[#050B14] border-2 border-[#1677FF] rounded-xl py-2.5 text-[#00D9FF] focus:outline-none focus:border-cyan-300"
                  />
                </div>

                <div className="text-[10px] text-slate-500 text-center">
                  Hardware Token: <strong>FIDO2 // RSA-4096-ATTESTED</strong>
                </div>

                {approvalError && (
                  <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-[10px] text-center">
                    {approvalError}
                  </div>
                )}

                {/* Handset Actions */}
                <div className="space-y-2 pt-2">
                  <CyberButton
                    variant="primary"
                    onClick={() => handleFinalDeviceAuthorization('APPROVE')}
                    disabled={approvalSubmitting || inputOtpCode.length < 6}
                    className="w-full py-2.5 text-xs font-bold uppercase tracking-wider"
                  >
                    {approvalSubmitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Evaluating Risk Engine...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        <span>Authorize on Device</span>
                      </>
                    )}
                  </CyberButton>

                  <button
                    onClick={() => handleFinalDeviceAuthorization('REJECT')}
                    disabled={approvalSubmitting}
                    className="w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-mono transition cursor-pointer"
                  >
                    Deny & Reject Authorization
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Home Indicator Bar */}
            <div className="w-32 h-1 bg-slate-700 rounded-full mx-auto mt-3" />
          </div>
        </div>
      )}
    </div>
  );
};
