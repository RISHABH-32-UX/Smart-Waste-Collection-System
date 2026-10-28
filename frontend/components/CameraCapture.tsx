"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, UploadCloud, X, Aperture, AlertCircle } from "lucide-react";

type Props = { onCapture: (file: File) => void; disabled?: boolean };

/** Camera-first capture with a normal file picker fallback for unsupported browsers. */
export function CameraCapture({ onCapture, disabled = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [message, setMessage] = useState("");

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
          stream.getTracks().forEach(track => track.stop());
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
      streamRef.current?.getTracks().forEach(track => track.stop());
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
      blob => {
        if (!blob) {
          setMessage("Unable to create the photo file. Please try again.");
          return;
        }
        onCapture(new File([blob], `waste-site-${Date.now()}.jpg`, { type: "image/jpeg" }));
        setMessage("Photo captured successfully and ready to submit.");
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
  }

  return (
    <div className="space-y-3">
      {!cameraOpen ? (
        <button
          type="button"
          className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
          disabled={disabled}
          onClick={() => {
            setMessage("");
            setCameraOpen(true);
          }}
        >
          <Camera className="h-4 w-4" />
          <span>Launch Live Camera</span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-lg">
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
              className="btn-primary inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              onClick={capturePhoto}
            >
              <Aperture className="h-4 w-4" />
              <span>Capture Photo</span>
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex items-center gap-1.5 bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
              onClick={() => setCameraOpen(false)}
            >
              <X className="h-4 w-4" />
              <span>Close Camera</span>
            </button>
          </div>
        </div>
      )}

      <div className="pt-1">
        <label className="field-label flex items-center gap-1.5" htmlFor="photo-file">
          <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
          <span>Or Choose Image From Device</span>
        </label>
        <input
          id="photo-file"
          className="field text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100 cursor-pointer"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          disabled={disabled}
          onChange={chooseFile}
        />
      </div>

      {message && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
          <AlertCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}