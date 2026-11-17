"use client";

import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { Camera, UploadCloud, X, AlertCircle } from "lucide-react";

type Props = {
  onCapture: (file: File) => void;
  disabled?: boolean;
};

/**
 * Camera-first capture with accessible file picker and drag-and-drop fallback.
 * Preserves 100% existing functionality, media stream lifecycle, and HTML5 canvas snapshot generation.
 */
export function CameraCapture({ onCapture, disabled = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!cameraOpen) return;
    let active = true;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera capture is not supported by this browser.");
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (cause) {
        setMessage(
          cause instanceof Error
            ? `${cause.message} Use the file picker instead.`
            : "Camera permission was not granted. Use the file picker instead."
        );
        setCameraOpen(false);
      }
    }

    start();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraOpen]);

  function capturePhoto() {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMessage("The camera is still starting. Please try again in a moment.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      setMessage("Unable to capture a photo from this camera.");
      return;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("Unable to create the photo file. Please try again.");
          return;
        }
        onCapture(
          new File([blob], `waste-site-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
        );
        setMessage("Photo captured and ready to submit.");
        setCameraOpen(false);
      },
      "image/jpeg",
      0.9
    );
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    onCapture(file);
    setMessage("Photo selected and ready to submit.");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      onCapture(droppedFile);
      setMessage("Photo selected and ready to submit.");
    } else if (droppedFile) {
      setMessage("Please upload an image file (JPEG, PNG, or WEBP).");
    }
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  }

  function handleDragLeave() {
    setIsDragOver(false);
  }

  return (
    <div className="space-y-3">
      {!cameraOpen ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`relative rounded-2xl border-2 border-dashed transition-all p-6 text-center ${
            isDragOver
              ? "border-brand-600 bg-brand-50/50"
              : "border-slate-200 bg-slate-50/50 hover:border-brand-500/80 hover:bg-slate-50"
          }`}
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-600/20 shadow-2xs">
            <Camera className="w-6 h-6" />
          </div>

          <p className="text-sm font-bold text-slate-900">
            Upload Photographic Evidence
          </p>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            Take a live photo on-site or choose an existing image file from your device
          </p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2 text-xs py-2 px-3.5 shadow-sm"
              disabled={disabled}
              onClick={() => {
                setMessage("");
                setCameraOpen(true);
              }}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Open Camera</span>
            </button>

            <label
              htmlFor="photo-file"
              className={`btn-secondary inline-flex items-center gap-2 text-xs py-2 px-3.5 cursor-pointer shadow-sm ${
                disabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
              <span>Browse Photo</span>
            </label>

            {/* Hidden native input, fully accessible and preserved */}
            <input
              ref={fileInputRef}
              id="photo-file"
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              disabled={disabled}
              onChange={chooseFile}
            />
          </div>

          <p className="mt-3 text-[11px] font-medium text-slate-400">
            Supports JPEG, PNG, or WEBP (up to 10MB)
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-900 bg-slate-950 p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/90 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400 ring-1 ring-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Camera Feed
            </span>
            <span className="text-[11px] text-slate-400">Aim at waste pile</span>
          </div>

          <video
            ref={videoRef}
            className="max-h-80 w-full rounded-xl bg-black object-contain"
            autoPlay
            muted
            playsInline
          />

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2 text-xs"
              onClick={capturePhoto}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Capture Snapshot</span>
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1.5 text-xs"
              onClick={() => setCameraOpen(false)}
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-100 p-2.5 text-xs text-slate-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-slate-500" />
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
