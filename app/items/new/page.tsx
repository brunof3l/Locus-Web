"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Quagga from "@ericblade/quagga2";
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { LocusItem } from "@/types";
import { onAuthStateChanged, type User } from "firebase/auth";

export default function NewItemPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [assetCode, setAssetCode] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [description, setDescription] = useState("");
  const [calibrationDate, setCalibrationDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const quaggaInitializedRef = useRef(false);
  const manualCodeRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push("/");
      } else {
        setUser(currentUser);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    return () => {
      try {
        Quagga.stop();
      } catch {
      }
    };
  }, []);

  const playBeep = () => {
    if (typeof window === "undefined") return;
    const w = window as typeof window & {
      webkitAudioContext?: typeof AudioContext;
    };
    const AudioContextRef = w.AudioContext || w.webkitAudioContext;
    if (!AudioContextRef) return;
    const audioCtx = new AudioContextRef();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    oscillator.frequency.value = 880;
    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.15);
  };

  const handleScanSuccess = (decodedText: string) => {
    playBeep();
    setAssetCode(decodedText);
    setScannerError(null);
  };
  const handleStartScanner = () => {
    setScannerError(null);
    setIsScanning(true);

    const target = document.getElementById("quagga-scanner") as HTMLElement | null;
    if (!target) {
      setScannerError("Não foi possível iniciar a câmera. Tente novamente.");
      setIsScanning(false);
      return;
    }

    const onDetected = (result: unknown) => {
      const codeResult = (result as { codeResult?: { code?: string; decodedCodes?: Array<{ error?: number }> } }).codeResult;
      const code = codeResult?.code as string | undefined;
      const decodedCodes = codeResult?.decodedCodes as Array<{ error?: number }> | undefined;

      if (!code) {
        return;
      }

      if (decodedCodes && decodedCodes.length > 0) {
        const errors = decodedCodes
          .map((x) => typeof x.error === "number" ? x.error : 1)
          .filter((x) => x >= 0);
        const avgError = errors.reduce((sum, val) => sum + val, 0) / errors.length;
        if (avgError > 0.1) {
          return;
        }
      }

      Quagga.offDetected(onDetected);
      try {
        Quagga.stop();
      } catch {
      }
      setIsScanning(false);
      handleScanSuccess(code);
    };

    const onProcessed = (result: unknown) => {
      const r = result as { box?: [number, number][] } | undefined;
      const drawingCtx = Quagga.canvas?.ctx?.overlay;
      const drawingCanvas = Quagga.canvas?.dom?.overlay;
      if (!drawingCtx || !drawingCanvas) return;

      drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

      if (r && r.box) {
        drawingCtx.strokeStyle = "#00FF00";
        drawingCtx.lineWidth = 2;
        drawingCtx.beginPath();
        r.box.forEach((point: [number, number], index: number) => {
          if (index === 0) {
            drawingCtx.moveTo(point[0], point[1]);
          } else {
            drawingCtx.lineTo(point[0], point[1]);
          }
        });
        drawingCtx.closePath();
        drawingCtx.stroke();
      }
    };

    if (!quaggaInitializedRef.current) {
      Quagga.init(
        {
          inputStream: {
            type: "LiveStream",
            constraints: {
              facingMode: "environment",
              width: 1280,
              height: 720,
            },
            target,
          },
          locator: {
            patchSize: "medium",
            halfSample: false,
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "code_39_reader"],
        },
        locate: true,
        },
        (err) => {
          if (err) {
            setScannerError("Não foi possível iniciar a câmera. Verifique as permissões.");
            setIsScanning(false);
            return;
          }

          quaggaInitializedRef.current = true;
          Quagga.onProcessed(onProcessed);
          Quagga.onDetected(onDetected);
          Quagga.start();
        }
      );
    } else {
      Quagga.start();
    }
  };

  const handleStopScanner = () => {
    try {
      Quagga.stop();
    } catch {
    }
    setIsScanning(false);
  };

  const handleManualCodeConfirm = () => {
    const input = manualCodeRef.current;
    if (input && input.value.trim()) {
      setAssetCode(input.value.trim());
      setScannerError(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetCode || !brand || !description || !user) {
      setError("Preencha todos os campos obrigatórios.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      let calibrationDueDate: number | null = null;
      if (calibrationDate) {
        const [y, m, d] = calibrationDate.split("-").map(Number);
        const dateObj = new Date(y, m - 1, d);
        calibrationDueDate = dateObj.getTime();
      }

      const newItem: Omit<LocusItem, "id"> = {
        assetCode,
        brand,
        description,
        createdBy: user.uid,
        createdAt: Date.now(),
        calibrationDueDate,
      };

      await addDoc(collection(db, "items"), newItem);
      router.push("/items");
    } catch {
      setError("Erro ao salvar o item. Tente novamente.");
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-xl mx-auto px-4 pt-4 pb-24">
      <h1 className="text-2xl font-bold mb-4 text-slate-800">Novo Cadastro de Item</h1>

      {!assetCode && (
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200 text-center">
          {!isScanning && (
            <div className="py-6">
              <div className="mb-4 text-slate-500">
                Clique em INICIAR LEITURA para usar a câmera ou digite o código.
              </div>
              <button
                type="button"
                onClick={() => {
                  setTimeout(() => {
                    void handleStartScanner();
                  }, 0);
                }}
                className="inline-flex items-center justify-center px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors min-h-[48px] w-full max-w-xs mb-4"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7h4m10 0h4M5 7V5a2 2 0 012-2h10a2 2 0 012 2v2m0 0v10a2 2 0 01-2 2H7a2 2 0 01-2-2V7m5 4h4"
                  />
                </svg>
                INICIAR LEITURA
              </button>

              <div className="mt-4 text-left">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código do Ativo (Manual)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    ref={manualCodeRef}
                    className="flex-1 bg-white border border-slate-300 text-slate-900 text-sm rounded-lg p-2.5 min-h-[48px]"
                    placeholder="Digite o código..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleManualCodeConfirm();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleManualCodeConfirm}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg min-h-[48px]"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={isScanning ? "space-y-4" : "hidden"}>
            <div className="relative w-full rounded-xl overflow-hidden border border-slate-200 bg-black">
              <div
                id="quagga-scanner"
                className="w-full h-[260px]"
              />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-11/12 h-0.5 bg-red-500/80" />
              </div>
            </div>

            {scannerError && (
              <div className="text-sm text-red-600">
                {scannerError}
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                handleStopScanner();
              }}
              className="w-full min-h-[48px] px-4 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {assetCode && (
        <form
          onSubmit={handleSave}
          className="bg-white p-4 md:p-6 rounded-lg shadow-sm border border-slate-200 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código do Ativo
            </label>
            <div className="flex items-center">
              <input
                type="text"
                value={assetCode}
                readOnly
                className="flex-1 bg-slate-100 border border-slate-300 text-slate-500 text-sm rounded-lg p-2.5 min-h-[48px] cursor-not-allowed focus:ring-0 focus:border-slate-300"
              />
              <button
                type="button"
                onClick={() => {
                  if (confirm("Deseja escanear outro código? Os dados atuais serão perdidos.")) {
                    setAssetCode(null);
                    setBrand("");
                    setDescription("");
                    setCalibrationDate("");
                    setIsScanning(false);
                  }
                }}
                className="ml-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Alterar
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Este código foi lido do scanner ou digitado manualmente e não pode ser editado aqui.
            </p>
          </div>

          <div>
            <label
              htmlFor="brand"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Marca / Modelo
            </label>
            <input
              type="text"
              id="brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
              placeholder="Ex: Dell Inspiron, Makita..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-h-[48px]"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Descrição
            </label>
            <input
              type="text"
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              placeholder="Ex: Notebook do Financeiro, Furadeira de Impacto..."
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-h-[48px]"
            />
          </div>

          <div>
            <label
              htmlFor="calibrationDate"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Próxima Calibração (Opcional)
            </label>
            <input
              type="date"
              id="calibrationDate"
              value={calibrationDate}
              onChange={(e) => setCalibrationDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 min-h-[48px]"
            />
            <p className="mt-1 text-xs text-slate-500">Deixe em branco se não aplicável.</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
            <button
              type="button"
              onClick={() => router.push("/items")}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 min-h-[48px]"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px]"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Salvando...
                </>
              ) : (
                "Salvar Item"
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
